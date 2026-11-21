import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { AppError } from '../../shared/errors';

export function pathIdentity(value: string): string {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

export async function canonicalDirectory(value: string): Promise<string> {
  if (!value || value.includes('\0') || !path.isAbsolute(value)) {
    throw new AppError('PATH_MISSING', 'Choose an existing absolute folder path.');
  }
  try {
    const canonical = await realpath(value);
    if (!(await stat(canonical)).isDirectory()) throw new Error('not a directory');
    return path.normalize(canonical);
  } catch {
    throw new AppError('PATH_MISSING', 'This folder is no longer available at its saved path.', true);
  }
}

export function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(pathIdentity(root), pathIdentity(candidate));
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function workingDirectory(root: string, candidate: string): Promise<string> {
  const [canonicalRoot, canonicalCandidate] = await Promise.all([canonicalDirectory(root), canonicalDirectory(candidate)]);
  if (pathIdentity(canonicalRoot) !== pathIdentity(path.normalize(root))) {
    throw new AppError('PATH_CHANGED', 'The project folder now points to a different location. Remove and import it again after reviewing the change.');
  }
  if (!isInside(canonicalRoot, canonicalCandidate)) {
    throw new AppError('INVALID_CWD', 'Working directory must be inside this project.');
  }
  return canonicalCandidate;
}

export async function executablePath(value: string): Promise<string> {
  if (!path.isAbsolute(value) || value.includes('\0') || path.extname(value).toLowerCase() !== '.exe') {
    throw new AppError('EXE_INVALID', 'Choose an existing Windows .exe file. Scripts (.cmd, .bat and .ps1) are not supported.');
  }
  try {
    const canonical = await realpath(value);
    if (!(await stat(canonical)).isFile() || path.extname(canonical).toLowerCase() !== '.exe') {
      throw new AppError('EXE_INVALID', 'Choose an existing Windows .exe file.');
    }
    return canonical;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('EXE_NOT_FOUND', 'The selected executable is no longer available. Choose it again.', true);
  }
}
