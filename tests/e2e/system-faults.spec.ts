import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import os from 'node:os';

async function removeOwned(root: string) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('DevStation-faults-e2e-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

test('T21/T39/T40: real stalled Git and failed netstat keep the desktop usable and recover on retry', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Electron uses Chromium.');
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-faults-e2e-'));
  let desktop: ElectronApplication | undefined;
  const listener = createServer(socket => socket.destroy());
  try {
    const folder = path.join(root, 'Atlas faults'); await mkdir(folder); const repository = await realpath(folder);
    execFileSync('git', ['init', '-b', 'main', repository], { windowsHide: true });
    const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
    desktop = await electron.launch({ args: ['.', `--user-data-dir=${path.join(root, 'data')}`], env });
    const page = await desktop.firstWindow();
    await desktop.evaluate(({ dialog }, selected) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] }); }, repository);
    await page.getByRole('button', { name: 'Add project', exact: true }).click();
    await expect(page.getByText('This repository has no commits yet.', { exact: true })).toBeVisible();
    // Test-only process fault injection at Node's spawn boundary. The real Git
    // process waits for stdin until the unmodified production timeout kills it.
    // No production test hooks or user/global Git settings are introduced.
    await desktop.evaluate(() => {
      const childProcess = process.getBuiltinModule('node:child_process') as typeof import('node:child_process');
      const original = childProcess.spawn;
      const state = { git: true, netstat: true, gitPid: 0, gitClosed: false, netstatCode: null as number | null };
      const target = globalThis as typeof globalThis & { devstationFaults?: typeof state; restoreDevstationSpawn?: () => void };
      target.devstationFaults = state;
      childProcess.spawn = ((file: string, args: string[], options: import('node:child_process').SpawnOptions) => {
        if (state.git && /(?:^|[\\/])git\.exe$/i.test(file) && args.includes('status')) {
          state.git = false;
          const child = original(file, ['hash-object', '--stdin'], { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
          child.once('spawn', () => { state.gitPid = child.pid ?? 0; });
          child.once('close', () => { state.gitClosed = true; });
          return child;
        }
        if (state.netstat && /(?:^|[\\/])netstat\.exe$/i.test(file)) {
          state.netstat = false;
          const child = original(file, ['--devstation-invalid-option'], options);
          child.once('close', code => { state.netstatCode = code; });
          return child;
        }
        return original(file, args, options);
      }) as typeof childProcess.spawn;
      target.restoreDevstationSpawn = () => { childProcess.spawn = original; };
    });
    const started = Date.now();
    await page.locator('.git-panel').getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.git-panel').getByRole('button', { name: 'Checking…', exact: true })).toBeDisabled();
    await expect.poll(() => desktop!.evaluate(() => (globalThis as typeof globalThis & { devstationFaults: { gitPid: number } }).devstationFaults.gitPid)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Search offline help' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Search offline help' }).fill('timeout');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('button', { name: 'Open Atlas faults', exact: true }).click();
    await expect(page.locator('.git-panel').getByRole('alert')).toContainText('This check took too long. Try again.');
    const duration = Date.now() - started; expect(duration).toBeGreaterThanOrEqual(9000); expect(duration).toBeLessThan(25000);
    expect(await desktop.evaluate(() => (globalThis as typeof globalThis & { devstationFaults: { gitClosed: boolean } }).devstationFaults.gitClosed)).toBe(true);
    await expect(page.locator('.git-panel').getByText('Clean', { exact: true })).toHaveCount(0);
    await page.locator('.git-panel').getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByText('This repository has no commits yet.', { exact: true })).toBeVisible();
    await expect(page.locator('.git-panel').getByRole('alert')).toHaveCount(0);

    await new Promise<void>((resolve, reject) => { listener.once('error', reject); listener.listen(0, '0.0.0.0', resolve); });
    const address = listener.address(); if (!address || typeof address === 'string') throw new Error('Missing owned listener.');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Ports', exact: true }).click();
    await page.getByRole('button', { name: 'Inspect listening ports', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ports could not be checked.' })).toBeVisible();
    await expect(page.getByText('No TCP listening ports found.', { exact: true })).toHaveCount(0);
    const code = await desktop.evaluate(() => (globalThis as typeof globalThis & { devstationFaults: { netstatCode: number | null } }).devstationFaults.netstatCode);
    expect(code).not.toBeNull(); expect(code).not.toBe(0);
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search ports' }).fill(String(address.port));
    const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: String(address.port), exact: true }) });
    await expect(row.getByRole('cell', { name: '0.0.0.0', exact: true })).toBeVisible();
    await expect(row.getByText('All interfaces', { exact: true })).toBeVisible();
    await expect(page.getByText(/All interfaces does not necessarily mean reachable from the internet/)).toBeVisible();
    await testInfo.attach('fault-observations', { body: JSON.stringify({ gitTimeoutMs: duration, git: 'real Git hash-object held at stdin; production 10-second timeout', netstatExitCode: code, listener: '0.0.0.0 on test-owned ephemeral port' }), contentType: 'application/json' });
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
    if (desktop) {
      await desktop.evaluate(() => (globalThis as typeof globalThis & { restoreDevstationSpawn?: () => void }).restoreDevstationSpawn?.()).catch(() => undefined);
      await desktop.close().catch(() => undefined);
    }
    await removeOwned(root);
  }
});
