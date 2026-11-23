import { z } from 'zod';
import type { SaveRunConfig } from '../../shared/contracts';
import { AppError } from '../../shared/errors';
import type { Store } from '../storage/store';
import { executablePath, workingDirectory } from '../security/paths';
import { pathIdentity } from '../security/paths';
import { inspectScript } from '../security/scripts';
import { recipeSchema } from '../../shared/schemas';
import path from 'node:path';

const configSchema = z.object({
  id: z.uuid().optional(), projectId: z.uuid(),
  label: z.string().trim().min(1).max(60).regex(/^[^\x00-\x1f\x7f]+$/),
  executablePath: z.string().min(1).max(32767),
  args: z.array(z.string().max(8192).refine((value) => !value.includes('\0'))).max(64),
  workingDir: z.string().min(1).max(32767),
  recipe: recipeSchema.optional(),
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
    if (config.recipe) {
      const recipe = config.recipe;
      const tool = path.basename(executable).toLowerCase();
      if (recipe.kind === 'node-script' ? tool !== 'node.exe' : !/^python(?:3(?:\.\d+)?)?\.exe$/.test(tool)) throw new AppError('EXE_INVALID', `Choose the ${recipe.kind === 'node-script' ? 'Node.js (node.exe)' : 'Python (python.exe)'} executable for this guided setup. Use Advanced executable for other programs.`);
      let prefix: string[];
      if (recipe.kind === 'python-module') {
        // Isolate module lookup so a project's http.py cannot replace stdlib http.server.
        prefix = ['-I', '-u', '-m', 'http.server', String(recipe.port), '--bind', '127.0.0.1'];
        if (config.args.length !== prefix.length) throw new AppError('INVALID_CONFIG', 'Review the local HTTP server setup. Only its validated port can be changed.');
      } else {
        const selected = await inspectScript(project.path, recipe.script.path, recipe.kind === 'python-script' ? 'python' : 'node');
        if (pathIdentity(selected.path) !== pathIdentity(recipe.script.path) || selected.fingerprint !== recipe.script.fingerprint) throw new AppError('SCRIPT_CHANGED', 'The script changed after selection or Save. Choose it again and review the launch setup before running.', true);
        prefix = recipe.kind === 'python-script' ? ['-u', selected.path] : [selected.path];
      }
      if (prefix.some((arg, index) => config.args[index] !== arg)) throw new AppError('INVALID_CONFIG', 'The arguments do not match the guided setup. Review the script and generated arguments before saving.');
    }
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
