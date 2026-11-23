import { describe, expect, it, vi } from 'vitest';
import { ShutdownController, type ShutdownDependencies } from '../../src/main/lifecycle/shutdown';
import type { ManagedRun, ShutdownAction } from '../../src/shared/contracts';

function run(id: string, state: ManagedRun['state'] = 'running'): ManagedRun {
  return { id, state, configId: `config-${id}`, projectId: 'fixture', label: `Task ${id}`, pid: 100, startedAt: '2026-11-23T00:00:00.000Z' };
}

function fixture(initial: ManagedRun[] = [run('one')]) {
  let runs = initial;
  const dependencies = {
    activeRuns: () => runs.filter(value => ['starting', 'running', 'stopping', 'unknown'].includes(value.state)),
    listRuns: () => runs,
    stopAll: vi.fn<() => Promise<ManagedRun[]>>(async () => { runs = runs.map(value => ({ ...value, state: 'exited' as const })); return runs; }),
    chooseClose: vi.fn(async (): Promise<ShutdownAction> => 'retry'),
    confirmQuitAnyway: vi.fn(async () => false),
    quit: vi.fn(),
  } satisfies ShutdownDependencies;
  return { dependencies, controller: new ShutdownController(dependencies), setRuns: (value: ManagedRun[]) => { runs = value; } };
}

describe('shutdown decisions', () => {
  it('closes an idle workspace without asking to stop anything', async () => {
    const { controller, dependencies } = fixture([]);
    await controller.requestClose();
    expect(dependencies.quit).toHaveBeenCalledOnce();
    expect(dependencies.stopAll).not.toHaveBeenCalled();
    expect(dependencies.chooseClose).not.toHaveBeenCalled();
  });

  it('keeps active runs untouched when the initial close prompt is canceled', async () => {
    const { controller, dependencies } = fixture();
    dependencies.chooseClose.mockResolvedValue('keep-open');
    await controller.requestClose();
    expect(controller.status()).toEqual({ phase: 'idle', runs: [] });
    expect(dependencies.stopAll).not.toHaveBeenCalled();
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('quits only after every affected run is confirmed exited and none remains active', async () => {
    const { controller, dependencies } = fixture([run('one'), run('two')]);
    await controller.requestClose();
    expect(dependencies.stopAll).toHaveBeenCalledOnce();
    expect(dependencies.quit).toHaveBeenCalledOnce();
    expect(controller.isQuitting).toBe(true);
  });

  it('retains an alert listing only unresolved runs after a partial stop', async () => {
    const { controller, dependencies, setRuns } = fixture([run('one'), run('two')]);
    dependencies.stopAll.mockImplementation(async () => {
      const results = [run('one', 'exited'), run('two', 'unknown')]; setRuns(results); return results;
    });
    await controller.requestClose();
    expect(controller.status()).toMatchObject({ phase: 'blocked', runs: [{ id: 'two', state: 'unknown' }], message: expect.stringContaining('Child processes may still be running') });
    expect(dependencies.quit).not.toHaveBeenCalled();
    expect(controller.isQuitting).toBe(false);
  });

  it('retains the window and affected tasks after stopAll throws', async () => {
    const { controller, dependencies } = fixture([run('one'), run('two')]);
    dependencies.stopAll.mockRejectedValue(new Error('synthetic internal error'));
    await controller.requestClose();
    expect(controller.status()).toMatchObject({ phase: 'blocked', message: expect.stringContaining('stop requests failed') });
    expect(controller.status().runs.map(value => value.id)).toEqual(['one', 'two']);
    expect(controller.status().message).not.toContain('synthetic internal error');
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('does not treat an empty response or a missing run as proof of exit', async () => {
    const { controller, dependencies, setRuns } = fixture();
    dependencies.stopAll.mockImplementation(async () => { setRuns([]); return []; });
    await controller.requestClose();
    expect(controller.status()).toMatchObject({ phase: 'blocked', runs: [{ id: 'one' }] });
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('detects a task added while the stop operation was in progress', async () => {
    const { controller, dependencies, setRuns } = fixture();
    dependencies.stopAll.mockImplementation(async () => {
      const stopped = run('one', 'exited'); setRuns([stopped, run('new')]); return [stopped];
    });
    await controller.requestClose();
    expect(controller.status()).toMatchObject({ phase: 'blocked', runs: [{ id: 'new' }] });
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('retries an uncertain stop and quits only once it is confirmed', async () => {
    const { controller, dependencies, setRuns } = fixture();
    dependencies.stopAll.mockImplementationOnce(async () => { const value = [run('one', 'unknown')]; setRuns(value); return value; });
    await controller.requestClose();
    expect(dependencies.quit).not.toHaveBeenCalled();
    await controller.action('retry');
    expect(dependencies.stopAll).toHaveBeenCalledTimes(2);
    expect(dependencies.quit).toHaveBeenCalledOnce();
  });

  it('Keep open preserves the persistent alert without sending another stop request', async () => {
    const { controller, dependencies } = fixture();
    dependencies.stopAll.mockRejectedValue(new Error('synthetic failure'));
    await controller.requestClose();
    const before = controller.status();
    expect(await controller.action('keep-open')).toEqual(before);
    expect(dependencies.stopAll).toHaveBeenCalledOnce();
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('releases a blocked workspace after a later confirmed exit without quitting automatically', async () => {
    const { controller, dependencies, setRuns } = fixture();
    dependencies.stopAll.mockImplementationOnce(async () => { const value = [run('one', 'unknown')]; setRuns(value); return value; });
    await controller.requestClose(); await controller.action('keep-open');
    expect(controller.status().phase).toBe('blocked');
    setRuns([run('one', 'exited')]);
    expect(controller.status()).toEqual({ phase: 'idle', runs: [] });
    expect(controller.isQuitting).toBe(false);
    expect(dependencies.quit).not.toHaveBeenCalled();
    // A stale click on a banner that has just resolved must not restore quit intent.
    await controller.action('retry');
    expect(dependencies.stopAll).toHaveBeenCalledOnce();
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('never clears an uncertain stop merely because the run ID disappears', async () => {
    const { controller, dependencies, setRuns } = fixture();
    dependencies.stopAll.mockImplementationOnce(async () => { const value = [run('one', 'unknown')]; setRuns(value); return value; });
    await controller.requestClose();
    setRuns([]);
    expect(controller.status()).toMatchObject({ phase: 'blocked', runs: [{ id: 'one', state: 'unknown' }] });
    await controller.action('keep-open');
    expect(controller.status().phase).toBe('blocked');
    expect(dependencies.quit).not.toHaveBeenCalled();
  });

  it('requires a separate confirmation for Quit anyway and sends no extra stop signal', async () => {
    const { controller, dependencies } = fixture();
    dependencies.stopAll.mockRejectedValue(new Error('synthetic failure'));
    await controller.requestClose();
    await controller.action('quit-anyway');
    expect(dependencies.confirmQuitAnyway).toHaveBeenCalledOnce();
    expect(controller.status().phase).toBe('blocked');
    expect(dependencies.quit).not.toHaveBeenCalled();
    dependencies.confirmQuitAnyway.mockResolvedValue(true);
    await controller.action('quit-anyway');
    expect(dependencies.confirmQuitAnyway).toHaveBeenCalledTimes(2);
    expect(dependencies.stopAll).toHaveBeenCalledOnce();
    expect(dependencies.quit).toHaveBeenCalledOnce();
  });

  it('requires the same second confirmation when closing an already blocked window', async () => {
    const { controller, dependencies } = fixture();
    dependencies.stopAll.mockRejectedValue(new Error('synthetic failure'));
    await controller.requestClose();
    dependencies.chooseClose.mockResolvedValue('quit-anyway');
    await controller.requestClose();
    expect(dependencies.confirmQuitAnyway).toHaveBeenCalledOnce();
    expect(dependencies.quit).not.toHaveBeenCalled();
    expect(controller.status().phase).toBe('blocked');
  });

  it('locks concurrent close/action calls while the native confirmation is pending', async () => {
    const { controller, dependencies } = fixture();
    let choose: (value: ShutdownAction) => void = () => undefined;
    dependencies.chooseClose.mockImplementation(() => new Promise(resolve => { choose = resolve; }));
    const closing = controller.requestClose();
    expect(controller.status().phase).toBe('confirming');
    await controller.requestClose(); await controller.action('retry'); await controller.action('quit-anyway');
    expect(dependencies.chooseClose).toHaveBeenCalledOnce();
    expect(dependencies.stopAll).not.toHaveBeenCalled();
    choose('keep-open'); await closing;
    expect(controller.status().phase).toBe('idle');
  });

  it('locks concurrent retries while stopping, and never infers success from the request alone', async () => {
    const { controller, dependencies, setRuns } = fixture();
    let resolveStop: (value: ManagedRun[]) => void = () => undefined;
    dependencies.stopAll.mockImplementation(() => new Promise(resolve => { resolveStop = resolve; }));
    const closing = controller.requestClose(); await Promise.resolve();
    expect(controller.status().phase).toBe('stopping');
    await controller.requestClose(); await controller.action('retry'); await controller.action('quit-anyway');
    expect(dependencies.stopAll).toHaveBeenCalledOnce(); expect(dependencies.quit).not.toHaveBeenCalled();
    setRuns([run('one', 'unknown')]); resolveStop([run('one', 'unknown')]); await closing;
    expect(controller.status().phase).toBe('blocked');
  });

  it('does not expose an idle shutdown action as a shortcut around close confirmation', async () => {
    const { controller, dependencies } = fixture();
    await controller.action('retry'); await controller.action('quit-anyway');
    expect(dependencies.quit).not.toHaveBeenCalled(); expect(dependencies.stopAll).not.toHaveBeenCalled();
    expect(controller.status().phase).toBe('idle');
  });

  it('keeps a persistent alert if the native confirmation itself fails', async () => {
    const { controller, dependencies } = fixture();
    dependencies.chooseClose.mockRejectedValue(new Error('synthetic dialog failure'));
    await controller.requestClose();
    expect(controller.status()).toMatchObject({ phase: 'blocked', runs: [{ id: 'one' }] });
    expect(dependencies.quit).not.toHaveBeenCalled();
  });
});
