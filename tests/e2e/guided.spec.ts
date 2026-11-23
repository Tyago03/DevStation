import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Result } from '../../src/shared/contracts';

function unwrap<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.error.message); return result.data; }
const environment = () => Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
async function choose(desktop: ElectronApplication, selected: string) {
  await desktop.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, selected);
}
async function cleanup(root: string, desktop?: ElectronApplication) {
  if (desktop) {
    await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); }).catch(() => undefined);
    await desktop.close().catch(() => undefined);
  }
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('DevStation-guided-e2e-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
async function reservePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port.');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}
async function openRecipe(page: Page, title: string, label: string) {
  await page.getByRole('button', { name: 'Add configuration', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: title, exact: false }).click();
  await page.getByRole('textbox', { name: 'Configuration name' }).fill(label);
}

test('guided Python, Node.js and loopback server run only after exact preview and confirmation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-guided-e2e-'));
  let desktop: ElectronApplication | undefined;
  try {
    const folder = path.join(root, 'Café 日本語'); await mkdir(folder); const projectPath = await realpath(folder);
    execFileSync('git', ['init', '-b', 'main', projectPath], { windowsHide: true });
    const python = execFileSync('where.exe', ['python.exe'], { encoding: 'utf8' }).split(/\r?\n/).find(line => line && !line.includes('WindowsApps'))!;
    const scripts = [
      { title: 'Python script', name: 'Python greeting', executable: python, file: 'hello world.py', source: 'import sys\nprint("PYTHON:" + sys.argv[1], flush=True)\n', output: 'PYTHON:' },
      { title: 'Node.js script', name: 'Node greeting', executable: process.execPath, file: 'hello world.mjs', source: 'console.log("NODE:" + process.argv[2]);\n', output: 'NODE:' },
    ];
    desktop = await electron.launch({ args: ['.', `--user-data-dir=${path.join(root, 'data')}`], env: environment() });
    const page = await desktop.firstWindow(); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); });
    await choose(desktop, projectPath);
    await page.getByRole('button', { name: 'Add project', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Café 日本語', exact: true })).toBeVisible();
    const project = unwrap(await page.evaluate(() => window.devstation.projects.list()))[0];
    const literal = 'two words & literal';
    for (const item of scripts) {
      const script = path.join(projectPath, item.file); await writeFile(script, item.source);
      await openRecipe(page, item.title, item.name);
      await choose(desktop, item.executable); await page.getByRole('button', { name: 'Choose program', exact: true }).click();
      await choose(desktop, script); await page.getByRole('button', { name: 'Choose script', exact: true }).click();
      await page.getByRole('button', { name: 'Add extra argument', exact: true }).click();
      await page.getByRole('textbox', { name: 'Extra argument 1', exact: true }).fill(literal);
      await page.getByRole('button', { name: 'Review setup', exact: true }).click();
      await expect(page.getByRole('dialog').locator('.execution-preview pre')).toContainText(JSON.stringify(script));
      await expect(page.getByRole('dialog').locator('.execution-preview pre')).toContainText(JSON.stringify(literal));
      const count = unwrap(await page.evaluate(() => window.devstation.runs.list())).length;
      await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
      await expect(page.locator('dialog')).toHaveCount(0);
      expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toHaveLength(count);
      const config = unwrap(await page.evaluate(id => window.devstation.configs.list(id), project.id)).find(config => config.label === item.name)!;
      expect(config.recipe?.kind).toBe(item.title === 'Python script' ? 'python-script' : 'node-script');
      await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false }); });
      expect(unwrap(await page.evaluate(id => window.devstation.runs.start(id), config.id))).toBeNull();
      expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toHaveLength(count);
      await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); });
      const run = unwrap(await page.evaluate(id => window.devstation.runs.start(id), config.id))!;
      await expect.poll(async () => unwrap(await page.evaluate(id => window.devstation.runs.logs(id), run.id)).lines.map(line => line.line).join('\n')).toContain(item.output + literal);
      await expect.poll(async () => unwrap(await page.evaluate(() => window.devstation.runs.list())).find(item => item.id === run.id)?.state).toBe('exited');
      await writeFile(script, item.source + '\n# changed\n');
      expect(await page.evaluate(id => window.devstation.runs.start(id), config.id)).toMatchObject({ ok: false, error: { code: 'SCRIPT_CHANGED' } });
      const history = unwrap(await page.evaluate(() => window.devstation.runs.list()));
      expect(history).toHaveLength(count + 2);
      expect(history[0].state).toBe('failed'); expect(history[0].pid).toBeUndefined();
    }
    const port = await reservePort();
    await openRecipe(page, 'Python local web server', 'Local files');
    await choose(desktop, python); await page.getByRole('button', { name: 'Choose program', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Local port' }).fill('80');
    await page.getByRole('button', { name: 'Review setup', exact: true }).click();
    await expect(page.getByText('Enter a whole-number port from 1024 to 65535.')).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Local port' }).fill(String(port));
    await page.getByRole('button', { name: 'Review setup', exact: true }).click();
    await expect(page.getByRole('dialog').locator('.execution-preview pre')).toContainText('127.0.0.1');
    await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    const server = unwrap(await page.evaluate(id => window.devstation.configs.list(id), project.id)).find(config => config.label === 'Local files')!;
    expect(server.args).toEqual(['-I', '-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1']);
    const run = unwrap(await page.evaluate(id => window.devstation.runs.start(id), server.id))!;
    await expect.poll(async () => unwrap(await page.evaluate(() => window.devstation.ports.list())).ports.filter(item => item.pid === run.pid).map(item => item.address)).toContain('127.0.0.1');
    expect(unwrap(await page.evaluate(() => window.devstation.ports.list())).ports.filter(item => item.pid === run.pid).every(item => item.address === '127.0.0.1')).toBe(true);
    expect(unwrap(await page.evaluate(id => window.devstation.runs.stop(id), run.id))?.state).toBe('exited');
  } finally { await cleanup(root, desktop); }
});

test('offline help, persistent optional tour, isolated demo and keyboard navigation at minimum size', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Electron uses Chromium.');
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-guided-e2e-'));
  let desktop: ElectronApplication | undefined;
  try {
    const launch = () => electron.launch({ args: ['.', `--user-data-dir=${root}`], env: environment() });
    desktop = await launch(); let page = await desktop.firstWindow();
    await expect(page.getByRole('button', { name: 'Start tour', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('v0.2-welcome.png') });
    await page.getByRole('button', { name: 'Start tour', exact: true }).click();
    const tour = page.getByRole('region', { name: 'Getting started tour' });
    await tour.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(tour.getByRole('heading', { name: 'Add a Git project' })).toBeVisible();
    await tour.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(tour.getByRole('heading', { name: 'What is DevStation?' })).toBeVisible();
    await tour.getByRole('button', { name: 'Skip tour', exact: true }).click();
    expect(unwrap(await page.evaluate(() => window.devstation.settings.get())).tour?.status).toBe('skipped');
    await desktop.close(); desktop = await launch(); page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start tour', exact: true })).toHaveCount(0);
    await page.context().setOffline(true);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('v0.2-help.png') });
    await page.getByRole('textbox', { name: 'Search offline help' }).fill('PID');
    await expect(page.getByRole('article')).toContainText('PID');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Restart getting started tour', exact: true }).click();
    for (let step = 0; step < 4; step++) await page.getByRole('region', { name: 'Getting started tour' }).getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('region', { name: 'Getting started tour' }).getByRole('button', { name: 'Finish tour', exact: true }).click();
    expect(unwrap(await page.evaluate(() => window.devstation.settings.get())).tour).toEqual({ status: 'completed', step: 4 });
    expect(unwrap(await page.evaluate(() => window.devstation.projects.list()))).toEqual([]);
    const stored = unwrap(await page.evaluate(() => window.devstation.settings.get()));
    await page.getByRole('button', { name: 'Explore an example workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A workspace you can try.' })).toBeVisible();
    await page.getByRole('button', { name: 'Preview example setup', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('v0.2-demo.png') });
    await page.getByRole('button', { name: 'Sample output', exact: true }).click();
    await page.getByRole('button', { name: 'Sample ports', exact: true }).click();
    await page.getByRole('button', { name: 'Offline help', exact: true }).click();
    await page.getByRole('button', { name: 'Exit example', exact: true }).click();
    expect(unwrap(await page.evaluate(() => window.devstation.settings.get()))).toEqual(stored);
    expect(unwrap(await page.evaluate(() => window.devstation.projects.list()))).toEqual([]);
    expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toEqual([]);

    // Actual native minimum window; Chromium zoom is recorded separately from Windows DPI.
    await desktop.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.setSize(...window.getMinimumSize() as [number, number]); });
    for (const zoom of [1, 1.25, 1.5]) {
      await desktop.evaluate(({ BrowserWindow }, factor) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(factor), zoom);
      for (const name of ['Overview', 'Projects', 'Runs', 'Ports', 'Diagnostics', 'Settings']) {
        const button = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true });
        // Locate by tab traversal, never click/focus the target. This checks reachable controls.
        let reached = false;
        for (let attempt = 0; attempt < 100; attempt++) { await page.keyboard.press('Tab'); if (await button.evaluate(element => element === document.activeElement)) { reached = true; break; } }
        expect(reached, `Tab reaches ${name} at ${zoom}`).toBe(true);
        await page.keyboard.press('Enter'); await expect(button).toHaveAttribute('aria-current', 'page');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        expect(dimensions.scroll, `No horizontal clipping on ${name} at ${zoom}`).toBeLessThanOrEqual(dimensions.width + 1);
      }
      await page.screenshot({ path: testInfo.outputPath(`minimum-zoom-${zoom}.png`) });
    }
    await testInfo.attach('display-test-scope', { body: 'Native minimum 1050x700; Chromium zoom 100%, 125%, 150%. This is not Windows display scaling. Chromium offline only; Windows adapter unchanged.', contentType: 'text/plain' });
  } finally { await cleanup(root, desktop); }
});
