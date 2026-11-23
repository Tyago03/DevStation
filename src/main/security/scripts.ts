import path from 'node:path';
import { open, realpath, stat } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import { createHash } from 'node:crypto';
import { AppError } from '../../shared/errors';
import type { ScriptSelection } from '../../shared/contracts';
import { isInside, pathIdentity, workingDirectory } from './paths';

const MAX_SCRIPT_BYTES = 10 * 1024 * 1024;
const MAX_REVIEW_BYTES = 256 * 1024;
const changed = () => new AppError('SCRIPT_CHANGED', 'The script changed while it was being checked. Review its current version again.', true);
const sameFile = (left: Stats, right: Stats) => left.dev === right.dev && left.ino === right.ino && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
const reviewUnavailable = () => new AppError('SCRIPT_REVIEW_UNAVAILABLE', 'In-app review requires a complete UTF-8 script no larger than 256 KiB. Review this file in your editor, then use Edit setup to select it again. Nothing was authorized or started.');

/** Hash only a user-selected script inside an already imported project. Never return its contents. */
export async function inspectScript(root: string, selected: string, kind: 'python' | 'node'): Promise<ScriptSelection> {
  return (await readScript(root, selected, kind, false)).script;
}

/** Read only the configured script. Content and fingerprint come from the same bounded handle. */
export async function reviewScriptContents(root: string, selected: string, kind: 'python' | 'node') {
  const snapshot = await readScript(root, selected, kind, true);
  return { ...snapshot, content: snapshot.content! };
}

async function readScript(root: string, selected: string, kind: 'python' | 'node', includeContent: boolean) {
  await workingDirectory(root, root);
  const extensions = kind === 'python' ? ['.py'] : ['.js', '.mjs'];
  if (!path.isAbsolute(selected) || !extensions.includes(path.extname(selected).toLowerCase())) throw new AppError('INVALID_SCRIPT', `Choose a ${extensions.join(' or ')} file inside this project.`);
  let canonical: string;
  try { canonical = await realpath(selected); }
  catch { throw new AppError('INVALID_SCRIPT', 'The selected script is no longer available. Choose a script inside this project again.', true); }
  if (!isInside(root, canonical) || !extensions.includes(path.extname(canonical).toLowerCase())) throw new AppError('INVALID_SCRIPT', 'The script must stay inside this project, including links and junctions. Choose another file.');
  const file = await open(canonical, 'r').catch(() => { throw new AppError('INVALID_SCRIPT', 'The script could not be opened. Check its permissions and choose it again.', true); });
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > MAX_SCRIPT_BYTES) throw new AppError('INVALID_SCRIPT', 'Choose a regular script file no larger than 10 MB.');
    if (includeContent && before.size > MAX_REVIEW_BYTES) throw reviewUnavailable();
    if (pathIdentity(await realpath(canonical)) !== pathIdentity(canonical) || !sameFile(before, await stat(canonical))) throw changed();
    const hash = createHash('sha256'); let bytes = 0; const parts: Buffer[] = [];
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      const buffer = chunk as Buffer; bytes += buffer.length;
      if (bytes > MAX_SCRIPT_BYTES) throw new AppError('INVALID_SCRIPT', 'The script exceeds the 10 MB limit. Choose a smaller script.');
      if (includeContent) { if (bytes > MAX_REVIEW_BYTES) throw reviewUnavailable(); parts.push(buffer); }
      hash.update(buffer);
    }
    const after = await file.stat();
    // A path can be replaced while an old file handle remains readable. Verify both.
    if (!sameFile(before, after) || bytes !== after.size || !sameFile(after, await stat(canonical))) throw changed();
    if (pathIdentity(await realpath(selected)) !== pathIdentity(canonical) || pathIdentity(await realpath(canonical)) !== pathIdentity(canonical)) throw changed();
    await workingDirectory(root, root);
    let content: string | undefined;
    if (includeContent) {
      try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(parts)); }
      catch { throw reviewUnavailable(); }
      if (content.includes('\0')) throw reviewUnavailable();
    }
    return { script: { path: canonical, fingerprint: hash.digest('hex') }, byteLength: bytes, content };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw changed();
  } finally { await file.close(); }
}
