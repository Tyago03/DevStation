import path from 'node:path';
import { open, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AppError } from '../../shared/errors';
import type { ScriptSelection } from '../../shared/contracts';
import { isInside, pathIdentity, workingDirectory } from './paths';

const MAX_SCRIPT_BYTES = 10 * 1024 * 1024;

/** Hash only a user-selected script inside an already imported project. Never return its contents. */
export async function inspectScript(root: string, selected: string, kind: 'python' | 'node'): Promise<ScriptSelection> {
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
    if (pathIdentity(await realpath(canonical)) !== pathIdentity(canonical)) throw new AppError('SCRIPT_CHANGED', 'The selected script moved. Choose it again to review the current file.');
    const hash = createHash('sha256'); let bytes = 0;
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      const buffer = chunk as Buffer; bytes += buffer.length;
      if (bytes > MAX_SCRIPT_BYTES) throw new AppError('INVALID_SCRIPT', 'The script exceeds the 10 MB limit. Choose a smaller script.');
      hash.update(buffer);
    }
    const after = await file.stat();
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size || bytes !== after.size) throw new AppError('SCRIPT_CHANGED', 'The script changed while it was being checked. Choose it again before saving.', true);
    return { path: canonical, fingerprint: hash.digest('hex') };
  } finally { await file.close(); }
}
