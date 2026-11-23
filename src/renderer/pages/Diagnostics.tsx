import { ArrowUpRight, Box, Check, Code2, GitBranch, ShieldCheck, Terminal } from 'lucide-react';
import { useState } from 'react';
import type { ToolDiagnostic } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { Badge, ErrorBanner, fullTime, RefreshButton } from '../components/common';

const toolInfo = [
  { name: 'Git', description: 'Repository inspection and local version control.', icon: GitBranch, help: 'git' },
  { name: 'Node.js', description: 'JavaScript runtime for your development tasks.', icon: Code2, help: 'node' },
  { name: 'npm', description: 'Package manager for the Node.js ecosystem.', icon: Box, help: 'node' },
  { name: 'Python', description: 'Python interpreter or Windows launcher.', icon: Terminal, help: 'python' },
] as const;

export function DiagnosticsPage() {
  const [tools, setTools] = useState<ToolDiagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checkError, setCheckError] = useState<string>();
  const [failedAt, setFailedAt] = useState<string>();
  const [checkedAt, setCheckedAt] = useState<string>();
  async function check() {
    setBusy(true); setCheckError(undefined);
    try { const result = valueOf(await window.devstation.diagnostics.check()); setTools(result); setCheckedAt(result[0]?.checkedAt ?? new Date().toISOString()); setFailedAt(undefined); }
    catch (problem) { setCheckError(messageOf(problem)); setFailedAt(new Date().toISOString()); }
    finally { setBusy(false); }
  }
  return <><div className="diagnostic-intro"><div><span className="small-label">ENVIRONMENT CHECK</span><p>{checkedAt ? `Last successful check: ${fullTime(checkedAt)}` : checkError ? 'Check failed. Tool availability is unknown.' : 'Not checked yet. Run a check when you are ready.'}</p>{failedAt && <p>Last failed attempt: {fullTime(failedAt)}</p>}</div><RefreshButton busy={busy} onClick={() => { void check(); }} label="Run diagnostics" /></div>{error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}{checkError && <ErrorBanner message={`${checkError}${checkedAt ? ' Showing the previous successful check; availability may have changed.' : ''}`} onRetry={() => { void check(); }} />}
    <div className="diagnostic-grid">{toolInfo.map(info => { const tool = tools.find(item => item.name === info.name); const Icon = info.icon; return <section className="panel tool-card" key={info.name}><div className="tool-card-top"><div className="tool-logo"><Icon size={25} /></div><Badge tone={tool?.status === 'installed' ? 'success' : tool?.status === 'error' || (checkError && !tool) ? 'danger' : tool?.status === 'not-found' ? 'warning' : 'neutral'}>{busy ? 'Checking' : checkError && !tool ? 'Unavailable' : tool?.status === 'installed' ? 'Installed' : tool?.status === 'not-found' ? 'Not found' : tool?.status === 'error' ? 'Error' : 'Not checked'}</Badge></div><h2>{info.name}</h2><p>{info.description}</p><div className="tool-version"><span className="small-label">VERSION</span><code>{tool?.version ?? '—'}</code></div>{tool?.detail && <p className="tool-detail">{tool.detail}</p>}{tool && <p className="field-hint">{checkError ? 'Previous result · ' : ''}Checked {fullTime(tool.checkedAt)}</p>}<button className="text-button" onClick={() => { void window.devstation.app.openHelp(info.help).then(valueOf).catch(problem => setError(messageOf(problem))); }}>Official website · opens browser<ArrowUpRight size={14} /></button></section>; })}</div>
    <div className="panel diagnostic-note"><ShieldCheck size={22} /><div><h3>Information, with no changes.</h3><p>Checks query local tool versions. DevStation does not install software, change your environment, or upload results.</p></div><Check size={18} /></div>
  </>;
}
