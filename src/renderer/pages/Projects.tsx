import { ArrowLeft, ArrowRight, FileCode2, FolderGit2, FolderOpen, GitBranch, GitCommitHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { valueOf } from '../hooks/useWorkspace';
import { copy } from '../copy';
import { EmptyState, ErrorBanner, ErrorState, fullTime, GitBadge, Loading, RefreshButton, SectionTitle } from '../components/common';
import { RunConfigurations } from '../components/RunConfigurations';

export function ProjectsPage({ workspace, selectedId, onSelect, onRun, onAdd }: { workspace: Workspace; selectedId?: string; onSelect: (id?: string) => void; onRun: (id: string) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const project = workspace.projects.find(item => item.id === selectedId);
  const state = project ? workspace.git[project.id] : undefined;
  const overview = state?.overview;
  const filtered = workspace.projects.filter(item => {
    const status = workspace.git[item.id]?.overview;
    return `${item.name} ${item.path}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (filter === 'all' || (filter === 'changed' ? status?.dirty === true : status?.dirty === false));
  });
  if (workspace.loading) return <Loading />;
  if (workspace.projectsError) return <section className="panel"><ErrorState title="Your projects could not be loaded." message={workspace.projectsError} onRetry={() => { void workspace.load(); }} /></section>;
  if (project) return <>
    <button className="back-link" onClick={() => onSelect(undefined)}><ArrowLeft size={15} />All projects</button>
    <section className="panel project-detail-header"><div className="project-detail-title"><div className="project-avatar large"><FolderGit2 size={26} /></div><div><h2>{project.name}</h2><p className="mono wrap-path" title={project.path}>{project.path}</p></div></div><div className="detail-actions"><button className="button secondary" onClick={() => { void window.devstation.projects.openFolder(project.id).then(valueOf).catch(workspace.report); }}><FolderOpen size={15} />Open folder</button><button className="icon-button danger-button" title="Remove from DevStation" aria-label="Remove from DevStation" onClick={() => { void workspace.removeProject(project.id).then(removed => { if (removed) onSelect(undefined); }); }}><Trash2 size={16} /></button></div></section>
    <section className="panel git-panel"><SectionTitle title="Git overview" meta="Read-only inspection" action={<RefreshButton busy={state?.loading} onClick={() => { void workspace.refreshGit(project.id); }} />} />
      {state?.error && <ErrorBanner message={state.error} onRetry={() => { void workspace.refreshGit(project.id); }} />}
      <div className="git-summary"><div className="git-branch"><GitBranch size={22} /><div><span className="small-label">CURRENT BRANCH</span><strong>{overview?.isDetached ? 'Detached HEAD' : overview?.branch ?? 'Not checked'}</strong></div></div><GitBadge {...state} /><div className="change-count"><strong>{overview?.modified ?? '—'}</strong><span>Modified</span></div><div className="change-count"><strong>{overview?.staged ?? '—'}</strong><span>Staged</span></div><div className="change-count"><strong>{overview?.untracked ?? '—'}</strong><span>Untracked</span></div></div>
      {overview?.warning && <div className="notice warning-notice">{overview.warning}</div>}
      <div className="last-commit"><GitCommitHorizontal size={20} /><span className="small-label">LATEST COMMIT</span>{overview?.lastCommit ? <><code>{overview.lastCommit.shortHash}</code><span className="commit-subject">{overview.lastCommit.subject}</span><time dateTime={overview.lastCommit.dateIso} title={fullTime(overview.lastCommit.dateIso)}>{new Date(overview.lastCommit.dateIso).toLocaleDateString()}</time></> : <span>{overview?.isUnborn ? 'This repository has no commits yet.' : 'Not checked yet.'}</span>}</div>
      {overview && <div className="panel-footnote">Checked {fullTime(overview.checkedAt)}. Refresh to inspect the latest changes.</div>}
    </section>
    <RunConfigurations project={project} runs={workspace.runs} onRun={onRun} refreshRuns={workspace.refreshRuns} />
  </>;
  if (workspace.projects.length === 0) return <section className="panel"><EmptyState title={copy.emptyProjects} description={copy.emptyProjectsDescription} action={<button className="button primary" onClick={onAdd} disabled={workspace.adding}><Plus size={16} />Add your first project</button>} /></section>;

  return <section className="panel"><div className="table-toolbar"><label className="search-field"><Search size={16} /><input aria-label="Search projects" placeholder="Search by name or path…" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter projects by status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option><option value="changed">With changes</option><option value="clean">Clean</option></select><span className="result-count">{filtered.length} {filtered.length === 1 ? 'project' : 'projects'}</span></div>
    {filtered.length === 0 ? <EmptyState icon={<Search size={25} />} title="No matching projects." description="Try another name, path, or status filter." compact /> : <div className="project-catalog">{filtered.map(item => { const status = workspace.git[item.id]; return <div className="catalog-row" key={item.id}><button className="catalog-main" onClick={() => onSelect(item.id)}><div className="project-avatar"><FolderGit2 size={21} /></div><div className="catalog-name"><strong>{item.name}</strong><span title={item.path}>{item.path}</span></div></button><div className="catalog-branch"><GitBranch size={14} />{status?.overview?.isDetached ? 'Detached HEAD' : status?.overview?.branch ?? 'Not checked'}</div><div className="catalog-status"><GitBadge {...status} />{status?.error && <span className="inline-error" title={status.error}>{status.error}</span>}</div><button className="button ghost" aria-label={`Open ${item.name}`} onClick={() => onSelect(item.id)}>Open<ArrowRight size={15} /></button></div>; })}</div>}
    <div className="panel-footnote"><FileCode2 size={14} />Removing a project from DevStation never deletes its files.</div>
  </section>;
}
