import { AppError } from '../../shared/errors';
import type { GitOverview } from '../../shared/contracts';
import path from 'node:path';
import { canonicalDirectory, pathIdentity } from '../security/paths';
import { findTool, runCommand } from './command';

export interface GitCounts { modified: number; untracked: number; staged: number }
export function parsePorcelain(output: string): GitCounts {
  const records = output.split('\0');
  const counts = { modified: 0, untracked: 0, staged: 0 };
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record || record.length < 4) continue;
    const x = record[0]; const y = record[1];
    if (x === '?' && y === '?') counts.untracked += 1;
    else if (x !== '!' || y !== '!') {
      if (x !== ' ' && x !== '?') counts.staged += 1;
      if (y !== ' ' && y !== '?') counts.modified += 1;
    }
    // In -z output a rename/copy consumes destination and source records.
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') index += 1;
  }
  return counts;
}

export class GitService {
  private verifiedExecutable?: string;
  constructor(private executable?: string) {}
  private async command(directory: string, args: string[]) {
    const executable = this.executable ?? await findTool(process.platform === 'win32' ? 'git.exe' : 'git');
    if (!executable) throw new AppError('GIT_NOT_FOUND', 'Git was not found. Install Git to inspect repository status.', true);
    if (this.verifiedExecutable !== executable) {
      const version = await runCommand(executable, ['--version'], { timeout: 5000, maxBytes: 8192 });
      const match = version.stdout.match(/git version (\d+)\.(\d+)/);
      if (version.code !== 0 || !match || Number(match[1]) < 2 || (Number(match[1]) === 2 && Number(match[2]) < 36)) {
        throw new AppError('GIT_UNSUPPORTED', 'DevStation requires Git 2.36 or newer to disable repository fsmonitor hooks safely. Update Git to continue.');
      }
      this.verifiedExecutable = executable;
    }
    const result = await runCommand(executable, ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=', '-c', 'log.showSignature=false', '-C', directory, ...args]);
    if (/dubious ownership|safe\.directory/i.test(result.stderr)) {
      throw new AppError('GIT_UNTRUSTED_REPO', 'Git does not trust this repository owner. Review its ownership in Git before importing. DevStation will not change your trust settings.');
    }
    return result;
  }
  async root(directory: string): Promise<string> {
    const canonical = await canonicalDirectory(directory);
    const result = await this.command(canonical, ['rev-parse', '--show-toplevel']);
    if (result.code !== 0 || !result.stdout.trim()) {
      throw new AppError('NOT_GIT_REPO', 'This folder is not a Git working tree. Bare repositories are not supported.');
    }
    return canonicalDirectory(result.stdout.trim());
  }
  async overview(directory: string): Promise<GitOverview> {
    const canonical = await canonicalDirectory(directory);
    if (pathIdentity(canonical) !== pathIdentity(path.normalize(directory))) throw new AppError('PATH_CHANGED', 'The saved project folder now points to a different location. Import it again after reviewing the change.');
    const status = await this.command(canonical, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
    if (status.code !== 0) throw new AppError('NOT_GIT_REPO', 'Git could not inspect this working tree.', true);
    const [branch, head] = await Promise.all([
      this.command(canonical, ['symbolic-ref', '--short', '-q', 'HEAD']),
      this.command(canonical, ['rev-parse', '--verify', 'HEAD']),
    ]);
    const counts = parsePorcelain(status.stdout);
    const isUnborn = head.code !== 0;
    let lastCommit: GitOverview['lastCommit'] = null;
    if (!isUnborn) {
      const commit = await this.command(canonical, ['log', '-1', '--format=%h%x00%s%x00%cI']);
      if (commit.code !== 0) throw new AppError('GIT_READ_FAILED', 'Git could not read the latest commit.', true);
      const [shortHash, subject, dateIso] = commit.stdout.trimEnd().split('\0');
      lastCommit = { shortHash, subject, dateIso };
    }
    return { gitAvailable: true, isRepository: true, branch: branch.code === 0 ? branch.stdout.trim() : null, isDetached: branch.code !== 0 && !isUnborn, isUnborn, dirty: counts.modified + counts.staged + counts.untracked > 0, ...counts, lastCommit, checkedAt: new Date().toISOString() };
  }
}
