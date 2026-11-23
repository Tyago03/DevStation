import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Project, Result, RunConfig } from '../../src/shared/contracts';

function unwrap<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.error.message); return result.data; }
async function choose(app: ElectronApplication, file: string) {
  await app.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, file);
}
async function confirm(app: ElectronApplication, response: number) {
  await app.evaluate(({ dialog }, answer) => { dialog.showMessageBox = async () => ({ response: answer, checkboxChecked: false }); }, response);
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-polish-e2e-'));
  const folder = path.join(root, 'Atlas workspace'); await mkdir(folder);
  const projectPath = await realpath(folder);
  execFileSync('git', ['init', '-b', 'main', projectPath], { windowsHide: true });
  const python = execFileSync('where.exe', ['python.exe'], { encoding: 'utf8' }).split(/\r?\n/).find(line => line && !line.includes('WindowsApps'))!;
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
  const app = await electron.launch({ args: ['.', `--user-data-dir=${path.join(root, 'data')}`], env: environment });
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await confirm(app, 1); await choose(app, projectPath);
  await page.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Atlas workspace', exact: true })).toBeVisible();
  const project = unwrap(await page.evaluate(() => window.devstation.projects.list()))[0];
  return { root, projectPath, python, app, page, project };
}
async function configuration(app: ElectronApplication, page: Page, project: Project, executable: string, file: string, label: string): Promise<RunConfig> {
  await choose(app, executable);
  unwrap(await page.evaluate(() => window.devstation.configs.chooseExecutable()));
  await choose(app, file);
  const script = unwrap(await page.evaluate(id => window.devstation.configs.chooseScript(id, 'python'), project.id))!;
  return unwrap(await page.evaluate(input => window.devstation.configs.save(input), {
    projectId: project.id, label, executablePath: executable, workingDir: project.path,
    args: ['-u', script.path], recipe: { kind: 'python-script' as const, script },
  }));
}
async function cleanup(root: string, app: ElectronApplication) {
  await confirm(app, 1).catch(() => undefined);
  await app.close().catch(() => undefined);
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('DevStation-polish-e2e-')) throw new Error('Unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

test('changed scripts require a complete review, explicit authorization and a separate Start', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Electron uses Chromium.');
  const f = await fixture();
  try {
    const script = path.join(f.projectPath, 'greeting.py');
    await writeFile(script, 'print("Original greeting", flush=True)\n');
    const config = await configuration(f.app, f.page, f.project, f.python, script, 'Reviewable greeting');
    await f.page.reload();
    await f.page.getByRole('button', { name: /Atlas workspace/ }).first().click();
    await expect(f.page.getByRole('heading', { name: 'Reviewable greeting', exact: true })).toBeVisible();
    await writeFile(script, 'print("Reviewed greeting", flush=True)\n');
    await f.page.getByRole('button', { name: 'Start', exact: true }).click();
    const reviewButton = f.page.getByRole('button', { name: 'Review changes and authorize', exact: true });
    await expect(reviewButton).toBeVisible();
    const failed = unwrap(await f.page.evaluate(() => window.devstation.runs.list()));
    expect(failed).toHaveLength(1); expect(failed[0].pid).toBeUndefined();

    await reviewButton.click();
    await expect(f.page.getByRole('dialog', { name: 'Review script changes', exact: true })).toBeVisible();
    await expect(f.page.getByRole('region', { name: 'Current script version', exact: true })).toContainText('Reviewed greeting');
    await f.page.screenshot({ path: testInfo.outputPath('review-script-dialog.png') });
    await f.page.keyboard.press('Escape');
    await expect(f.page.locator('dialog')).toHaveCount(0);
    expect(unwrap(await f.page.evaluate(id => window.devstation.configs.list(id), f.project.id))[0]).toEqual(config);

    await reviewButton.click();
    await expect(f.page.getByRole('button', { name: 'Authorize this version', exact: true })).toBeEnabled();
    await confirm(f.app, 0);
    await f.page.getByRole('button', { name: 'Authorize this version', exact: true }).click();
    await expect(f.page.locator('dialog')).toHaveCount(0);
    expect(unwrap(await f.page.evaluate(id => window.devstation.configs.list(id), f.project.id))[0]).toEqual(config);
    expect(unwrap(await f.page.evaluate(() => window.devstation.runs.list()))).toHaveLength(1);
    await confirm(f.app, 1);
    // A canceled native confirmation consumes its token; opening review reads afresh.
    await reviewButton.click();
    await expect(f.page.getByRole('button', { name: 'Authorize this version', exact: true })).toBeEnabled();
    await f.page.getByRole('button', { name: 'Authorize this version', exact: true }).click();
    await expect(f.page.locator('dialog')).toHaveCount(0);
    const updated = unwrap(await f.page.evaluate(id => window.devstation.configs.list(id), f.project.id))[0];
    expect(updated.recipe).not.toEqual(config.recipe);
    expect(unwrap(await f.page.evaluate(() => window.devstation.runs.list()))).toHaveLength(1);

    await f.page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(f.page.getByRole('heading', { level: 1, name: 'Runs', exact: true })).toBeVisible();
    await expect(f.page.getByText('Completed successfully', { exact: true }).first()).toBeVisible();
    await expect(f.page.getByText('Reviewed greeting', { exact: true })).toBeVisible();
    const count = unwrap(await f.page.evaluate(() => window.devstation.runs.list())).length;

    await writeFile(script, 'print("Second review", flush=True)\n');
    const preview = unwrap(await f.page.evaluate(id => window.devstation.configs.reviewScript(id), config.id));
    await writeFile(script, 'print("Changed after preview", flush=True)\n');
    const rejected = await f.page.evaluate(({ id, token }) => window.devstation.configs.authorizeScript(id, token), { id: config.id, token: preview.token });
    expect(rejected).toMatchObject({ ok: false, error: { code: 'SCRIPT_CHANGED' } });
    expect(unwrap(await f.page.evaluate(id => window.devstation.configs.list(id), f.project.id))[0]).toEqual(updated);
    expect(unwrap(await f.page.evaluate(() => window.devstation.runs.list()))).toHaveLength(count);
  } finally { await cleanup(f.root, f.app); }
});

test('real exit evidence distinguishes completion, errors and user stops', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Electron uses Chromium.');
  const f = await fixture();
  try {
    for (const item of [
      { file: 'complete.py', label: 'Build completed', source: 'print("Build finished successfully", flush=True)\n', reason: 'completed', text: 'Completed successfully' },
      { file: 'error.py', label: 'Example failure', source: 'import sys\nprint("Example task reported an error", flush=True)\nsys.exit(7)\n', reason: 'error', text: 'Exited with error' },
      { file: 'serve.py', label: 'Stopped local task', source: 'import time\nprint("Waiting for an explicit stop", flush=True)\ntime.sleep(60)\n', reason: 'stopped-by-user', text: 'Stopped by user' },
    ]) {
      const file = path.join(f.projectPath, item.file); await writeFile(file, item.source);
      const config = await configuration(f.app, f.page, f.project, f.python, file, item.label);
      const run = unwrap(await f.page.evaluate(id => window.devstation.runs.start(id), config.id))!;
      if (item.reason === 'stopped-by-user') {
        await expect.poll(async () => unwrap(await f.page.evaluate(() => window.devstation.runs.list())).find(value => value.id === run.id)?.state).toBe('running');
        await confirm(f.app, 0);
        expect(unwrap(await f.page.evaluate(id => window.devstation.runs.stop(id), run.id))).toBeNull();
        expect(unwrap(await f.page.evaluate(() => window.devstation.runs.list())).find(value => value.id === run.id)?.state).toBe('running');
        await confirm(f.app, 1);
        unwrap(await f.page.evaluate(id => window.devstation.runs.stop(id), run.id));
      }
      await expect.poll(async () => unwrap(await f.page.evaluate(() => window.devstation.runs.list())).find(value => value.id === run.id)).toMatchObject({ state: 'exited', exitReason: item.reason });
    }
    await f.page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Runs', exact: true }).click();
    for (const text of ['Completed successfully', 'Exited with error', 'Stopped by user']) await expect(f.page.getByText(text, { exact: true }).first()).toBeVisible();
    await expect(f.page.getByText('Exited (unknown)', { exact: true })).toHaveCount(0);
    await f.page.screenshot({ path: testInfo.outputPath('v0.2.1-runs.png') });
  } finally { await cleanup(f.root, f.app); }
});
