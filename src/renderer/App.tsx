import { ArrowUpRight, CircleHelp, FolderGit2, LayoutDashboard, Network, Play, Plus, Settings2, ShieldCheck, SquareTerminal, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { navigation, pageCopy, type PageName } from './copy';
import { useWorkspace, valueOf } from './hooks/useWorkspace';
import { ErrorBanner, isActive } from './components/common';
import { OverviewPage } from './pages/Overview';
import { ProjectsPage } from './pages/Projects';
import { RunsPage } from './pages/Runs';
import { PortsPage } from './pages/Ports';
import { DiagnosticsPage } from './pages/Diagnostics';
import { SettingsPage } from './pages/Settings';

const icons = { Overview: LayoutDashboard, Projects: FolderGit2, Runs: Play, Ports: Network, Diagnostics: Stethoscope, Settings: Settings2 };

export function App() {
  const workspace = useWorkspace();
  const [page, setPage] = useState<PageName>('Overview');
  const [projectId, setProjectId] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const active = workspace.runs.filter(isActive).length;
  const copy = pageCopy[page];

  function openProject(id: string) { setProjectId(id); setPage('Projects'); }
  function openRun(id: string) { setRunId(id); setPage('Runs'); }
  async function addProject() { const project = await workspace.addProject(); if (project) openProject(project.id); }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><SquareTerminal size={24} strokeWidth={1.8} /></div><div><strong>DevStation</strong><span>LOCAL WORKSPACE</span></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(name => { const Icon = icons[name]; return <button key={name} className={`nav-item ${name === page ? 'selected' : ''}`} aria-current={name === page ? 'page' : undefined} onClick={() => { setPage(name); if (name === 'Projects') setProjectId(undefined); }}><Icon size={18} /><span>{name}</span>{name === 'Runs' && active > 0 && <span className="nav-count">{active}</span>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="local-card"><ShieldCheck size={18} /><div><strong>Yours. Locally.</strong><span>No cloud. No noise.</span></div></div><button className="help-link" onClick={() => { void window.devstation.app.openHelp('readme').then(valueOf).catch(workspace.report); }}><CircleHelp size={16} /><span>Documentation</span><ArrowUpRight size={14} /></button><div className="sidebar-footer"><span>DevStation</span><span>{workspace.version ? `v${workspace.version}` : 'Local desktop'}</span></div></div>
    </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><div className="topbar-status"><span className="local-dot" />Local environment<span className="topbar-divider" /><button className="text-button muted" onClick={() => setPage('Runs')}><Play size={13} />{active} active {active === 1 ? 'run' : 'runs'}</button></div></header>
      <main className="page-content" id="main-content">
        <div className="page-heading"><div><div className="eyebrow">{copy.eyebrow}</div><h1>{copy.title}</h1><p>{copy.description}</p></div>{(page === 'Overview' || page === 'Projects') && <button className="button primary" onClick={() => { void addProject(); }} disabled={workspace.adding}><Plus size={17} />{workspace.adding ? 'Choosing folder…' : 'Add project'}</button>}</div>
        {workspace.error && <ErrorBanner message={workspace.error} onDismiss={() => workspace.setError(undefined)} />}
        {page === 'Overview' && <OverviewPage workspace={workspace} onProject={openProject} onRun={openRun} onNavigate={setPage} onAdd={() => { void addProject(); }} />}
        {page === 'Projects' && <ProjectsPage workspace={workspace} selectedId={projectId} onSelect={setProjectId} onRun={openRun} onAdd={() => { void addProject(); }} />}
        {page === 'Runs' && <RunsPage workspace={workspace} selectedId={runId} onSelect={setRunId} onProjects={() => { setProjectId(undefined); setPage('Projects'); }} />}
        {page === 'Ports' && <PortsPage />}
        {page === 'Diagnostics' && <DiagnosticsPage />}
        {page === 'Settings' && <SettingsPage workspace={workspace} />}
      </main>
    </div>
  </div>;
}
