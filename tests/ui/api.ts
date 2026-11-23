import { vi } from 'vitest';
import type { DevStationApi, GitOverview, Result } from '../../src/shared/contracts';

export const success = <T,>(data: T): Result<T> => ({ ok: true, data });
export const cleanGit: GitOverview = {
  gitAvailable: true, isRepository: true, branch: 'main', isDetached: false, isUnborn: false,
  dirty: false, modified: 0, staged: 0, untracked: 0, lastCommit: null, checkedAt: '2026-11-21T12:00:00Z',
};

export function testApi(): DevStationApi {
  return {
    projects: { list: vi.fn(async () => success([])), chooseAndAdd: vi.fn(async () => success(null)), remove: vi.fn(async () => success(undefined)), gitOverview: vi.fn(async () => success(cleanGit)), openFolder: vi.fn(async () => success(undefined)) },
    configs: { list: vi.fn(async () => success([])), save: vi.fn(async config => success({ ...config, id: config.id ?? 'config-1' })), delete: vi.fn(async () => success(undefined)), chooseExecutable: vi.fn(async () => success(null)), chooseWorkingDir: vi.fn(async () => success(null)), chooseScript: vi.fn(async () => success(null)) },
    runs: { list: vi.fn(async () => success([])), start: vi.fn(async () => success(null)), stop: vi.fn(async () => success(null)), logs: vi.fn(async () => success({ lines: [], truncated: false })), onLog: vi.fn(() => vi.fn()) },
    ports: { list: vi.fn(async () => success({ ports: [], checkedAt: '2026-11-21T12:00:00Z' })) },
    diagnostics: { check: vi.fn(async () => success([])) },
    settings: { get: vi.fn(async () => success({ theme: 'dark' as const })), update: vi.fn(async settings => success(settings)) },
    app: { info: vi.fn(async () => success({ version: '0.2.0', platform: 'win32' })), openHelp: vi.fn(async () => success(undefined)), shutdownStatus: vi.fn(async () => success({ phase: 'idle' as const, runs: [] })), shutdownAction: vi.fn(async () => success({ phase: 'idle' as const, runs: [] })) },
  };
}
