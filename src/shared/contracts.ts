export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; retryable: boolean } };
export interface Project { id: string; name: string; path: string; addedAt: string }
export interface GitOverview {
  gitAvailable: boolean; isRepository: boolean; branch: string | null; isDetached: boolean; isUnborn: boolean;
  dirty: boolean | null; modified: number | null; untracked: number | null; staged: number | null;
  lastCommit: { shortHash: string; subject: string; dateIso: string } | null; checkedAt: string; warning?: string;
}
export interface RunConfig { id: string; projectId: string; label: string; executablePath: string; args: string[]; workingDir: string }
export type SaveRunConfig = Omit<RunConfig, 'id'> & { id?: string };
export type RunState = 'starting' | 'running' | 'stopping' | 'exited' | 'failed' | 'unknown';
export interface ManagedRun { id: string; configId: string; projectId: string; label: string; pid?: number; state: RunState; startedAt: string; endedAt?: string; exitCode?: number | null; error?: string; warning?: string }
export interface LogLine { sequence: number; runId: string; timestamp: string; stream: 'stdout' | 'stderr'; line: string }
export interface RunLogs { lines: LogLine[]; truncated: boolean }
export interface ListeningPort { protocol: 'tcp'; address: string; port: number; pid: number | null; visibility: 'loopback' | 'all-interfaces' | 'other' }
export interface ToolDiagnostic { name: 'Git' | 'Node.js' | 'npm' | 'Python'; status: 'installed' | 'not-found' | 'not-checked' | 'error'; version?: string; detail?: string; checkedAt: string }
export interface Settings { theme: 'dark' | 'light' | 'system' }
export interface AppInfo { version: string; platform: string }
export interface DevStationApi {
  projects: { list(): Promise<Result<Project[]>>; chooseAndAdd(): Promise<Result<Project | null>>; remove(projectId: string): Promise<Result<void>>; gitOverview(projectId: string): Promise<Result<GitOverview>>; openFolder(projectId: string): Promise<Result<void>> };
  configs: { list(projectId: string): Promise<Result<RunConfig[]>>; save(config: SaveRunConfig): Promise<Result<RunConfig>>; delete(configId: string): Promise<Result<void>>; chooseExecutable(): Promise<Result<string | null>>; chooseWorkingDir(projectId: string): Promise<Result<string | null>> };
  runs: { list(): Promise<Result<ManagedRun[]>>; start(configId: string): Promise<Result<ManagedRun | null>>; stop(runId: string): Promise<Result<ManagedRun | null>>; logs(runId: string): Promise<Result<RunLogs>>; onLog(runId: string, callback: (line: LogLine) => void): () => void };
  ports: { list(): Promise<Result<{ ports: ListeningPort[]; checkedAt: string }>> };
  diagnostics: { check(): Promise<Result<ToolDiagnostic[]>> };
  settings: { get(): Promise<Result<Settings>>; update(settings: Settings): Promise<Result<Settings>> };
  app: { info(): Promise<Result<AppInfo>>; openHelp(target: 'git' | 'node' | 'python' | 'readme'): Promise<Result<void>> };
}
declare global { interface Window { devstation: DevStationApi } }
