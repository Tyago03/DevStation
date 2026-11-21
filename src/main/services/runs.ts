import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { LogLine, ManagedRun } from '../../shared/contracts';
import { AppError } from '../../shared/errors';
import type { ConfigService } from './configs';
import { localEnvironment } from './command';
import { LogBuffer, LogStream } from './logs';

interface RunEntry { state: ManagedRun; child?: ChildProcess; logs: LogBuffer }
const isActive = (run: ManagedRun) => ['starting', 'running', 'stopping', 'unknown'].includes(run.state);
const childWarning = 'Only the process started by DevStation is managed. Child processes may still be running.';

export class RunService {
  private entries = new Map<string, RunEntry>();
  constructor(private configs: ConfigService, private onLog: (line: LogLine) => void = () => undefined) {}
  list(): ManagedRun[] { return [...this.entries.values()].map((entry) => ({ ...entry.state })).reverse(); }
  active(): ManagedRun[] { return this.list().filter(isActive); }
  get(id: string): ManagedRun { return { ...this.entry(id).state }; }
  private entry(id: string) {
    const entry = this.entries.get(id);
    if (!entry) throw new AppError('RUN_NOT_FOUND', 'This run does not belong to the current DevStation session.');
    return entry;
  }
  logs(id: string) { return this.entry(id).logs.snapshot(); }
  async start(configId: string): Promise<ManagedRun> {
    const config = this.configs.get(configId);
    const active = this.active();
    if (active.length >= 5 || active.filter((run) => run.projectId === config.projectId).length >= 2) {
      throw new AppError('RUN_LIMIT', 'At most five tasks can run at once, and two per project. Stop a task first.');
    }
    // Reserve synchronously before filesystem awaits, preventing concurrent-start races.
    const state: ManagedRun = { id: randomUUID(), configId, projectId: config.projectId, label: config.label, state: 'starting', startedAt: new Date().toISOString() };
    const entry: RunEntry = { state, logs: new LogBuffer() };
    this.entries.set(state.id, entry);
    this.pruneHistory();
    try {
      const validated = await this.configs.validate(config);
      // If a user canceled a pending start, do not spawn after asynchronous validation.
      if (state.state !== 'starting') return { ...state };
      const child = spawn(validated.executablePath, validated.args, { shell: false, windowsHide: true, cwd: validated.workingDir, env: { ...localEnvironment(), PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
      entry.child = child;
      const publish = (stream: LogLine['stream'], line: string) => {
        const log = entry.logs.push(state.id, stream, line);
        this.onLog(log);
      };
      const stdout = new LogStream(line => publish('stdout', line));
      const stderr = new LogStream(line => publish('stderr', line));
      child.stdout.on('data', (chunk: Buffer) => stdout.write(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.write(chunk));
      child.stdout.once('end', () => stdout.end()); child.stderr.once('end', () => stderr.end());
      let pipeDrainTimer: ReturnType<typeof setTimeout> | undefined;
      child.once('exit', (code) => {
        state.exitCode = code;
        state.endedAt = new Date().toISOString();
        if (state.state !== 'failed') state.state = 'exited';
        state.warning = childWarning;
        entry.child = undefined;
        // A descendant may inherit these pipes. Parent ownership ends on exit;
        // allow buffered output to drain, then release inherited streams.
        pipeDrainTimer = setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); }, 250);
        pipeDrainTimer.unref();
      });
      child.once('close', () => {
        clearTimeout(pipeDrainTimer);
        stdout.end(); stderr.end();
      });
      return await new Promise<ManagedRun>((resolve, reject) => {
        child.once('spawn', () => { state.pid = child.pid; state.state = 'running'; resolve({ ...state }); });
        child.once('error', () => {
          state.state = 'failed'; state.endedAt = new Date().toISOString();
          state.error = 'The selected executable could not be started. Check its permissions and arguments.';
          reject(new AppError('PROCESS_START_FAILED', state.error, true));
        });
      });
    } catch (error) {
      state.state = 'failed'; state.endedAt = new Date().toISOString();
      state.error = error instanceof AppError ? error.message : 'The process could not be started.';
      throw error;
    }
  }
  async stop(id: string): Promise<ManagedRun> {
    const entry = this.entry(id); const { state, child } = entry;
    if (!isActive(state)) return { ...state };
    state.warning = childWarning;
    if (!child) {
      state.state = 'exited'; state.endedAt = new Date().toISOString();
      return { ...state };
    }
    // Only this live ChildProcess handle is eligible. Never accept or reacquire a PID.
    if (child.exitCode !== null || child.signalCode !== null) return { ...state };
    state.state = 'stopping';
    let done = () => undefined;
    const exited = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => { child.removeListener('exit', done); resolve(); }, 3000);
      done = () => { clearTimeout(timeout); resolve(); };
      child.once('exit', done);
    });
    const terminated = child.kill();
    if (!terminated) {
      child.removeListener('exit', done); done();
      state.state = 'unknown';
      state.error = 'The managed process could not be stopped. Its status is unknown.';
      return { ...state };
    }
    await exited;
    if (state.state === 'stopping') { state.state = 'unknown'; state.error = 'Stop was requested, but process termination could not be confirmed.'; }
    return { ...state };
  }
  async stopAll(): Promise<ManagedRun[]> { return Promise.all(this.active().map((run) => this.stop(run.id))); }
  private pruneHistory() {
    // Session history is bounded as well as each individual log buffer.
    if (this.entries.size <= 50) return;
    for (const [id, entry] of this.entries) {
      if (!isActive(entry.state)) this.entries.delete(id);
      if (this.entries.size <= 50) break;
    }
  }
}
