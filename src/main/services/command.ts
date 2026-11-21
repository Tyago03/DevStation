import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../shared/errors';

// Deliberately exclude tokens, arbitrary NODE_OPTIONS and GIT_CONFIG_* overrides.
export function localEnvironment(): NodeJS.ProcessEnv {
  const allowed = new Set(['path', 'systemroot', 'windir', 'temp', 'tmp', 'userprofile', 'home', 'appdata', 'localappdata', 'programfiles', 'programfiles(x86)', 'programdata', 'pathext']);
  return Object.fromEntries(Object.entries(process.env).filter(([key, value]) => allowed.has(key.toLowerCase()) && value !== undefined));
}

export async function findTool(name: string): Promise<string | null> {
  const pathValue = Object.entries(process.env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
  for (const directory of pathValue.split(path.delimiter)) {
    const clean = directory.replace(/^"|"$/g, '');
    if (!path.isAbsolute(clean)) continue;
    const candidate = path.join(clean, name);
    try { await access(candidate); return candidate; } catch { /* try next PATH entry */ }
  }
  return null;
}

export interface CommandResult { stdout: string; stderr: string; code: number | null }
export interface CommandOptions { cwd?: string; timeout?: number; maxBytes?: number; env?: NodeJS.ProcessEnv }

export function runCommand(executable: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, cwd: options.cwd, env: options.env ?? localEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const finishError = (error: AppError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };
    const timer = setTimeout(() => finishError(new AppError('OP_TIMEOUT', 'This check took too long. Try again.', true)), options.timeout ?? 10_000);
    const receive = (destination: Buffer[]) => (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > (options.maxBytes ?? 2 * 1024 * 1024)) {
        finishError(new AppError('OUTPUT_LIMIT', 'This check returned too much output. Try a smaller repository.', true));
      } else destination.push(chunk);
    };
    child.stdout.on('data', receive(chunks));
    child.stderr.on('data', receive(errors));
    child.once('error', () => finishError(new AppError('TOOL_UNAVAILABLE', 'The required tool could not be started. Check that it is installed and accessible.', true)));
    child.once('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({ stdout: Buffer.concat(chunks).toString('utf8'), stderr: Buffer.concat(errors).toString('utf8'), code });
    });
  });
}
