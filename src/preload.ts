import { contextBridge, ipcRenderer } from 'electron';
import type { DevStationApi, LogLine, Result } from './shared/contracts';

const invoke = <T>(channel: string, value?: unknown): Promise<Result<T>> => ipcRenderer.invoke(channel, value);
const api: DevStationApi = {
  projects: {
    list: () => invoke('projects:list'), chooseAndAdd: () => invoke('projects:choose-and-add'),
    remove: id => invoke('projects:remove', id), gitOverview: id => invoke('projects:git-overview', id), openFolder: id => invoke('projects:open-folder', id),
  },
  configs: {
    list: id => invoke('configs:list', id), save: input => invoke('configs:save', input), delete: id => invoke('configs:delete', id),
    chooseExecutable: () => invoke('configs:choose-executable'), chooseWorkingDir: id => invoke('configs:choose-working-dir', id),
    chooseScript: (projectId, kind) => invoke('configs:choose-script', { projectId, kind }),
    reviewScript: configId => invoke('configs:review-script', configId),
    authorizeScript: (configId, token) => invoke('configs:authorize-script', { configId, token }),
  },
  runs: {
    list: () => invoke('runs:list'), start: id => invoke('runs:start', id), stop: id => invoke('runs:stop', id), logs: id => invoke('runs:logs', id),
    onLog: (runId, callback) => {
      const listener = (_event: Electron.IpcRendererEvent, lines: LogLine[]) => { for (const line of lines) if (line.runId === runId) callback(line); };
      ipcRenderer.on('runs:log', listener);
      return () => { ipcRenderer.removeListener('runs:log', listener); };
    },
  },
  ports: { list: () => invoke('ports:list') }, diagnostics: { check: () => invoke('diagnostics:check') },
  settings: { get: () => invoke('settings:get'), update: settings => invoke('settings:update', settings) },
  app: { info: () => invoke('app:info'), openHelp: target => invoke('app:open-help', target), shutdownStatus: () => invoke('app:shutdown-status'), shutdownAction: action => invoke('app:shutdown-action', action) },
};
contextBridge.exposeInMainWorld('devstation', api);
