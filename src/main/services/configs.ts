import { z } from 'zod';
import type { RunConfig, SaveRunConfig, ScriptReview } from '../../shared/contracts';
import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors';
import type { Store } from '../storage/store';
import { executablePath, workingDirectory } from '../security/paths';
import { pathIdentity } from '../security/paths';
import { inspectScript, reviewScriptContents } from '../security/scripts';
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
type ReviewSummary = Omit<ScriptReview, 'content'>;
interface ReviewTicket { configSnapshot: string; expires: number; summary: ReviewSummary }
const configSnapshot = (config: RunConfig) => createHash('sha256').update(JSON.stringify(config)).digest('hex');
const staleReview = () => new AppError('SCRIPT_REVIEW_EXPIRED', 'This review is no longer current. Review the script again before authorizing it.', true);

export class ConfigService {
  private reviews = new Map<string, ReviewTicket>();
  constructor(private store: Store, private isActive: (configId: string) => boolean) {}
  list(projectId: string) { return this.store.listConfigs(projectId); }
  get(id: string) { return this.store.getConfig(id); }
  async reviewScript(id: string): Promise<ScriptReview> {
    const config = this.get(id);
    this.assertEditable(id);
    if (!config.recipe || config.recipe.kind === 'python-module') throw new AppError('INVALID_CONFIG', 'This setup does not contain a guided script to review.');
    const project = this.store.getProject(config.projectId);
    const snapshot = await reviewScriptContents(project.path, config.recipe.script.path, config.recipe.kind === 'python-script' ? 'python' : 'node');
    // Redirecting the saved path requires a fresh native file selection, even inside the project.
    if (pathIdentity(snapshot.script.path) !== pathIdentity(config.recipe.script.path)) throw new AppError('SCRIPT_CHANGED', 'The saved script path now points to another file. Use Edit setup to select it again.', true);
    this.assertUnchanged(config);
    const now = Date.now();
    for (const [token, ticket] of this.reviews) if (ticket.expires <= now || ticket.summary.configId === id) this.reviews.delete(token);
    while (this.reviews.size >= 20) this.reviews.delete(this.reviews.keys().next().value!);
    const expires = now + 5 * 60 * 1000;
    const summary: ReviewSummary = { token: randomUUID(), configId: id, label: config.label, scriptPath: snapshot.script.path, previousFingerprint: config.recipe.script.fingerprint, fingerprint: snapshot.script.fingerprint, byteLength: snapshot.byteLength, changed: config.recipe.script.fingerprint !== snapshot.script.fingerprint, expiresAt: new Date(expires).toISOString() };
    // Keep only metadata and a config digest; source content never enters persistence or this cache.
    this.reviews.set(summary.token, { configSnapshot: configSnapshot(config), expires, summary });
    return { ...summary, content: snapshot.content };
  }
  async authorizeScript(id: string, token: string, confirm: (review: ReviewSummary) => Promise<boolean>): Promise<RunConfig | null> {
    const ticket = this.reviews.get(token);
    if (!ticket || ticket.summary.configId !== id || ticket.expires <= Date.now()) throw staleReview();
    // Claim synchronously: one confirmation attempt per token, including Cancel and failures.
    this.reviews.delete(token);
    const config = this.get(id);
    this.assertEditable(id);
    if (configSnapshot(config) !== ticket.configSnapshot || !config.recipe || config.recipe.kind === 'python-module') throw staleReview();
    if (!await confirm({ ...ticket.summary })) return null;
    this.assertUnchanged(config);
    if (ticket.expires <= Date.now()) throw staleReview();
    const updated = { ...config, recipe: { ...config.recipe, script: { path: ticket.summary.scriptPath, fingerprint: ticket.summary.fingerprint } } };
    // Recheck containment, interpreter, cwd, the full script hash and generated argv after confirmation.
    const validated = await this.validate(updated);
    if (pathIdentity(validated.executablePath) !== pathIdentity(config.executablePath) || pathIdentity(validated.workingDir) !== pathIdentity(config.workingDir)) {
      throw new AppError('PATH_CHANGED', 'A saved launch path now points somewhere else. Use Edit setup to choose it again; the script was not authorized.', true);
    }
    this.assertUnchanged(config);
    if (ticket.expires <= Date.now()) throw staleReview();
    return this.store.saveConfig(validated);
  }
  private assertEditable(id: string) { if (this.isActive(id)) throw new AppError('CONFIG_RUNNING', 'Stop this configuration before editing it.'); }
  private assertUnchanged(config: RunConfig) {
    this.assertEditable(config.id);
    if (configSnapshot(this.get(config.id)) !== configSnapshot(config)) throw staleReview();
  }
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
        if (pathIdentity(selected.path) !== pathIdentity(recipe.script.path) || selected.fingerprint !== recipe.script.fingerprint) throw new AppError('SCRIPT_CHANGED', 'This script changed since you saved its setup. Use Review changes and authorize to inspect the current version. Nothing was started.', true);
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
