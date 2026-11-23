import { test, expect, chromium, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Result } from '../../src/shared/contracts';
import { listPackage } from '@electron/asar';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

async function unusedLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a localhost debug port.');
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function isolatedEnvironment(): NodeJS.ProcessEnv {
  const allowed = new Set(['systemroot', 'windir', 'temp', 'tmp', 'userprofile', 'appdata', 'localappdata', 'programdata']);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => allowed.has(key.toLowerCase()) && value !== undefined));
  const windows = process.env.SystemRoot ?? 'C:\\Windows';
  // The packaged application must boot using Electron's embedded runtime, without
  // inheriting Node, npm, Git, Python, NODE_OPTIONS or ELECTRON_RUN_AS_NODE.
  return { ...env, PATH: `${path.join(windows, 'System32')};${windows}` };
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise(resolve => {
    const timer = setTimeout(() => { child.removeListener('exit', exited); resolve(false); }, timeoutMs);
    const exited = () => { clearTimeout(timer); resolve(true); };
    child.once('exit', exited);
  });
}

interface PackagedSession { child: ChildProcess; browser?: Browser; page?: Page; output: () => string }

async function closeSession(session: PackagedSession | undefined): Promise<void> {
  if (!session) return;
  if (!session.child.pid) return;
  await session.page?.close().catch(() => undefined);
  if (!await waitForExit(session.child, 5000)) {
    // This handle was created by this test. Never terminate a supplied/arbitrary PID.
    session.child.kill();
    if (!await waitForExit(session.child, 5000)) throw new Error('The owned packaged-app process did not terminate.');
  }
  await session.browser?.close().catch(() => undefined);
}

async function launchPackaged(executable: string, data: string): Promise<PackagedSession> {
  const port = await unusedLoopbackPort();
  const child = spawn(executable, [`--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${data}`], {
    cwd: path.dirname(executable), shell: false, windowsHide: true, env: isolatedEnvironment(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const append = (value: Buffer) => { output = (output + value.toString('utf8')).slice(-8192); };
  child.stdout.on('data', append); child.stderr.on('data', append);
  let spawnError: Error | undefined;
  child.on('error', error => { spawnError = error; });
  const session: PackagedSession = { child, output: () => output };
  try {
    const endpoint = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 30000;
    let debuggerReady = false;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Packaged app exited before its window opened (code ${child.exitCode}).`);
      try {
        const response = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { debuggerReady = true; break; }
      } catch { /* Chromium may still be starting. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!debuggerReady) throw new Error('Packaged app did not expose its localhost Chromium debugger within 30 seconds.');
    session.browser = await chromium.connectOverCDP(endpoint);
    const context = session.browser.contexts()[0];
    if (!context) throw new Error('Packaged Chromium did not create a browser context.');
    session.page = context.pages()[0] ?? await context.waitForEvent('page', { timeout: 15000 });
    await session.page.waitForURL('devstation://app/index.html', { timeout: 15000 });
    await session.page.waitForFunction(() => typeof window.devstation?.app?.info === 'function');
    return session;
  } catch (error) {
    await closeSession(session).catch(() => undefined);
    throw new Error(`${error instanceof Error ? error.message : 'Packaged app launch failed.'}\nBounded process output:\n${output}`, { cause: error });
  }
}

async function removeOwnedFixture(root: string) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('DevStation-packaged-e2e-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

test('hardened Windows package boots without external Node and persists SQLite preferences', async ({ browserName }, testInfo) => {
  test.skip(process.platform !== 'win32', 'The v0.2 preview targets Windows x64.');
  test.skip(browserName !== 'chromium', 'Electron uses the Chromium debugging protocol.');
  const executable = path.resolve('out/DevStation-win32-x64/DevStation.exe');
  await access(executable).catch(() => { throw new Error('Build the genuine Windows package with npm run make before running this test.'); });
  const packagedFiles = listPackage(path.join(path.dirname(executable), 'resources', 'app.asar'), { isPack: false });
  expect(packagedFiles.filter(file => /(?:^|[\\/])(?:\.vitest-cache|\.cache)(?:[\\/]|$)|^[\\/](?:tests|test-results)(?:[\\/]|$)|better-sqlite3[\\/]build[\\/].*\.(?:gypi|vcxproj|filters|recipe|tlog|lastbuildstate)$/.test(file))).toEqual([]);
  const archiveBytes = await readFile(path.join(path.dirname(executable), 'resources', 'app.asar'));
  for (const machinePath of [os.homedir(), process.cwd()]) {
    for (const spelling of [machinePath, machinePath.replaceAll('\\', '/'), machinePath.replaceAll('\\', '\\\\')]) {
      expect(archiveBytes.includes(Buffer.from(spelling)), 'No local build path in the distributable').toBe(false);
      expect(archiveBytes.includes(Buffer.from(spelling, 'utf16le')), 'No UTF-16 local build metadata in the distributable').toBe(false);
    }
  }
  expect(await readFile(path.join(path.dirname(executable), 'resources', 'LICENSE'), 'utf8')).toBe(await readFile('LICENSE', 'utf8'));
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-packaged-e2e-'));
  const data = path.join(root, 'user-data');
  let session: PackagedSession | undefined;
  try {
    session = await launchPackaged(executable, data);
    const page = session.page!;
    await expect(page.getByRole('heading', { name: 'Everything in its place.', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bring your projects into focus.', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add your first project', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => ({
      require: typeof (window as unknown as { require?: unknown }).require,
      process: typeof (window as unknown as { process?: unknown }).process,
    }))).toEqual({ require: 'undefined', process: 'undefined' });
    expect(unwrap(await page.evaluate(() => window.devstation.app.info()))).toMatchObject({ version: '0.2.1', platform: 'win32' });
    expect(unwrap(await page.evaluate(() => window.devstation.projects.list()))).toEqual([]);
    expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toEqual([]);
    const diagnostics = unwrap(await page.evaluate(() => window.devstation.diagnostics.check()));
    expect(diagnostics.find(tool => tool.name === 'Node.js')?.status).toBe('not-found');
    expect(diagnostics.find(tool => tool.name === 'Git')?.status).toBe('not-found');
    expect(unwrap(await page.evaluate(() => window.devstation.settings.get()))).toEqual({ theme: 'dark' });
    await page.screenshot({ path: testInfo.outputPath('packaged-welcome.png') });
    await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(unwrap(await page.evaluate(() => window.devstation.settings.get()))).toEqual({ theme: 'light' });
    expect((await stat(path.join(data, 'devstation.sqlite'))).size).toBeGreaterThan(0);
    await closeSession(session); session = undefined;

    session = await launchPackaged(executable, data);
    const reopened = session.page!;
    await expect(reopened.getByRole('heading', { name: 'Everything in its place.', exact: true })).toBeVisible();
    expect(unwrap(await reopened.evaluate(() => window.devstation.settings.get()))).toEqual({ theme: 'light' });
    expect(unwrap(await reopened.evaluate(() => window.devstation.projects.list()))).toEqual([]);
    expect(unwrap(await reopened.evaluate(() => window.devstation.runs.list()))).toEqual([]);
    await reopened.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(reopened.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await reopened.screenshot({ path: testInfo.outputPath('packaged-persisted-theme.png') });
  } catch (error) {
    if (session) await testInfo.attach('packaged-process-output', { body: session.output(), contentType: 'text/plain' });
    throw error;
  } finally {
    await closeSession(session);
    // Recursively remove only the exact directory allocated by this test.
    await removeOwnedFixture(root);
  }
});
