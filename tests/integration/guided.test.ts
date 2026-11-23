import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { access, mkdtemp, mkdir, writeFile, rm, readdir, symlink, realpath } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createServices, type Services } from '../../src/main/services';
import { findTool, runCommand } from '../../src/main/services/command';
import { inspectScript } from '../../src/main/security/scripts';
import { Store } from '../../src/main/storage/store';
import type { RunRecipe } from '../../src/shared/contracts';

let root: string; let repository: string; let services: Services;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-guided-'));
  await mkdir(path.join(root, 'Café project')); repository = await realpath(path.join(root, 'Café project'));
  const git = await findTool('git.exe'); expect(git).toBeTruthy();
  expect((await runCommand(git!, ['init', '-b', 'main', repository])).code).toBe(0);
  services = createServices(path.join(root, 'profile', 'devstation.sqlite'));
});
afterEach(async () => {
  if (services) { await services.runs.stopAll(); services.store.close(); }
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('DevStation-guided-')) throw new Error('Refusing unsafe cleanup.');
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
});
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 8000;
  while (!check()) { if (Date.now() > deadline) throw new Error('Timed out waiting for owned task.'); await new Promise(resolve => setTimeout(resolve, 25)); }
}

describe('guided Python and Node tasks', () => {
  it.each(['python', 'node'] as const)('saves %s without execution, preserves literal argv, and refuses a changed script before Start', async kind => {
    const project = await services.projects.add(repository);
    const file = path.join(repository, kind === 'python' ? 'example.py' : 'example.mjs');
    await writeFile(file, kind === 'python' ? 'import sys,json\nprint(json.dumps(sys.argv[1:]), flush=True)\n' : 'console.log(JSON.stringify(process.argv.slice(2)));\n');
    const script = await inspectScript(project.path, file, kind);
    const executablePath = kind === 'python' ? await findTool('python.exe') : process.execPath;
    expect(executablePath).toBeTruthy();
    const extra = ['&', '|', ';', 'Café 日本語', 'two words'];
    const recipe: RunRecipe = { kind: kind === 'python' ? 'python-script' : 'node-script', script };
    const config = await services.configs.save({ projectId: project.id, label: `${kind} script`, executablePath: executablePath!, workingDir: project.path, args: [...(kind === 'python' ? ['-u', file] : [file]), ...extra], recipe });
    expect(services.runs.list()).toEqual([]);
    expect(services.configs.get(config.id).recipe).toEqual(recipe);
    const run = await services.runs.start(config.id);
    await waitFor(() => services.runs.get(run.id).state === 'exited' && services.runs.logs(run.id).lines.length > 0);
    expect(services.runs.get(run.id).exitCode).toBe(0);
    expect(JSON.parse(services.runs.logs(run.id).lines[0].line)).toEqual(extra);
    await writeFile(file, 'changed after saving');
    await expect(services.runs.start(config.id)).rejects.toMatchObject({ code: 'SCRIPT_CHANGED' });
    expect(services.runs.active()).toEqual([]);
    expect(services.runs.list()[0].state).toBe('failed');
    expect(services.runs.list()[0].pid).toBeUndefined();
  });

  it('validates the exact local HTTP recipe, interpreter and port without shell fallbacks', async () => {
    const project = await services.projects.add(repository); const python = await findTool('python.exe'); expect(python).toBeTruthy();
    const input = { projectId: project.id, label: 'Local files', executablePath: python!, workingDir: project.path, args: ['-I', '-u', '-m', 'http.server', '8765', '--bind', '127.0.0.1'], recipe: { kind: 'python-module', module: 'http.server', port: 8765 } as const };
    const config = await services.configs.save(input);
    expect(config.args).toEqual(input.args); expect(services.runs.list()).toEqual([]);
    await expect(services.configs.save({ ...input, args: [...input.args.slice(0, -1), '0.0.0.0'] })).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
    await expect(services.configs.save({ ...input, args: [...input.args, '--directory', 'C:\\'] })).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
    await expect(services.configs.save({ ...input, executablePath: process.execPath })).rejects.toMatchObject({ code: 'EXE_INVALID' });
    await expect(services.configs.save({ ...input, recipe: { ...input.recipe, port: 80 } })).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
  });

  it('rejects selected scripts outside the project, junction escapes, wrong extensions and oversized files', async () => {
    const outside = path.join(root, 'outside'); await mkdir(outside); await writeFile(path.join(outside, 'secret.py'), 'not a project script');
    await expect(inspectScript(repository, path.join(outside, 'secret.py'), 'python')).rejects.toMatchObject({ code: 'INVALID_SCRIPT' });
    await symlink(outside, path.join(repository, 'linked'), 'junction');
    await expect(inspectScript(repository, path.join(repository, 'linked', 'secret.py'), 'python')).rejects.toMatchObject({ code: 'INVALID_SCRIPT' });
    await writeFile(path.join(repository, 'wrong.cmd'), 'synthetic');
    await expect(inspectScript(repository, path.join(repository, 'wrong.cmd'), 'node')).rejects.toMatchObject({ code: 'INVALID_SCRIPT' });
    await writeFile(path.join(repository, 'large.py'), Buffer.alloc(10 * 1024 * 1024 + 1, 32));
    await expect(inspectScript(repository, path.join(repository, 'large.py'), 'python')).rejects.toMatchObject({ code: 'INVALID_SCRIPT' });
  });

  it('runs the isolated standard-library HTTP template without importing a project module named http', async () => {
    const project = await services.projects.add(repository);
    const python = await findTool('python.exe'); expect(python).toBeTruthy();
    const marker = path.join(repository, 'module-shadow-ran.txt');
    await writeFile(path.join(repository, 'http.py'), 'from pathlib import Path\nPath(__file__).with_name("module-shadow-ran.txt").write_text("Unexpected project import", encoding="utf-8")\nraise RuntimeError("Project module must not replace the approved standard-library template")\n');
    await writeFile(path.join(repository, 'served.txt'), 'Synthetic local files only.\n');
    const reservation = createServer();
    await new Promise<void>((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
    const address = reservation.address();
    await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
    if (!address || typeof address === 'string') throw new Error('Could not reserve a synthetic loopback port.');
    const port = address.port;
    const config = await services.configs.save({
      projectId: project.id, label: 'Isolated standard-library server', executablePath: python!, workingDir: project.path,
      args: ['-I', '-u', '-m', 'http.server', String(port), '--bind', '127.0.0.1'],
      recipe: { kind: 'python-module', module: 'http.server', port },
    });
    expect(services.runs.list()).toEqual([]);
    expect(await access(marker).then(() => true, () => false)).toBe(false);
    const run = await services.runs.start(config.id);
    try {
      await waitFor(() => services.runs.logs(run.id).lines.some(line => line.line.includes('Serving HTTP on 127.0.0.1')) || services.runs.get(run.id).state === 'exited');
      expect(await access(marker).then(() => true, () => false)).toBe(false);
      expect(services.runs.get(run.id).state).toBe('running');
      expect((await services.ports.list()).ports).toEqual(expect.arrayContaining([expect.objectContaining({ port, pid: run.pid, address: '127.0.0.1', visibility: 'loopback' })]));
      const response = await fetch(`http://127.0.0.1:${port}/served.txt`, { signal: AbortSignal.timeout(3000) });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Synthetic local files only.\n');
    } finally {
      await services.runs.stop(run.id);
    }
    expect(services.runs.get(run.id).state).toBe('exited');
    expect((await services.ports.list()).ports.some(entry => entry.pid === run.pid && entry.port === port)).toBe(false);
    expect(await access(marker).then(() => true, () => false)).toBe(false);
  });
});

describe('v1 to v2 metadata migration', () => {
  it('backs up v1 and preserves old configurations; tour progress survives theme changes and restart', async () => {
    const legacy = path.join(root, 'legacy.sqlite');
    const database = new Database(legacy);
    database.exec(`CREATE TABLE projects (id TEXT PRIMARY KEY, display_name TEXT, canonical_path TEXT, path_identity TEXT UNIQUE, added_at TEXT);
      CREATE TABLE run_configs (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), display_name TEXT, executable_path TEXT, args_json TEXT, working_dir TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE settings (key TEXT PRIMARY KEY, json_value TEXT); CREATE TABLE migrations(version INTEGER PRIMARY KEY, applied_at TEXT);
      INSERT INTO migrations VALUES (1,'2026-11-21'); PRAGMA user_version=1;`);
    database.prepare('INSERT INTO projects VALUES(?,?,?,?,?)').run('old-project', 'Legacy', repository, repository.toLowerCase(), '2026-11-21');
    database.prepare('INSERT INTO run_configs VALUES(?,?,?,?,?,?,?,?)').run('old-config', 'old-project', 'Existing task', process.execPath, '["--version"]', repository, '2026-11-21', '2026-11-21');
    database.close();
    let store = new Store(legacy);
    expect(store.getConfig('old-config')).toMatchObject({ label: 'Existing task', args: ['--version'] });
    expect(store.getConfig('old-config').recipe).toBeUndefined();
    store.updateSettings({ theme: 'dark', tour: { status: 'in-progress', step: 2 } });
    store.updateSettings({ theme: 'light' }); store.close();
    store = new Store(legacy);
    expect(store.getSettings()).toEqual({ theme: 'light', tour: { status: 'in-progress', step: 2 } }); store.close();
    const backups = (await readdir(root)).filter(name => name.startsWith('legacy.sqlite.backup-')); expect(backups).toHaveLength(1);
    const backup = new Database(path.join(root, backups[0]), { readonly: true });
    expect(backup.pragma('user_version', { simple: true })).toBe(1);
    expect(backup.prepare('SELECT COUNT(*) AS count FROM run_configs').get()).toEqual({ count: 1 }); backup.close();
  });
});
