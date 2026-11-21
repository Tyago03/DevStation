import type { LogLine } from '../../shared/contracts';
import { Store } from '../storage/store';
import { ConfigService } from './configs';
import { DiagnosticService } from './diagnostics';
import { GitService } from './git';
import { PortsService } from './ports';
import { ProjectService } from './projects';
import { RunService } from './runs';

export function createServices(databasePath: string, onLog?: (line: LogLine) => void) {
  const store = new Store(databasePath);
  const git = new GitService();
  const configs: ConfigService = new ConfigService(store, (id) => runs.active().some((run) => run.configId === id));
  const runs: RunService = new RunService(configs, onLog);
  const projects = new ProjectService(store, git, (id) => runs.active().some((run) => run.projectId === id));
  return { store, projects, configs, runs, git, ports: new PortsService(), diagnostics: new DiagnosticService() };
}
export type Services = ReturnType<typeof createServices>;
