import { z } from 'zod';
import type { SaveRunConfig } from '../../shared/contracts';
import { AppError } from '../../shared/errors';
import type { Store } from '../storage/store';
import { executablePath, workingDirectory } from '../security/paths';

const configSchema = z.object({
  id: z.uuid().optional(), projectId: z.uuid(),
  label: z.string().trim().min(1).max(60).regex(/^[^\x00-\x1f\x7f]+$/),
  executablePath: z.string().min(1).max(32767),
  args: z.array(z.string().max(8192).refine((value) => !value.includes('\0'))).max(64),
  workingDir: z.string().min(1).max(32767),
}).strict();

export class ConfigService {
  constructor(private store: Store, private isActive: (configId: string) => boolean) {}
  list(projectId: string) { return this.store.listConfigs(projectId); }
  get(id: string) { return this.store.getConfig(id); }
  async validate(input: SaveRunConfig) {
    const parsed = configSchema.safeParse(input);
    if (!parsed.success) throw new AppError('INVALID_CONFIG', 'Check the configuration name, executable, arguments and working directory.');
    const config = parsed.data;
    const project = this.store.getProject(config.projectId);
    const [executable, cwd] = await Promise.all([executablePath(config.executablePath), workingDirectory(project.path, config.workingDir)]);
    return { ...config, executablePath: executable, workingDir: cwd };
  }
  async save(input: SaveRunConfig) {
    if (input.id && this.isActive(input.id)) throw new AppError('CONFIG_RUNNING', 'Stop this configuration before editing it.');
    const validated = await this.validate(input);
    if (input.id && this.isActive(input.id)) throw new AppError('CONFIG_RUNNING', 'Stop this configuration before editing it.');
    return this.store.saveConfig(validated);
  }
  delete(id: string) {
    if (this.isActive(id)) throw new AppError('CONFIG_RUNNING', 'Stop this configuration before deleting it.');
    this.store.deleteConfig(id);
  }
}
