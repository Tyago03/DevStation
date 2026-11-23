import { test, expect, _electron as electron, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { execFileSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ManagedRun, Project, Result, RunConfig } from '../../src/shared/contracts';

function unwrap<T>(result: Result<T>): T { if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`); return result.data; }
interface DialogRecord { title?: string; message: string; detail?: string; buttons?: string[]; defaultId?: number }
interface MainTestControl { response: number; dialogs: DialogRecord[]; blockedPids: number[]; attempts: number[]; originalKill?: ChildProcess['kill']; killLedgerPath?: string }
interface TaskStatus { pid: number; port: number; nonce: string; bytes: number; descendantPid?: number }
interface TaskFixture { statusPath: string; nonce: string; config: RunConfig; run: ManagedRun }
interface DetachedFixture { statusPath: string; nonce: string; pid: number }
async function recordObservation(name: string, observation: object) {
  const output = test.info().outputPath(`${name}.json`);
  await writeFile(output, JSON.stringify(observation, null, 2));
  await test.info().attach(name, { path: output, contentType: 'application/json' });
}

// Real subprocesses have a fixture-only nonce endpoint and a 75-second fail-safe.
// It lets this test clean up its own survivor after a crash without signaling a PID.
const taskSource = `
const http = require('node:http');
const fs = require('node:fs');
const [statusPath, nonce, mode, descendantStatusPath, descendantNonce] = process.argv.slice(2);
let bytes = 0;
// A closed parent pipe must not accidentally turn the ownership fixture into a crash.
for (const stream of [process.stdout, process.stderr]) stream.on('error', error => {
  if (error.code !== 'EPIPE') throw error;
});
// Only the T35 fixture creates a descendant. Production spawning stays unchanged.
// Detached + ignored pipes lets this child survive the managed parent's Windows job.
let descendantPid;
if (mode === 'detached-parent') {
  const child = require('node:child_process').spawn(process.execPath,
    [__filename, descendantStatusPath, descendantNonce, 'idle'],
    { detached: true, stdio: 'ignore', windowsHide: true });
  descendantPid = child.pid;
  child.unref();
}
const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/health' && request.method === 'GET') {
    response.end(JSON.stringify({ pid: process.pid, port: server.address().port, nonce, bytes, descendantPid }));
  } else if (request.url === '/stop/' + nonce && request.method === 'POST') {
    response.end(JSON.stringify({ nonce, stopped: true }));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 250).unref();
  } else { response.statusCode = 403; response.end('{}'); }
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(statusPath, JSON.stringify({ pid: process.pid, port: server.address().port, nonce, bytes, descendantPid }));
  process.stdout.write('Owned fixture ready\\n');
  if (mode === 'flood') {
    const block = ('fixture-output '.padEnd(1023, 'x') + '\\n').repeat(64);
    const timer = setInterval(() => {
      if (bytes >= 12 * 1024 * 1024) {
        clearInterval(timer); process.stdout.write('FLOOD_COMPLETE ' + bytes + '\\n'); return;
      }
      process.stdout.write(block); bytes += Buffer.byteLength(block);
    }, 25);
  }
});
setTimeout(() => process.exit(0), 75000).unref();
`;

class DesktopFixture {
  desktop?: ElectronApplication;
  processHandle?: ChildProcess;
  page!: Page;
  project!: Project;
  tasks: TaskFixture[] = [];
  descendants: DetachedFixture[] = [];
  private constructor(readonly root: string, readonly repository: string) {}
  static async create() {
    const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-lifecycle-'));
    const repositoryPath = path.join(root, 'Owned lifecycle fixtures');
    await mkdir(repositoryPath);
    const repository = await realpath(repositoryPath);
    execFileSync('git', ['init', '-b', 'main', repository], { windowsHide: true, stdio: 'pipe' });
    return new DesktopFixture(root, repository);
  }
  async launch() {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
    this.desktop = await electron.launch({ args: ['.', `--user-data-dir=${path.join(this.root, 'user-data')}`], env });
    this.processHandle = this.desktop.process();
    this.page = await this.desktop.firstWindow();
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    await this.desktop.evaluate(({ dialog }) => {
      const control: MainTestControl = { response: 1, dialogs: [], blockedPids: [], attempts: [] };
      (globalThis as typeof globalThis & { __lifecycleTest: MainTestControl }).__lifecycleTest = control;
      dialog.showMessageBox = async (...args: unknown[]) => {
        const options = args.at(-1) as DialogRecord;
        control.dialogs.push({ title: options.title, message: options.message, detail: options.detail, buttons: options.buttons, defaultId: options.defaultId });
        return { response: control.response, checkboxChecked: false };
      };
    });
  }
  async selectPath(selected: string) {
    await this.desktop!.evaluate(({ dialog }, value) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [value] }); }, selected);
  }
  async importProject() {
    await this.selectPath(this.repository);
    this.project = unwrap(await this.page.evaluate(() => window.devstation.projects.chooseAndAdd()))!;
    expect(this.project.path).toBe(this.repository);
    await this.selectPath(process.execPath);
    expect(unwrap(await this.page.evaluate(() => window.devstation.configs.chooseExecutable()))).toBe(process.execPath);
  }
  async startTask(label: string, mode: 'idle' | 'flood' | 'detached-parent' = 'idle', descendant?: Pick<DetachedFixture, 'statusPath' | 'nonce'>) {
    const nonce = randomUUID();
    const script = path.join(this.repository, `owned-${nonce}.cjs`);
    const statusPath = path.join(this.repository, `status-${nonce}.json`);
    await writeFile(script, taskSource);
    const config = unwrap(await this.page.evaluate(input => window.devstation.configs.save(input), {
      projectId: this.project.id, label, executablePath: process.execPath,
      args: [script, statusPath, nonce, mode, ...(descendant ? [descendant.statusPath, descendant.nonce] : [])], workingDir: this.repository,
    }));
    const run = unwrap(await this.page.evaluate(id => window.devstation.runs.start(id), config.id))!;
    expect(run.state).toBe('running'); expect(run.pid).toBeGreaterThan(0);
    const fixture = { nonce, statusPath, config, run };
    this.tasks.push(fixture);
    await expect.poll(async () => (await this.health(fixture))?.pid, { message: 'The owned Node fixture should start its loopback endpoint.' }).toBe(run.pid);
    return fixture;
  }
  async health(task: TaskFixture | DetachedFixture): Promise<TaskStatus | undefined> {
    try {
      const saved = JSON.parse(await readFile(task.statusPath, 'utf8')) as TaskStatus;
      if (saved.nonce !== task.nonce || !Number.isInteger(saved.port) || saved.port < 1 || saved.port > 65535) throw new Error('Invalid fixture status.');
      const response = await fetch(`http://127.0.0.1:${saved.port}/health`, { signal: AbortSignal.timeout(1500) });
      const status = await response.json() as TaskStatus;
      const expectedPid = 'run' in task ? task.run.pid : task.pid;
      if (!response.ok || status.nonce !== task.nonce || status.pid !== expectedPid) throw new Error('Fixture identity changed.');
      return status;
    } catch { return undefined; }
  }
  async stopFixture(task: TaskFixture | DetachedFixture) {
    const status = await this.health(task);
    if (!status) return;
    const response = await fetch(`http://127.0.0.1:${status.port}/stop/${task.nonce}`, { method: 'POST', signal: AbortSignal.timeout(1500) });
    expect((await response.json() as { nonce: string }).nonce).toBe(task.nonce);
    await expect.poll(() => this.health(task), { timeout: 5000 }).toBeUndefined();
  }
  async response(response: number) {
    await this.desktop!.evaluate((_electron, value) => { (globalThis as typeof globalThis & { __lifecycleTest: MainTestControl }).__lifecycleTest.response = value; }, response);
  }
  async blockOwnedKill(pids: number[]) {
    expect(pids.every(pid => this.tasks.some(task => task.run.pid === pid))).toBe(true);
    await this.desktop!.evaluate((_electron, input) => {
      const childProcess = process.getBuiltinModule('node:child_process') as typeof import('node:child_process');
      const control = (globalThis as typeof globalThis & { __lifecycleTest: MainTestControl }).__lifecycleTest;
      control.blockedPids = input.ownedPids;
      control.killLedgerPath = input.ledgerPath;
      control.originalKill ??= childProcess.ChildProcess.prototype.kill;
      const original = control.originalKill;
      childProcess.ChildProcess.prototype.kill = function (signal) {
        if (this.pid !== undefined && control.blockedPids.includes(this.pid)) {
          control.attempts.push(this.pid);
          const fs = process.getBuiltinModule('node:fs') as typeof import('node:fs');
          fs.appendFileSync(control.killLedgerPath!, `${JSON.stringify({ pid: this.pid })}\n`);
          return false;
        }
        return original.call(this, signal);
      };
    }, { ownedPids: pids, ledgerPath: path.join(this.root, 'kill-attempts.jsonl') });
  }
  async recordedKillAttempts() { return (await readFile(path.join(this.root, 'kill-attempts.jsonl'), 'utf8')).trim().split('\n').map(line => (JSON.parse(line) as { pid: number }).pid); }
  async restoreKill() {
    await this.desktop!.evaluate(() => {
      const control = (globalThis as typeof globalThis & { __lifecycleTest: MainTestControl }).__lifecycleTest;
      if (control.originalKill) {
        const childProcess = process.getBuiltinModule('node:child_process') as typeof import('node:child_process');
        childProcess.ChildProcess.prototype.kill = control.originalKill;
        control.originalKill = undefined; control.blockedPids = [];
      }
    });
  }
  async requestWindowClose() { await this.desktop!.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); }); }
  async closeFrom(button: Locator) {
    const closed = this.desktop!.waitForEvent('close', { timeout: 15000 });
    const clicked = button.click().catch((error: Error) => {
      // Closing during the pointer event can disconnect Playwright before it acknowledges the click.
      // The separately awaited app-close event remains mandatory.
      if (!error.message.includes('Target page, context or browser has been closed')) throw error;
    });
    await Promise.all([closed, clicked]);
  }
  async shutdownStatus() { return unwrap(await this.page.evaluate(() => window.devstation.app.shutdownStatus())); }
  async navigate(name: 'Runs' | 'Settings' | 'Projects') {
    const button = this.page.getByRole('navigation').getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'page');
  }
  async cleanup() {
    const alive = () => this.processHandle?.exitCode === null && this.processHandle.signalCode === null;
    if (alive()) await this.restoreKill().catch(() => undefined);
    for (const descendant of this.descendants) await this.stopFixture(descendant);
    for (const task of this.tasks) await this.stopFixture(task);
    if (alive()) {
      await this.response(1).catch(() => undefined);
      await this.desktop!.close().catch(() => { if (alive()) this.processHandle!.kill(); });
    }
    // Check the exact mkdtemp path, never a computed ancestor or a user project.
    if (path.dirname(this.root) !== os.tmpdir() || !path.basename(this.root).startsWith('DevStation-lifecycle-')) throw new Error('Unsafe fixture cleanup path.');
    await rm(this.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
}

test('P0-01 partial stop keeps a persistent warning and Retry stops only the owned survivor', async () => {
  const fixture = await DesktopFixture.create();
  try {
    await fixture.launch(); await fixture.importProject();
    const first = await fixture.startTask('Task that can stop');
    const second = await fixture.startTask('Task whose first stop fails');
    await fixture.response(0); await fixture.requestWindowClose();
    await expect.poll(async () => (await fixture.shutdownStatus()).phase).toBe('idle');
    expect(unwrap(await fixture.page.evaluate(() => window.devstation.runs.list())).every(run => run.state === 'running')).toBe(true);
    await fixture.blockOwnedKill([second.run.pid!]);
    await fixture.response(1); await fixture.requestWindowClose();
    await expect.poll(async () => (await fixture.shutdownStatus()).phase).toBe('blocked');
    const runs = unwrap(await fixture.page.evaluate(() => window.devstation.runs.list()));
    expect(runs.find(run => run.id === first.run.id)?.state).toBe('exited');
    expect(runs.find(run => run.id === second.run.id)?.state).toBe('unknown');
    expect((await fixture.health(second))?.pid).toBe(second.run.pid);
    const warning = fixture.page.getByRole('alert').filter({ has: fixture.page.getByRole('heading', { name: 'Some tasks may still be running.' }) });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(second.run.label);
    await warning.getByRole('button', { name: 'Keep DevStation open', exact: true }).click();
    await fixture.navigate('Settings'); await expect(warning).toBeVisible();
    const startDuringBlockedClose = await fixture.page.evaluate(id => window.devstation.runs.start(id), first.config.id);
    expect(startDuringBlockedClose).toMatchObject({ ok: false, error: { code: 'CLOSE_PENDING' } });
    await fixture.restoreKill();
    await fixture.closeFrom(warning.getByRole('button', { name: 'Retry stopping', exact: true }));
    await expect.poll(() => fixture.health(second)).toBeUndefined();
  } finally { await fixture.cleanup(); }
});

test('P0-01 Quit anyway requires a second confirmation and makes no additional stop request', async () => {
  const fixture = await DesktopFixture.create();
  try {
    await fixture.launch(); await fixture.importProject();
    const task = await fixture.startTask('Explicitly abandoned fixture');
    await fixture.blockOwnedKill([task.run.pid!]);
    await fixture.requestWindowClose();
    await expect.poll(async () => (await fixture.shutdownStatus()).phase).toBe('blocked');
    const warning = fixture.page.getByRole('alert').filter({ has: fixture.page.getByRole('heading', { name: 'Some tasks may still be running.' }) });
    await expect(warning).toBeVisible();
    await fixture.response(0);
    await warning.getByRole('button', { name: 'Quit anyway…', exact: true }).click();
    await expect.poll(async () => (await fixture.shutdownStatus()).phase).toBe('blocked');
    const observed = await fixture.desktop!.evaluate(() => {
      const control = (globalThis as typeof globalThis & { __lifecycleTest: MainTestControl }).__lifecycleTest;
      return { last: control.dialogs.at(-1), attempts: control.attempts };
    });
    expect(observed.last).toMatchObject({ title: 'Quit while tasks may still be running?', buttons: ['Keep DevStation open', 'Quit anyway'], defaultId: 0 });
    expect(observed.last?.detail).toContain('Reopening DevStation will not take ownership');
    expect(observed.attempts).toEqual([task.run.pid]);
    await expect(warning).toBeVisible(); expect(await fixture.health(task)).toBeDefined();
    await fixture.response(1);
    await fixture.closeFrom(warning.getByRole('button', { name: 'Quit anyway…', exact: true }));
    expect(await fixture.recordedKillAttempts()).toEqual([task.run.pid]);
    // Some Windows launch environments terminate descendants when their parent exits.
    // The persisted ledger proves the app made no extra stop request either way.
    await recordObservation('P0-01-quit-anyway-observation', { stopRequests: 1, taskAliveAfterQuit: Boolean(await fixture.health(task)) });
  } finally { await fixture.cleanup(); }
});

test('T30 more than 3 MB of live stdout stays bounded while navigation remains responsive', async () => {
  const testInfo = test.info();
  const fixture = await DesktopFixture.create();
  try {
    await fixture.launch(); await fixture.importProject();
    const cdp = await fixture.page.context().newCDPSession(fixture.page);
    const startedAt = performance.now();
    const samples: { elapsedMs: number; bytesProduced: number; mainRss: number; mainHeap: number; rendererHeap: number }[] = [];
    const navigation: { page: string; durationMs: number; bytesProduced: number }[] = [];
    async function sample(bytesProduced: number) {
      const main = await fixture.desktop!.evaluate(() => ({ rss: process.memoryUsage().rss, heap: process.memoryUsage().heapUsed }));
      const renderer = await cdp.send('Runtime.getHeapUsage');
      samples.push({ elapsedMs: performance.now() - startedAt, bytesProduced, mainRss: main.rss, mainHeap: main.heap, rendererHeap: renderer.usedSize });
    }
    await sample(0);
    const task = await fixture.startTask('Bounded live output', 'flood');
    for (const name of ['Runs', 'Settings', 'Projects', 'Runs', 'Settings', 'Runs'] as const) {
      const began = performance.now();
      await fixture.navigate(name);
      const health = await fixture.health(task);
      expect(health).toBeDefined();
      navigation.push({ page: name, durationMs: performance.now() - began, bytesProduced: health!.bytes });
      await sample(health!.bytes);
    }
    await expect.poll(async () => (await fixture.health(task))?.bytes, { timeout: 20000 }).toBe(12 * 1024 * 1024);
    await expect(fixture.page.getByText('Older output hidden to limit memory usage.', { exact: true })).toBeVisible();
    await expect.poll(async () => unwrap(await fixture.page.evaluate(id => window.devstation.runs.logs(id), task.run.id)).lines.at(-1)?.line).toBe(`FLOOD_COMPLETE ${12 * 1024 * 1024}`);
    await sample(12 * 1024 * 1024);
    const logs = unwrap(await fixture.page.evaluate(id => window.devstation.runs.logs(id), task.run.id));
    const retainedBytes = logs.lines.reduce((sum, line) => sum + Buffer.byteLength(line.line), 0);
    expect(logs.truncated).toBe(true); expect(logs.lines.length).toBeLessThanOrEqual(5000); expect(retainedBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    const view = await fixture.page.locator('.log-text').evaluateAll(lines => ({ lines: lines.length, characters: lines.reduce((sum, line) => sum + (line.textContent?.length ?? 0), 0) }));
    expect(view.lines).toBeGreaterThan(0); expect(view.lines).toBeLessThanOrEqual(5000); expect(view.characters).toBeLessThanOrEqual(1_000_000);
    expect(navigation.some(entry => entry.bytesProduced > 0 && entry.bytesProduced < 12 * 1024 * 1024)).toBe(true);
    expect(navigation.every(entry => entry.durationMs < 5000)).toBe(true);
    expect(samples.every(value => value.mainRss > 0 && value.mainHeap > 0 && value.rendererHeap > 0)).toBe(true);
    const ranges = Object.fromEntries((['mainRss', 'mainHeap', 'rendererHeap'] as const).map(key => [key, { min: Math.min(...samples.map(value => value[key])), max: Math.max(...samples.map(value => value[key])) }]));
    const measurements = { producedBytes: 12 * 1024 * 1024, retainedBytes, view, maxNavigationMs: Math.max(...navigation.map(value => value.durationMs)), ranges, navigation, samples, note: 'Short-run samples, not a long-duration leak or absolute memory-budget proof.' };
    const measurementPath = testInfo.outputPath('T30-measurements.json');
    await writeFile(measurementPath, JSON.stringify(measurements, null, 2));
    await testInfo.attach('T30-live-output-measurements', { path: measurementPath, contentType: 'application/json' });
    expect(unwrap(await fixture.page.evaluate(id => window.devstation.runs.stop(id), task.run.id))?.state).toBe('exited');
    await cdp.detach();
  } finally { await fixture.cleanup(); }
});

test('T35 abrupt main exit and reopen never reclaim or stop a surviving descendant', async () => {
  const fixture = await DesktopFixture.create();
  try {
    await fixture.launch(); await fixture.importProject();
    const descendantNonce = randomUUID();
    const descendantInput = { nonce: descendantNonce, statusPath: path.join(fixture.repository, `descendant-${descendantNonce}.json`) };
    const task = await fixture.startTask('Managed parent of a surviving descendant', 'detached-parent', descendantInput);
    const parentStatus = await fixture.health(task);
    const descendant: DetachedFixture = { ...descendantInput, pid: parentStatus!.descendantPid! };
    fixture.descendants.push(descendant);
    expect(descendant.pid).toBeGreaterThan(0); expect(descendant.pid).not.toBe(task.run.pid);
    await expect.poll(async () => (await fixture.health(descendant))?.pid).toBe(descendant.pid);
    expect(unwrap(await fixture.page.evaluate(() => window.devstation.runs.list())).map(run => run.pid)).toEqual([task.run.pid]);
    const closed = fixture.page.waitForEvent('close', { timeout: 15000 });
    // On Windows Playwright's handle may belong to the launcher. Terminate this
    // connected main process abruptly, without app.quit, PID lookup or tree killing.
    await fixture.desktop!.evaluate(() => { setTimeout(() => process.exit(86), 50); });
    await closed;
    const taskAliveAfterExit = Boolean(await fixture.health(task));
    expect((await fixture.health(descendant))?.pid).toBe(descendant.pid);
    await fixture.launch();
    expect(unwrap(await fixture.page.evaluate(() => window.devstation.projects.list()))).toEqual([fixture.project]);
    expect(unwrap(await fixture.page.evaluate(id => window.devstation.configs.list(id), fixture.project.id))).toEqual([task.config]);
    expect(unwrap(await fixture.page.evaluate(() => window.devstation.runs.list()))).toEqual([]);
    expect(await fixture.shutdownStatus()).toMatchObject({ phase: 'idle', runs: [] });
    const stopOldTask = await fixture.page.evaluate(id => window.devstation.runs.stop(id), task.run.id);
    expect(stopOldTask).toMatchObject({ ok: false, error: { code: 'RUN_NOT_FOUND' } });
    const taskAliveAfterReopen = Boolean(await fixture.health(task));
    expect((await fixture.health(descendant))?.pid).toBe(descendant.pid);
    await recordObservation('T35-session-ownership-observation', { abruptMainExitCode: 86, managedPid: task.run.pid, survivingDescendantPid: descendant.pid, taskAliveAfterExit, taskAliveAfterReopen, descendantAliveAfterExit: true, descendantAliveAfterRejectedStop: true, oldRunStopError: stopOldTask.ok ? null : stopOldTask.error.code, note: 'A detached fixture-only descendant, distinct from the managed PID, survives the abrupt exit and reopening. It is never added to session ownership; cleanup uses its own nonce endpoint. Production spawning is unchanged.' });
    await fixture.navigate('Runs');
    await expect(fixture.page.getByText(task.run.label, { exact: true })).toHaveCount(0);
  } finally { await fixture.cleanup(); }
});
