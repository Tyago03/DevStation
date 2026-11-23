import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { RunService } from '../../src/main/services/runs';
import type { ConfigService } from '../../src/main/services/configs';
import { AppError } from '../../src/shared/errors';

vi.mock('node:child_process', async importOriginal => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return { ...original, spawn: vi.fn() };
});

function simulatedProcess() {
  const child = Object.assign(new EventEmitter(), {
    pid: 12345, exitCode: null as number | null, signalCode: null as NodeJS.Signals | null,
    stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(() => false),
  });
  vi.mocked(spawn).mockImplementation(() => {
    queueMicrotask(() => child.emit('spawn'));
    return child as unknown as ReturnType<typeof spawn>;
  });
  const config = { id: 'fixture-config', projectId: 'fixture-project', label: 'Owned fixture', executablePath: 'C:\\fixture.exe', args: [], workingDir: 'C:\\fixture' };
  // This isolated unit double bypasses filesystem setup, never a production IPC path.
  const configs = { get: () => config, validate: async () => config } as unknown as ConfigService;
  const runs = new RunService(configs);
  const exit = () => {
    child.exitCode = 0; child.emit('exit', 0); child.stdout.end(); child.stderr.end(); child.emit('close', 0);
  };
  return { child, runs, exit };
}

afterEach(() => { vi.clearAllMocks(); });

describe('pending start and shutdown', () => {
  function pendingStart() {
    const config = { id: 'pending-config', projectId: 'fixture-project', label: 'Pending fixture', executablePath: 'C:\\fixture.exe', args: [], workingDir: 'C:\\fixture' };
    let finishValidation!: (value: typeof config) => void;
    const validation = new Promise<typeof config>(resolve => { finishValidation = resolve; });
    const configs = { get: () => config, validate: () => validation } as unknown as ConfigService;
    return { runs: new RunService(configs), validate: () => finishValidation(config) };
  }

  it('reserves a start during validation, then cancels it without spawning when stopped', async () => {
    const { runs, validate } = pendingStart();
    const guard = vi.fn();
    const pending = runs.start('pending-config', guard);
    expect(runs.active()).toHaveLength(1);
    expect(runs.active()[0].state).toBe('starting');
    expect((await runs.stopAll())[0].state).toBe('exited');
    validate();
    expect((await pending).state).toBe('exited');
    expect(guard).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rechecks lifecycle after validation and rejects before creating any process', async () => {
    const { runs, validate } = pendingStart();
    let closing = false;
    const guard = vi.fn(() => { if (closing) throw new AppError('CLOSE_PENDING', 'Closing is in progress.'); });
    const pending = runs.start('pending-config', guard);
    closing = true;
    validate();
    await expect(pending).rejects.toMatchObject({ code: 'CLOSE_PENDING' });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(spawn).not.toHaveBeenCalled();
    expect(runs.active()).toHaveLength(0);
    expect(runs.list()[0]).toMatchObject({ state: 'failed' });
    expect(runs.list()[0].pid).toBeUndefined();
  });
});

describe('owned handle stop failures', () => {
  it('retains ownership and Unknown when kill throws, allowing an explicit retry', async () => {
    const { child, runs, exit } = simulatedProcess();
    const started = await runs.start('fixture-config');
    child.kill.mockImplementationOnce(() => { throw new Error('synthetic permission failure'); });
    expect((await runs.stop(started.id)).state).toBe('unknown');
    expect(runs.active()).toHaveLength(1);
    child.kill.mockImplementationOnce(() => { queueMicrotask(exit); return true; });
    expect((await runs.stop(started.id)).state).toBe('exited');
    expect(child.kill).toHaveBeenCalledTimes(2);
    await runs.stop(started.id);
    expect(child.kill).toHaveBeenCalledTimes(2);
  });

  it('does not label a post-spawn process-control error as an exited or failed launch', async () => {
    const { child, runs, exit } = simulatedProcess();
    const started = await runs.start('fixture-config');
    child.emit('error', new Error('synthetic control error'));
    child.emit('error', new Error('second synthetic control error'));
    expect(runs.get(started.id)).toMatchObject({ state: 'unknown', pid: 12345 });
    expect(runs.get(started.id).endedAt).toBeUndefined();
    expect(runs.active()).toHaveLength(1);
    child.kill.mockImplementationOnce(() => { queueMicrotask(exit); return true; });
    expect((await runs.stop(started.id)).state).toBe('exited');
  });

  it('clears obsolete uncertainty on a later confirmed exit while preserving the child-process warning', async () => {
    const { runs, exit } = simulatedProcess();
    const started = await runs.start('fixture-config');
    expect((await runs.stop(started.id)).state).toBe('unknown');
    expect(runs.get(started.id).error).toContain('unknown');
    exit();
    expect(runs.get(started.id).state).toBe('exited');
    expect(runs.get(started.id).error).toBeUndefined();
    expect(runs.get(started.id).warning).toContain('Child processes may still be running');
  });

  it('rejects an unknown run without touching any simulated process handle', async () => {
    const { child, runs, exit } = simulatedProcess();
    await runs.start('fixture-config');
    await expect(runs.stop('external-id')).rejects.toMatchObject({ code: 'RUN_NOT_FOUND' });
    expect(child.kill).not.toHaveBeenCalled();
    exit();
  });
});
