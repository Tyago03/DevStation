import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import * as commands from '../../src/main/services/command';
import { GitService } from '../../src/main/services/git';
import { PortsService } from '../../src/main/services/ports';

// Injection exists only in this test module; production exposes no override IPC.
const runRealCommand = commands.runCommand;
let temporary: string;
beforeEach(async () => { temporary = await mkdtemp(path.join(os.tmpdir(), 'devstation-system-tests-')); });
afterEach(async () => {
  vi.restoreAllMocks();
  const resolved = path.resolve(temporary);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('devstation-system-tests-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('real system-tool failures and listener scope', () => {
  it('T20: preserves Git trust configuration when real Git rejects simulated different ownership', async () => {
    const git = await commands.findTool(process.platform === 'win32' ? 'git.exe' : 'git');
    expect(git).not.toBeNull();
    const config = path.join(temporary, 'isolated-gitconfig');
    await writeFile(config, '# Synthetic Git configuration. No safe.directory exceptions.\n');
    const isolated = { ...commands.localEnvironment(), GIT_CONFIG_GLOBAL: config, GIT_CONFIG_NOSYSTEM: '1' };
    const directory = path.join(temporary, 'unsafe-owner-fixture'); await mkdir(directory);
    const repository = await realpath(directory);
    expect((await runRealCommand(git!, ['init', '-b', 'main', repository], { env: isolated })).code).toBe(0);
    const globalBefore = await readFile(config);
    const localBefore = await readFile(path.join(repository, '.git', 'config'));
    // Git's own t/t0033-safe-directory.sh uses this test variable. No ACL or owner is changed.
    // https://github.com/git/git/blob/master/t/t0033-safe-directory.sh
    const unsafe = { ...isolated, GIT_TEST_ASSUME_DIFFERENT_OWNER: '1' };
    const refused = await runRealCommand(git!, ['-C', repository, 'status', '--porcelain'], { env: unsafe });
    expect(refused.code).not.toBe(0); expect(refused.stderr).toContain('dubious ownership');
    vi.spyOn(commands, 'runCommand').mockImplementation((executable, args, options = {}) => runRealCommand(executable, args, { ...options, env: unsafe }));
    await expect(new GitService(git!).overview(repository)).rejects.toMatchObject({ code: 'GIT_UNTRUSTED_REPO', message: expect.stringContaining('will not change your trust settings') });
    expect(await readFile(config)).toEqual(globalBefore);
    expect(await readFile(path.join(repository, '.git', 'config'))).toEqual(localBefore);
  });

  it.runIf(process.platform === 'win32')('T39: identifies an actual all-interface listener without claiming Internet reachability', async () => {
    const server = createServer(socket => socket.destroy());
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject); server.listen(0, '0.0.0.0', () => resolve());
    });
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('The owned listener did not acquire a TCP port.');
      const inspection = await new PortsService().list();
      expect(inspection.ports).toContainEqual({ protocol: 'tcp', address: '0.0.0.0', port: address.port, pid: process.pid, visibility: 'all-interfaces' });
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });

  it.runIf(process.platform === 'win32')('T40: reports a real netstat command failure, then succeeds on explicit retry', async () => {
    let failureCode: number | null | undefined;
    const invocation = vi.spyOn(commands, 'runCommand').mockImplementationOnce(async (executable, args, options) => {
      expect(path.basename(executable).toLowerCase()).toBe('netstat.exe');
      expect(args).toEqual(['-ano', '-p', 'tcp']);
      const result = await runRealCommand(executable, ['--devstation-invalid-option'], options);
      failureCode = result.code;
      return result;
    });
    const ports = new PortsService();
    await expect(ports.list()).rejects.toMatchObject({ code: 'PORTS_UNAVAILABLE', retryable: true });
    expect(failureCode).toBeDefined(); expect(failureCode).not.toBe(0);
    invocation.mockRestore();
    const retried = await ports.list();
    expect(Array.isArray(retried.ports)).toBe(true);
    expect(Number.isNaN(Date.parse(retried.checkedAt))).toBe(false);
  });
});
