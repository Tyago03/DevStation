import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, symlink, realpath, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createServices, type Services } from '../../src/main/services';
import { findTool, runCommand } from '../../src/main/services/command';
import { GitService } from '../../src/main/services/git';
import { Store } from '../../src/main/storage/store';
import { workingDirectory } from '../../src/main/security/paths';

let temporary: string;
let repository: string;
let services: Services | undefined;
const gitExecutable = await findTool(process.platform === 'win32' ? 'git.exe' : 'git');

async function git(args: string[]) {
  if (!gitExecutable) throw new Error('Integration tests require Git');
  const result = await runCommand(gitExecutable, ['-C', repository, ...args]);
  if (result.code !== 0) throw new Error(`Fixture Git command failed: ${args[0]}: ${result.stderr}`);
  return result.stdout;
}

async function waitFor(check: () => boolean, timeout = 6000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error('Timed out waiting for fixture process');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

beforeEach(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'devstation-tests-'));
  repository = path.join(temporary, 'Café workspace & literal');
  await mkdir(repository);
  // Windows runners may expose TEMP through an 8.3 alias (RUNNER~1).
  // Stored project roots and direct Git inspection both use canonical paths.
  repository = await realpath(repository);
  await git(['init', '-b', 'main']);
  await git(['config', 'user.name', 'DevStation Fixture']);
  await git(['config', 'user.email', 'fixture@example.invalid']);
  services = createServices(path.join(temporary, 'data', 'devstation.sqlite'));
});

afterEach(async () => {
  if (services) { await services.runs.stopAll(); services.store.close(); services = undefined; }
  const resolved = path.resolve(temporary);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('devstation-tests-')) throw new Error('Refusing unsafe cleanup');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('real repository and SQLite catalog', () => {
  it('imports subfolders, detects duplicates, persists settings/configs, removes metadata only', async () => {
    const app = services!;
    const subfolder = path.join(repository, 'src'); await mkdir(subfolder);
    const project = await app.projects.add(subfolder);
    expect(project.path).toBe(repository);
    await expect(app.projects.add(repository)).rejects.toMatchObject({ code: 'PROJECT_DUPLICATE' });
    const config = await app.configs.save({ projectId: project.id, label: 'Example', executablePath: process.execPath, args: ['--version'], workingDir: repository });
    expect(app.runs.list()).toEqual([]);
    app.store.updateSettings({ theme: 'light' });
    app.store.close(); services = createServices(path.join(temporary, 'data', 'devstation.sqlite'));
    expect(services.projects.list()).toEqual([project]);
    expect(services.configs.list(project.id)).toEqual([config]);
    expect(services.store.getSettings()).toEqual({ theme: 'light' });
    services.projects.remove(project.id);
    expect(services.projects.list()).toEqual([]);
    expect(existsSync(path.join(repository, '.git'))).toBe(true);
  });
  it('resolves junction duplicates and rejects cwd escape through a junction', async () => {
    const app = services!;
    const project = await app.projects.add(repository);
    const alias = path.join(temporary, 'alias'); await symlink(repository, alias, 'junction');
    await expect(app.projects.add(alias)).rejects.toMatchObject({ code: 'PROJECT_DUPLICATE' });
    const outside = path.join(temporary, 'outside'); await mkdir(outside);
    const escaped = path.join(repository, 'escaped'); await symlink(outside, escaped, 'junction');
    await expect(workingDirectory(project.path, escaped)).rejects.toMatchObject({ code: 'INVALID_CWD' });
  });
  it('rejects non-repositories and reports disappeared folders without deleting catalog entries', async () => {
    const app = services!;
    const invalid = path.join(temporary, 'invalid-worktree'); await mkdir(invalid);
    // A malformed Git marker prevents discovery of any ancestor/user repository.
    await writeFile(path.join(invalid, '.git'), 'synthetic invalid gitfile');
    await expect(app.projects.add(invalid)).rejects.toMatchObject({ code: 'NOT_GIT_REPO' });
    const project = await app.projects.add(repository);
    await rm(repository, { recursive: true });
    await expect(app.git.overview(project.path)).rejects.toMatchObject({ code: 'PATH_MISSING' });
    expect(app.projects.list()).toHaveLength(1);
  });
  it('distinguishes unborn, clean, dirty, staged, renamed and detached repositories', async () => {
    const app = services!;
    expect(await app.git.overview(repository)).toMatchObject({ branch: 'main', isUnborn: true, isDetached: false, dirty: false, lastCommit: null });
    await writeFile(path.join(repository, 'original.txt'), 'one');
    await git(['add', '.']); await git(['commit', '-m', 'Initial fixture']);
    expect(await app.git.overview(repository)).toMatchObject({ dirty: false, lastCommit: { subject: 'Initial fixture' } });
    await git(['mv', 'original.txt', 'renamed file.txt']);
    await writeFile(path.join(repository, 'renamed file.txt'), 'two');
    await writeFile(path.join(repository, '日本語.txt'), 'literal');
    expect(await app.git.overview(repository)).toMatchObject({ staged: 1, modified: 1, untracked: 1, dirty: true });
    await git(['checkout', '--detach']);
    expect(await app.git.overview(repository)).toMatchObject({ branch: null, isDetached: true, isUnborn: false });
  });
  it('does not refresh the index or execute a configured fsmonitor hook', async () => {
    const app = services!;
    await writeFile(path.join(repository, 'tracked.txt'), 'one'); await git(['add', '.']); await git(['commit', '-m', 'fixture']);
    const marker = path.join(repository, 'fsmonitor-triggered');
    const hook = path.join(repository, '.git', 'fsmonitor-fixture');
    await writeFile(hook, '#!/bin/sh\necho invoked > fsmonitor-triggered\n', { mode: 0o755 });
    await git(['config', 'core.fsmonitor', `"${hook.replaceAll('\\', '/')}"`]);
    await git(['status', '--porcelain']);
    expect(existsSync(marker)).toBe(true);
    await rm(marker);
    const index = await readFile(path.join(repository, '.git', 'index'));
    await writeFile(path.join(repository, 'tracked.txt'), 'two');
    await app.git.overview(repository);
    expect(existsSync(marker)).toBe(false);
    expect(await readFile(path.join(repository, '.git', 'index'))).toEqual(index);
  });
  it('handles unavailable Git and never mutates trust configuration', async () => {
    await expect(new GitService(path.join(temporary, 'missing-git.exe')).overview(repository)).rejects.toMatchObject({ code: 'TOOL_UNAVAILABLE' });
  });
  it('refuses ancestor Git inspection after an imported nested repository loses its .git marker', async () => {
    const app = services!;
    await writeFile(path.join(repository, 'parent.txt'), 'ancestor fixture'); await git(['add', '.']); await git(['commit', '-m', 'parent fixture']);
    const nested = path.join(repository, 'nested'); await mkdir(nested);
    expect((await runCommand(gitExecutable!, ['init', '-b', 'main', nested])).code).toBe(0);
    const project = await app.projects.add(nested);
    expect(await app.git.overview(project.path)).toMatchObject({ isUnborn: true });
    const parentIndex = await readFile(path.join(repository, '.git', 'index'));
    await rm(path.join(nested, '.git'), { recursive: true });
    await expect(app.git.overview(project.path)).rejects.toMatchObject({ code: 'NOT_GIT_REPO', message: expect.stringContaining('no longer the Git working tree you added') });
    expect(app.projects.get(project.id)).toEqual(project);
    expect(await readFile(path.join(repository, '.git', 'index'))).toEqual(parentIndex);
  });
  it('preserves a corrupt database and creates a backup before a failing migration', async () => {
    const corrupt = path.join(temporary, 'corrupt.sqlite');
    await writeFile(corrupt, 'synthetic invalid database');
    expect(() => new Store(corrupt)).toThrow();
    expect(await readFile(corrupt, 'utf8')).toBe('synthetic invalid database');
    const legacy = path.join(temporary, 'legacy.sqlite');
    const legacyDb = new Database(legacy); legacyDb.exec('CREATE TABLE projects (id TEXT)'); legacyDb.close();
    expect(() => new Store(legacy)).toThrow();
    expect((await readdir(temporary)).some((file) => file.startsWith('legacy.sqlite.backup-'))).toBe(true);
    const unchanged = new Database(legacy); expect(unchanged.pragma('user_version', { simple: true })).toBe(0); unchanged.close();
  });
});

describe('explicit session-owned processes', () => {
  it('passes metacharacter arguments literally, streams stdout/stderr and records exit code', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const args = ['&', '|', ';', '"quoted"', '<script>alert(1)</script>', 'café 日本語'];
    const config = await app.configs.save({ projectId: project.id, label: 'Arguments', executablePath: process.execPath, args: ['-e', 'console.log(JSON.stringify(process.argv.slice(1))); console.error("stderr"); process.exitCode=7', ...args], workingDir: repository });
    const run = await app.runs.start(config.id);
    await waitFor(() => app.runs.get(run.id).state === 'exited');
    expect(app.runs.get(run.id)).toMatchObject({ exitCode: 7 });
    const logs = app.runs.logs(run.id).lines;
    expect(JSON.parse(logs.find((line) => line.stream === 'stdout')!.line)).toEqual(args);
    expect(logs.some((line) => line.stream === 'stderr' && line.line === 'stderr')).toBe(true);
  });
  it('revalidates cwd/executable and rejects shell wrappers', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const input = { projectId: project.id, label: 'Invalid', executablePath: process.execPath, args: [], workingDir: temporary };
    await expect(app.configs.save(input)).rejects.toMatchObject({ code: 'INVALID_CWD' });
    await expect(app.configs.save({ ...input, workingDir: repository, executablePath: path.join(repository, 'npm.cmd') })).rejects.toMatchObject({ code: 'EXE_INVALID' });
    await expect(app.configs.save({ ...input, workingDir: repository, executablePath: path.join(repository, 'missing.exe') })).rejects.toMatchObject({ code: 'EXE_NOT_FOUND' });
    const subfolder = path.join(repository, 'run'); await mkdir(subfolder);
    const config = await app.configs.save({ ...input, workingDir: subfolder });
    await rm(subfolder, { recursive: true }); await symlink(temporary, subfolder, 'junction');
    await expect(app.runs.start(config.id)).rejects.toMatchObject({ code: 'INVALID_CWD' });
  });
  it('fails safely when a saved executable disappears before Start', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const selectedExecutable = path.join(temporary, 'selected-node.exe');
    await copyFile(process.execPath, selectedExecutable);
    const config = await app.configs.save({ projectId: project.id, label: 'Removed executable', executablePath: selectedExecutable, args: ['--version'], workingDir: repository });
    expect(app.runs.list()).toEqual([]);
    await rm(selectedExecutable);
    await expect(app.runs.start(config.id)).rejects.toMatchObject({ code: 'EXE_NOT_FOUND' });
    expect(app.runs.active()).toEqual([]);
    expect(app.runs.list()[0]).toMatchObject({ state: 'failed', configId: config.id });
    expect(app.runs.list()[0].pid).toBeUndefined();
  });
  it('assembles fragmented stdout/stderr, ANSI, Unicode and a final line without a newline', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const input = Buffer.from('hello \x1b[31mCafé 日本語 🙂\x1b[0m\n\nlast \x1b]0;hidden title\x07line without newline');
    const script = `const bytes=Buffer.from(${JSON.stringify(input.toString('base64'))},'base64');let index=0;const timer=setInterval(()=>{if(index<bytes.length){process.stdout.write(bytes.subarray(index,index+1));index+=1;}else{clearInterval(timer);process.stderr.write('err');setTimeout(()=>process.stderr.write('or tail'),20);}},4);`;
    const config = await app.configs.save({ projectId: project.id, label: 'Fragmented output', executablePath: process.execPath, args: ['-e', script], workingDir: repository });
    const run = await app.runs.start(config.id);
    await waitFor(() => app.runs.get(run.id).state === 'exited' && app.runs.logs(run.id).lines.some(line => line.line === 'error tail'));
    const lines = app.runs.logs(run.id).lines;
    const stdout = lines.filter(line => line.stream === 'stdout').map(line => line.line);
    // Slow delivery may produce bounded-latency segments before a newline arrives.
    expect(stdout.join('')).toBe('hello Café 日本語 🙂last line without newline');
    expect(stdout.filter(line => line === '')).toHaveLength(1);
    expect(lines.filter(line => line.stream === 'stderr').map(line => line.line)).toEqual(['error tail']);
  });
  it('shows output from a live process that never writes a newline', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const config = await app.configs.save({ projectId: project.id, label: 'Partial live output', executablePath: process.execPath, args: ['-e', 'process.stdout.write("Server ready");setInterval(()=>{},1000)'], workingDir: repository });
    const run = await app.runs.start(config.id);
    await waitFor(() => app.runs.logs(run.id).lines.some(line => line.line === 'Server ready'), 2000);
    expect(app.runs.get(run.id).state).toBe('running');
    expect((await app.runs.stop(run.id)).state).toBe('exited');
  });
  it('enforces concurrent-start limits, blocks active edits, and stops owned handles only', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const config = await app.configs.save({ projectId: project.id, label: 'Persistent', executablePath: process.execPath, args: ['-e', 'console.log("ready");setInterval(()=>{},1000)'], workingDir: repository });
    const starts = await Promise.allSettled([app.runs.start(config.id), app.runs.start(config.id), app.runs.start(config.id)]);
    expect(starts.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(starts.filter((result) => result.status === 'rejected')[0]).toMatchObject({ reason: { code: 'RUN_LIMIT' } });
    expect(() => app.configs.delete(config.id)).toThrow();
    expect(() => app.projects.remove(project.id)).toThrow();
    await expect(app.configs.save(config)).rejects.toMatchObject({ code: 'CONFIG_RUNNING' });
    await expect(app.runs.stop('12345')).rejects.toMatchObject({ code: 'RUN_NOT_FOUND' });
    expect(app.runs.active()).toHaveLength(2);
    const stopped = await app.runs.stopAll();
    expect(stopped.every((run) => run.state === 'exited')).toBe(true);
    expect(stopped.every((run) => run.warning?.includes('Child processes'))).toBe(true);
  });
  it('reserves the global five-task limit across projects before filesystem awaits', async () => {
    const app = services!;
    const configs = [];
    for (let index = 0; index < 3; index += 1) {
      const directory = path.join(temporary, `global-limit-${index}`); await mkdir(directory);
      const initialized = await runCommand(gitExecutable!, ['init', '-b', 'main', directory]);
      expect(initialized.code).toBe(0);
      const project = await app.projects.add(directory);
      configs.push(await app.configs.save({ projectId: project.id, label: `Persistent ${index}`, executablePath: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'], workingDir: directory }));
    }
    const results = await Promise.allSettled(configs.flatMap((config) => [app.runs.start(config.id), app.runs.start(config.id)]));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([{ status: 'rejected', reason: expect.objectContaining({ code: 'RUN_LIMIT' }) }]);
  });
  it.runIf(process.platform === 'win32')('finds a real Python HTTP server and releases its loopback port after stop', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const python = await findTool('python.exe');
    expect(python, 'Windows integration requires Python on PATH').not.toBeNull();
    const config = await app.configs.save({ projectId: project.id, label: 'Local Python HTTP server', executablePath: python!, args: ['-m', 'http.server', '0', '--bind', '127.0.0.1'], workingDir: repository });
    const run = await app.runs.start(config.id);
    await waitFor(() => app.runs.logs(run.id).lines.some((line) => /Serving HTTP.*port \d+/.test(line.line)));
    const log = app.runs.logs(run.id).lines.find((line) => /Serving HTTP/.test(line.line))!;
    const port = Number(log.line.match(/port (\d+)/)![1]);
    const inspected = await app.ports.list();
    expect(inspected.ports).toContainEqual({ protocol: 'tcp', address: '127.0.0.1', port, pid: run.pid, visibility: 'loopback' });
    const response = await fetch(`http://127.0.0.1:${port}/`); expect(response.status).toBe(200);
    await response.text();
    await waitFor(() => app.runs.logs(run.id).lines.some((line) => line.stream === 'stderr' && line.line.includes('GET /')));
    expect((await app.runs.stop(run.id)).state).toBe('exited');
    expect((await app.ports.list()).ports.some((entry) => entry.port === port && entry.pid === run.pid)).toBe(false);
  });
  it('caps actual 3 MB output and strips ANSI without interpreting HTML', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const config = await app.configs.save({ projectId: project.id, label: 'Output flood', executablePath: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(3*1024*1024));console.log("\\n\\x1b[31m<script>literal</script>\\x1b[0m")'], workingDir: repository });
    const run = await app.runs.start(config.id); await waitFor(() => app.runs.get(run.id).state === 'exited');
    const logs = app.runs.logs(run.id);
    expect(logs.truncated).toBe(true);
    expect(logs.lines.reduce((total, line) => total + Buffer.byteLength(line.line), 0)).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(logs.lines.at(-1)!.line).toBe('<script>literal</script>');
  });
  it('marks the parent exited even while a descendant holds inherited output pipes', async () => {
    const app = services!; const project = await app.projects.add(repository);
    const script = 'const {spawn}=require("node:child_process");const child=spawn(process.execPath,["-e","setTimeout(()=>{},1800)"],{stdio:"inherit",windowsHide:true});child.unref();console.log("parent done");process.exit(0)';
    const config = await app.configs.save({ projectId: project.id, label: 'Parent exits first', executablePath: process.execPath, args: ['-e', script], workingDir: repository });
    const run = await app.runs.start(config.id);
    try {
      await waitFor(() => app.runs.get(run.id).state === 'exited', 1000);
      expect(app.runs.get(run.id)).toMatchObject({ exitCode: 0, warning: expect.stringContaining('Child processes may still be running') });
      expect((await app.runs.stop(run.id)).state).toBe('exited');
    } finally {
      // This synthetic descendant exits on its own; never kill an unowned PID.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  });
  it('times out and bounds command output without a shell', async () => {
    await expect(runCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 100 })).rejects.toMatchObject({ code: 'OP_TIMEOUT' });
    await expect(runCommand(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], { maxBytes: 100 })).rejects.toMatchObject({ code: 'OUTPUT_LIMIT' });
  });
});
