import type { ManagedRun, ShutdownAction, ShutdownStatus } from '../../shared/contracts';

export interface ShutdownDependencies {
  activeRuns(): ManagedRun[];
  listRuns(): ManagedRun[];
  stopAll(): Promise<ManagedRun[]>;
  chooseClose(runs: ManagedRun[], alreadyBlocked: boolean): Promise<ShutdownAction>;
  confirmQuitAnyway(runs: ManagedRun[]): Promise<boolean>;
  quit(): void;
}

const childWarning = 'Child processes may still be running. DevStation only controls main processes started in this session.';
const mergeRuns = (...groups: ManagedRun[][]): ManagedRun[] => [...new Map(groups.flat().map(run => [run.id, run])).values()];

/** Coordinates close decisions without owning, looking up, or signaling a PID. */
export class ShutdownController {
  private current: ShutdownStatus = { phase: 'idle', runs: [] };
  private pending = false;
  private quitting = false;
  constructor(private dependencies: ShutdownDependencies) {}

  get isQuitting(): boolean { return this.quitting; }
  status(): ShutdownStatus {
    if (this.current.phase === 'blocked') {
      const observed = new Map(this.dependencies.listRuns().map(run => [run.id, run]));
      const allExited = this.current.runs.length > 0 && this.current.runs.every(run => observed.get(run.id)?.state === 'exited');
      if (allExited && this.dependencies.activeRuns().length === 0) {
        // A later exit resolves the warning, but never revives the earlier quit intent.
        this.current = { phase: 'idle', runs: [] };
      } else {
        this.current = { ...this.current, runs: this.current.runs.map(run => observed.get(run.id) ?? run) };
      }
    }
    return { ...this.current, runs: this.current.runs.map(run => ({ ...run })) };
  }

  async requestClose(): Promise<void> {
    if (this.pending || this.quitting) return;
    this.pending = true;
    const previous = this.status();
    const affected = mergeRuns(previous.runs, this.dependencies.activeRuns());
    try {
      if (previous.phase === 'idle' && affected.length === 0) { this.quit(); return; }
      this.current = { phase: 'confirming', runs: affected };
      const choice = await this.dependencies.chooseClose(affected, previous.phase === 'blocked');
      if (choice === 'keep-open') {
        this.current = previous.phase === 'blocked' ? previous : { phase: 'idle', runs: [] };
      } else if (choice === 'retry') {
        await this.stopAndVerify(affected);
      } else if (previous.phase === 'blocked') {
        await this.confirmLeaving(affected, previous);
      } else {
        // Quit-anyway is never offered as an unconfirmed first-close shortcut.
        this.current = { phase: 'idle', runs: [] };
      }
    } catch {
      this.block(affected, 'The close request could not be completed. DevStation will stay open.');
    } finally { this.pending = false; }
  }

  async action(action: ShutdownAction): Promise<ShutdownStatus> {
    const current = this.status();
    if (this.pending || this.quitting || current.phase !== 'blocked') return current;
    // Keeping the window open does not dismiss evidence of an uncertain stop.
    if (action === 'keep-open') return this.status();
    this.pending = true;
    const previous = this.status();
    const affected = mergeRuns(previous.runs, this.dependencies.activeRuns());
    try {
      if (action === 'retry') await this.stopAndVerify(affected);
      else await this.confirmLeaving(affected, previous);
    } catch {
      this.block(affected, 'The close request could not be completed. DevStation will stay open.');
    } finally { this.pending = false; }
    return this.status();
  }

  private async stopAndVerify(affected: ManagedRun[]): Promise<void> {
    this.current = { phase: 'stopping', runs: affected, message: 'Waiting for the managed processes to exit.' };
    let results: ManagedRun[] = [];
    let failed = false;
    try { results = await this.dependencies.stopAll(); } catch { failed = true; }
    const active = this.dependencies.activeRuns();
    const observed = new Map(this.dependencies.listRuns().map(run => [run.id, run]));
    const candidates = mergeRuns(affected, results, active);
    const unresolved = candidates.map(run => observed.get(run.id) ?? run).filter(run => run.state !== 'exited');
    if (failed) {
      this.block(unresolved.length ? unresolved : candidates, 'One or more stop requests failed. Tasks may still be running. DevStation will stay open.');
    } else if (unresolved.length || active.length) {
      this.block(mergeRuns(unresolved, active), 'DevStation could not confirm that every managed task stopped. The window will stay open.');
    } else {
      this.current = { phase: 'idle', runs: [] };
      this.quit();
    }
  }

  private async confirmLeaving(affected: ManagedRun[], previous: ShutdownStatus): Promise<void> {
    this.current = { phase: 'confirming', runs: affected, message: previous.message };
    if (await this.dependencies.confirmQuitAnyway(affected)) this.quit();
    else this.current = previous;
  }

  private block(runs: ManagedRun[], message: string): void {
    this.quitting = false;
    this.current = { phase: 'blocked', runs: runs.map(run => ({ ...run })), message: `${message} ${childWarning}` };
  }

  private quit(): void {
    this.quitting = true;
    this.dependencies.quit();
  }
}
