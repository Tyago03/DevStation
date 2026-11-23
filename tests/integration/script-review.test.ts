import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createServices, type Services } from '../../src/main/services';
import { inspectScript } from '../../src/main/security/scripts';
import type { Project } from '../../src/shared/contracts';

let root: string; let repository: string; let services: Services; let project: Project;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-review-'));
  await mkdir(path.join(root, 'Review Café'));
  repository = await realpath(path.join(root, 'Review Café'));
  services = createServices(path.join(root, 'profile', 'devstation.sqlite'));
  // This fixture tests the configuration boundary; Git import has separate integration coverage.
  project = services.store.addProject(repository);
});
afterEach(async () => {
  vi.restoreAllMocks();
  if (services) { await services.runs.stopAll(); services.store.close(); }
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('DevStation-review-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
});
async function setup(source = 'console.log("first version");\n') {
  const directory = path.join(repository, 'scripts'); await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'task.mjs'); await writeFile(file, source);
  const script = await inspectScript(repository, file, 'node');
  const config = await services.configs.save({ projectId: project.id, label: 'Reviewed Node task', executablePath: process.execPath, workingDir: repository, args: [file, 'literal & argument'], recipe: { kind: 'node-script', script } });
  return { file, config };
}
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 5000;
  while (!check()) { if (Date.now() > deadline) throw new Error('Owned task did not exit.'); await new Promise(resolve => setTimeout(resolve, 20)); }
}

describe('review and authorize the configured Node script', () => {
  it('previews exact current bytes, authorizes only after confirmation, persists the new hash and never auto-runs', async () => {
    const { file, config } = await setup();
    const marker = path.join(repository, 'explicit-start-only.txt');
    const current = `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(marker)}, 'authorized v2');\nconsole.log('Café 日本語 🙂 <script>text</script>');\n`;
    await writeFile(file, current);
    const preview = await services.configs.reviewScript(config.id);
    expect(preview).toMatchObject({ configId: config.id, label: config.label, scriptPath: file, content: current, changed: true, byteLength: Buffer.byteLength(current), fingerprint: createHash('sha256').update(current).digest('hex') });
    expect(services.configs.get(config.id)).toEqual(config);
    expect(services.runs.list()).toEqual([]);
    const approved = await services.configs.authorizeScript(config.id, preview.token, async summary => {
      expect(summary).not.toHaveProperty('content');
      expect(summary.fingerprint).toBe(preview.fingerprint);
      expect(services.configs.get(config.id)).toEqual(config);
      expect(await readFile(marker).then(() => true, () => false)).toBe(false);
      return true;
    });
    expect(approved).toEqual({ ...config, recipe: { kind: 'node-script', script: { path: file, fingerprint: preview.fingerprint } } });
    expect(services.runs.list()).toEqual([]);
    expect(await readFile(marker).then(() => true, () => false)).toBe(false);
    services.store.close(); services = createServices(path.join(root, 'profile', 'devstation.sqlite'));
    expect(services.configs.get(config.id)).toEqual(approved);
    const run = await services.runs.start(config.id);
    await waitFor(() => services.runs.get(run.id).state === 'exited');
    expect(services.runs.get(run.id)).toMatchObject({ exitCode: 0, exitReason: 'completed' });
    expect(await readFile(marker, 'utf8')).toBe('authorized v2');
  });

  it('consumes Cancel without changing the configuration, and rejects token replay', async () => {
    const { file, config } = await setup(); await writeFile(file, 'console.log("changed");');
    const preview = await services.configs.reviewScript(config.id);
    expect(await services.configs.authorizeScript(config.id, preview.token, async () => false)).toBeNull();
    expect(services.configs.get(config.id)).toEqual(config); expect(services.runs.list()).toEqual([]);
    const confirm = vi.fn(async () => true);
    await expect(services.configs.authorizeScript(config.id, preview.token, confirm)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('rejects forged and cross-configuration tokens before confirmation', async () => {
    const { config } = await setup();
    const other = await services.configs.save({ ...config, id: undefined, label: 'Other task' });
    const preview = await services.configs.reviewScript(config.id); const confirm = vi.fn(async () => true);
    await expect(services.configs.authorizeScript(config.id, randomUUID(), confirm)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    await expect(services.configs.authorizeScript(other.id, preview.token, confirm)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    expect(confirm).not.toHaveBeenCalled(); expect(services.configs.get(config.id)).toEqual(config);
  });

  it.each(['before confirmation', 'during confirmation'] as const)('rejects a further file change %s and preserves the saved approval', async when => {
    const { file, config } = await setup(); await writeFile(file, 'console.log("reviewed v2");');
    const preview = await services.configs.reviewScript(config.id);
    if (when === 'before confirmation') await writeFile(file, 'console.log("unreviewed v3");');
    await expect(services.configs.authorizeScript(config.id, preview.token, async () => {
      if (when === 'during confirmation') await writeFile(file, 'console.log("unreviewed v3");');
      return true;
    })).rejects.toMatchObject({ code: 'SCRIPT_CHANGED' });
    expect(services.configs.get(config.id)).toEqual(config); expect(services.runs.list()).toEqual([]);
  });

  it.each(['before confirmation', 'during confirmation'] as const)('rejects a configuration mutation %s without overwriting newer settings', async when => {
    const { config } = await setup(); const preview = await services.configs.reviewScript(config.id);
    const edit = async () => services.configs.save({ ...config, label: 'A newer saved name' });
    if (when === 'before confirmation') await edit();
    const confirm = vi.fn(async () => { if (when === 'during confirmation') await edit(); return true; });
    await expect(services.configs.authorizeScript(config.id, preview.token, confirm)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    if (when === 'before confirmation') expect(confirm).not.toHaveBeenCalled();
    expect(services.configs.get(config.id).label).toBe('A newer saved name');
  });

  it.each(['before confirmation', 'during confirmation'] as const)('expires tokens %s without authorizing', async when => {
    const { config } = await setup(); const preview = await services.configs.reviewScript(config.id);
    const actualNow = Date.now();
    const expire = () => vi.spyOn(Date, 'now').mockReturnValue(actualNow + 6 * 60 * 1000);
    if (when === 'before confirmation') expire();
    const confirm = vi.fn(async () => { if (when === 'during confirmation') expire(); return true; });
    await expect(services.configs.authorizeScript(config.id, preview.token, confirm)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    if (when === 'before confirmation') expect(confirm).not.toHaveBeenCalled();
    expect(services.configs.get(config.id)).toEqual(config);
  });

  it('invalidates an earlier preview and bounds retained tokens to twenty', async () => {
    const { config } = await setup();
    const original = await services.configs.reviewScript(config.id);
    const current = await services.configs.reviewScript(config.id);
    await expect(services.configs.authorizeScript(config.id, original.token, async () => true)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
    for (let index = 0; index < 20; index += 1) {
      const additional = await services.configs.save({ ...config, id: undefined, label: `Task ${index}` });
      await services.configs.reviewScript(additional.id);
    }
    await expect(services.configs.authorizeScript(config.id, current.token, async () => true)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_EXPIRED' });
  });

  it('rejects authorization if the configuration starts while the preview is open', async () => {
    const { config } = await setup('setInterval(() => {}, 1000);\n');
    const preview = await services.configs.reviewScript(config.id);
    const run = await services.runs.start(config.id); const confirm = vi.fn(async () => true);
    await expect(services.configs.authorizeScript(config.id, preview.token, confirm)).rejects.toMatchObject({ code: 'CONFIG_RUNNING' });
    expect(confirm).not.toHaveBeenCalled();
    expect((await services.runs.stop(run.id)).exitReason).toBe('stopped-by-user');
  });

  it.each(['inside', 'outside'] as const)('rejects a saved script directory replaced by a junction pointing %s the project', async destination => {
    const { file, config } = await setup(); const preview = await services.configs.reviewScript(config.id);
    const target = path.join(destination === 'inside' ? repository : root, 'replacement'); await mkdir(target);
    // Keep identical bytes: canonical path binding must reject redirection independently of content.
    await writeFile(path.join(target, 'task.mjs'), preview.content);
    await rename(path.dirname(file), path.join(repository, 'original-scripts'));
    await symlink(target, path.dirname(file), 'junction');
    const code = destination === 'inside' ? 'SCRIPT_CHANGED' : 'INVALID_SCRIPT';
    await expect(services.configs.authorizeScript(config.id, preview.token, async () => true)).rejects.toMatchObject({ code });
    await expect(services.configs.reviewScript(config.id)).rejects.toMatchObject({ code });
    expect(services.configs.get(config.id)).toEqual(config); expect(services.runs.list()).toEqual([]);
  });

  it.each([Buffer.alloc(256 * 1024 + 1, 32), Buffer.from([0xff, 0xfe]), Buffer.from('text\0hidden')])('does not offer authorization for an incomplete or non-text preview', async bytes => {
    const { file, config } = await setup(); await writeFile(file, bytes);
    await expect(services.configs.reviewScript(config.id)).rejects.toMatchObject({ code: 'SCRIPT_REVIEW_UNAVAILABLE' });
    // The previous explicit file-picker size policy remains available; preview adds no silent truncation.
    expect((await inspectScript(repository, file, 'node')).fingerprint).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(services.configs.get(config.id)).toEqual(config); expect(services.runs.list()).toEqual([]);
  });

  it.each(['executable', 'working directory'] as const)('never silently authorizes a redirected %s while approving only the script', async changedPath => {
    const { config } = await setup();
    const selected = path.join(repository, 'selected'); const replacement = path.join(repository, 'replacement');
    await mkdir(selected); await mkdir(replacement);
    // Regular synthetic .exe files suffice for path validation; neither is ever executed.
    if (changedPath === 'executable') { await writeFile(path.join(selected, 'node.exe'), 'fixture original'); await writeFile(path.join(replacement, 'node.exe'), 'fixture replacement'); }
    const saved = await services.configs.save({ ...config, ...(changedPath === 'executable' ? { executablePath: path.join(selected, 'node.exe') } : { workingDir: selected }) });
    const preview = await services.configs.reviewScript(saved.id);
    await rename(selected, path.join(repository, 'original-selected'));
    await symlink(replacement, selected, 'junction');
    await expect(services.configs.authorizeScript(saved.id, preview.token, async () => true)).rejects.toMatchObject({ code: 'PATH_CHANGED' });
    expect(services.configs.get(saved.id)).toEqual(saved); expect(services.runs.list()).toEqual([]);
  });

  it('does not reuse approval if the script changes after authorization but before an explicit Start', async () => {
    const { file, config } = await setup(); await writeFile(file, 'console.log("reviewed v2");');
    const preview = await services.configs.reviewScript(config.id);
    await services.configs.authorizeScript(config.id, preview.token, async () => true);
    await writeFile(file, 'console.log("unreviewed v3");');
    await expect(services.runs.start(config.id)).rejects.toMatchObject({ code: 'SCRIPT_CHANGED' });
    expect(services.runs.list()[0]).toMatchObject({ state: 'failed' });
    expect(services.runs.list()[0].pid).toBeUndefined();
  });

  it('records a real nonzero Node exit as an error instead of Unknown', async () => {
    const { config } = await setup('process.exit(7);\n');
    const run = await services.runs.start(config.id);
    await waitFor(() => services.runs.get(run.id).state === 'exited');
    expect(services.runs.get(run.id)).toMatchObject({ state: 'exited', exitCode: 7, exitReason: 'error' });
  });
});
