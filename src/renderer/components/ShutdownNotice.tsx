import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';

export function ShutdownNotice({ workspace }: { workspace: Workspace }) {
  const [busy, setBusy] = useState(false);
  const status = workspace.shutdown;
  async function act(action: 'retry' | 'keep-open' | 'quit-anyway') { setBusy(true); try { await workspace.shutdownAction(action); } finally { setBusy(false); } }
  if (!status || (status.phase !== 'blocked' && status.phase !== 'stopping')) return null;
  return <section className="shutdown-notice" role="alert" aria-labelledby="shutdown-title"><div><AlertTriangle size={21} /><h2 id="shutdown-title">{status.phase === 'stopping' ? 'Checking whether your tasks stopped…' : 'Some tasks may still be running.'}</h2></div><p>{status.message ?? 'DevStation could not confirm that every managed task stopped. Child processes may also remain. Keep the app open or review the tasks below.'}</p><ul>{status.runs.map(run => <li key={run.id}><strong>{run.label}</strong> — {run.state}{run.error ? `: ${run.error}` : ''}</li>)}</ul><div className="shutdown-actions"><button className="button secondary" disabled={busy || status.phase === 'stopping'} onClick={() => { void act('retry'); }}>Retry stopping</button><button className="button primary" disabled={busy || status.phase === 'stopping'} onClick={() => { void act('keep-open'); }}>Keep DevStation open</button><button className="text-button" disabled={busy || status.phase === 'stopping'} onClick={() => { void act('quit-anyway'); }}>Quit anyway…</button></div></section>;
}
