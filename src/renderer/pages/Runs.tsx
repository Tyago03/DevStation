import { ArrowRight, Square, Terminal } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { EmptyState, ErrorBanner, fullTime, isActive, RunBadge, SectionTitle, shortTime } from '../components/common';
import { LogConsole } from '../components/LogConsole';

function duration(start: string, end?: string) {
  const seconds = Math.max(0, Math.floor(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function RunsPage({ workspace, selectedId, onSelect, onProjects }: { workspace: Workspace; selectedId?: string; onSelect: (id: string) => void; onProjects: () => void }) {
  const [error, setError] = useState<string>();
  const [stopping, setStopping] = useState<string>();
  const runs = workspace.runs.slice().reverse();
  const selected = runs.find(run => run.id === selectedId) ?? runs[0];
  async function stop(id: string) {
    setStopping(id); setError(undefined);
    try { valueOf(await window.devstation.runs.stop(id)); await workspace.refreshRuns(); }
    catch (problem) { setError(messageOf(problem)); }
    finally { setStopping(undefined); }
  }
  if (runs.length === 0) return <section className="panel"><EmptyState icon={<Terminal size={30} />} title="Ready when you are." description="Create a run configuration inside a project, then start it to see its output and status here." action={<button className="button primary" onClick={onProjects}>Go to projects<ArrowRight size={16} /></button>} /><div className="panel-footnote">Runs belong to this session. Nothing starts automatically when DevStation opens.</div></section>;

  return <>{error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}<section className="panel runs-panel"><SectionTitle title="This session" meta={`${runs.length} ${runs.length === 1 ? 'run' : 'runs'} · ${runs.filter(isActive).length} active`} /><div className="table-scroll"><table className="data-table runs-table"><thead><tr><th>Task / project</th><th>Status</th><th>PID</th><th>Started</th><th>Duration</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{runs.map(run => <tr key={run.id} className={selected?.id === run.id ? 'selected-row' : ''}><td><button className="table-main-button" onClick={() => onSelect(run.id)} aria-pressed={selected?.id === run.id}><Terminal size={17} /><span><strong>{run.label}</strong><small>{workspace.projects.find(project => project.id === run.projectId)?.name ?? 'Project removed'}</small></span></button></td><td><RunBadge run={run} /></td><td className="mono">{run.pid ?? '—'}</td><td title={fullTime(run.startedAt)}>{shortTime(run.startedAt)}</td><td className="mono">{duration(run.startedAt, run.endedAt)}</td><td>{isActive(run) ? <button className="button secondary small-button" disabled={stopping === run.id || run.state === 'stopping'} onClick={() => { void stop(run.id); }}><Square size={12} />Stop</button> : <button className="text-button" onClick={() => onSelect(run.id)}>Logs<ArrowRight size={13} /></button>}</td></tr>)}</tbody></table></div></section>
    {selected && <div className="run-detail"><div className="run-detail-heading"><div><span className="eyebrow">SELECTED RUN</span><h2>{selected.label}</h2></div><RunBadge run={selected} /></div>{selected.error && <ErrorBanner message={selected.error} />}{selected.warning && <div className="notice warning-notice">{selected.warning}</div>}<LogConsole key={selected.id} runId={selected.id} /></div>}
  </>;
}
