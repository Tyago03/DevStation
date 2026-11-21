import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Project, RunConfig, Result } from '../../src/shared/contracts';

function unwrap<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.error.message); return result.data; }
test('real desktop workflows, persistence and renderer isolation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-e2e-'));
  const data = path.join(root, 'user-data');
  const repository = path.join(root, 'Atlas API');
  await mkdir(repository);
  const git = (args: string[]) => execFileSync('git', ['-C', repository, ...args], { windowsHide: true, encoding: 'utf8' });
  git(['init', '-b', 'main']); git(['config', 'user.name', 'Demo Developer']); git(['config', 'user.email', 'demo@example.invalid']);
  await writeFile(path.join(repository, 'README.md'), '# Atlas API\nSynthetic demonstration project.\n');
  git(['add', 'README.md']); git(['commit', '-m', 'Create the local development service']);
  await writeFile(path.join(repository, 'server.py'), 'import http.server\nprint("Atlas API ready on 127.0.0.1", flush=True)\nhttp.server.HTTPServer(("127.0.0.1", 0), http.server.SimpleHTTPRequestHandler).serve_forever()\n');
  const python = execFileSync('where.exe', ['python.exe'], { encoding: 'utf8' }).split(/\r?\n/).find(line => line && !line.includes('WindowsApps'))!;
  let desktop: ElectronApplication | undefined;
  const launch = async () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
    return electron.launch({ args: ['.', `--user-data-dir=${data}`], env });
  };
  try {
    desktop = await launch();
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => ({ node: typeof (window as unknown as { require?: unknown }).require, process: typeof (window as unknown as { process?: unknown }).process }))).toEqual({ node: 'undefined', process: 'undefined' });
    await desktop.evaluate(({ dialog }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    }, repository);
    await page.getByRole('button', { name: 'Add project', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Atlas API', exact: true })).toBeVisible();
    const projects = unwrap(await page.evaluate(() => window.devstation.projects.list()));
    const project: Project = projects[0];
    const overview = unwrap(await page.evaluate(id => window.devstation.projects.gitOverview(id), project.id));
    expect(overview.branch).toBe('main'); expect(overview.untracked).toBe(1);
    const duplicate = await page.evaluate(() => window.devstation.projects.chooseAndAdd());
    expect(duplicate.ok).toBe(false);
    await desktop.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, python);
    unwrap(await page.evaluate(() => window.devstation.configs.chooseExecutable()));
    const config: RunConfig = unwrap(await page.evaluate(input => window.devstation.configs.save(input), { projectId: project.id, label: 'Local API server', executablePath: python, args: ['-u', 'server.py'], workingDir: repository }));
    expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toHaveLength(0);
    const run = unwrap(await page.evaluate(id => window.devstation.runs.start(id), config.id))!;
    expect(run.state).toBe('running'); expect(run.pid).toBeGreaterThan(0);
    await page.getByRole('navigation').getByRole('button', { name: 'Runs' }).click();
    await expect(page.getByText('Atlas API ready on 127.0.0.1', { exact: false })).toBeVisible();
    await expect.poll(async () => unwrap(await page.evaluate(() => window.devstation.ports.list())).ports.some(port => port.pid === run.pid && port.address === '127.0.0.1')).toBe(true);
    const badStop = await page.evaluate(() => window.devstation.runs.stop('11111111-1111-4111-8111-111111111111'));
    expect(badStop.ok).toBe(false);
    const stopped = unwrap(await page.evaluate(id => window.devstation.runs.stop(id), run.id));
    expect(stopped?.state).toBe('exited'); expect(stopped?.warning).toContain('Child processes');
    await expect.poll(async () => unwrap(await page.evaluate(() => window.devstation.ports.list())).ports.some(port => port.pid === run.pid)).toBe(false);
    const fixtureReadme = await readFile(path.join(repository, 'README.md'), 'utf8');
    await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
    unwrap(await page.evaluate(() => window.devstation.settings.update({ theme: 'light' })));
    await desktop.close(); desktop = await launch();
    const reopened = await desktop.firstWindow();
    await expect(reopened.getByRole('heading', { level: 1 })).toBeVisible();
    expect(unwrap(await reopened.evaluate(() => window.devstation.projects.list()))[0].id).toBe(project.id);
    expect(unwrap(await reopened.evaluate(id => window.devstation.configs.list(id), project.id))[0].id).toBe(config.id);
    expect(unwrap(await reopened.evaluate(() => window.devstation.runs.list()))).toHaveLength(0);
    expect(unwrap(await reopened.evaluate(() => window.devstation.settings.get())).theme).toBe('light');
    await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); });
    unwrap(await reopened.evaluate(id => window.devstation.projects.remove(id), project.id));
    expect(unwrap(await reopened.evaluate(() => window.devstation.projects.list()))).toHaveLength(0);
    expect(await readFile(path.join(repository, 'README.md'), 'utf8')).toBe(fixtureReadme);
  } finally {
    if (desktop) {
      await desktop.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false }); }).catch(() => undefined);
      await desktop.close().catch(() => undefined);
    }
    // Only the exact mkdtemp-owned fixture directory may be removed.
    if (path.dirname(root) === os.tmpdir() && path.basename(root).startsWith('DevStation-e2e-')) await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
});
