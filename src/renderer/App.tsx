import { CircleHelp, FolderGit2, LayoutDashboard, Network, Play, Plus, Settings2, ShieldCheck, SquareTerminal, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { navigation, pageCopy, type PageName } from './copy';
import { useWorkspace } from './hooks/useWorkspace';
import { ErrorBanner, isActive } from './components/common';
import { OverviewPage } from './pages/Overview';
import { ProjectsPage } from './pages/Projects';
import { RunsPage } from './pages/Runs';
import { PortsPage } from './pages/Ports';
import { DiagnosticsPage } from './pages/Diagnostics';
import { SettingsPage } from './pages/Settings';
import { HelpPage } from './help/HelpPage';
import type { HelpTopicId } from './help/content';
import { TourInvitation, TourPanel } from './components/TourPanel';
import { ShutdownNotice } from './components/ShutdownNotice';
import { ExampleWorkspace } from './pages/ExampleWorkspace';

const icons = { Overview: LayoutDashboard, Projects: FolderGit2, Runs: Play, Ports: Network, Diagnostics: Stethoscope, Settings: Settings2 };

export function App() {
  const [example, setExample] = useState(false);
  return example ? <ExampleWorkspace onExit={() => setExample(false)} /> : <LiveWorkspace onExample={() => setExample(true)} />;
}

function LiveWorkspace({ onExample }: { onExample: () => void }) {
  const workspace = useWorkspace();
  const [page, setPage] = useState<PageName>('Overview');
  const [projectId, setProjectId] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const [helpTopic, setHelpTopic] = useState<HelpTopicId>('getting-started');
  const [addedMessage, setAddedMessage] = useState<string>();
  const active = workspace.runs.filter(isActive).length;
  const runSummary = !workspace.runsLoaded ? (workspace.runsLoading ? 'Checking runs…' : 'Run status unavailable') : workspace.runsError ? `${active} active at last check` : `${active} active ${active === 1 ? 'run' : 'runs'}`;
  const copy = pageCopy[page];

  function openProject(id: string) { setProjectId(id); setPage('Projects'); }
  function openRun(id: string) { setRunId(id); setPage('Runs'); }
  async function addProject() { const project = await workspace.addProject(); if (project) { openProject(project.id); setAddedMessage(`${project.name} is ready in your workspace. Next, check its Git status or add a launch setup below. Nothing has been started.`); } }
  function openHelp(topic: HelpTopicId = 'getting-started') { setHelpTopic(topic); setPage('Help'); }
  async function restartTour() { await workspace.updateSettings({ ...workspace.settings, tour: { status: 'in-progress', step: 0 } }); setPage('Overview'); }
  const helpForPage: Record<PageName, HelpTopicId> = { Overview: 'getting-started', Projects: 'projects', Runs: 'running-tasks', Ports: 'ports', Diagnostics: 'diagnostics', Settings: 'privacy', Help: 'getting-started' };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><SquareTerminal size={24} strokeWidth={1.8} /></div><div><strong>DevStation</strong><span>LOCAL WORKSPACE</span></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(name => { const Icon = icons[name]; return <button key={name} className={`nav-item ${name === page ? 'selected' : ''}`} aria-label={name} title={name === 'Runs' ? runSummary : name} aria-current={name === page ? 'page' : undefined} onClick={() => { setPage(name); if (name === 'Projects') setProjectId(undefined); }}><Icon size={18} /><span>{name}</span>{name === 'Runs' && (workspace.runsError || !workspace.runsLoaded || active > 0) && <span className="nav-count" aria-hidden="true">{workspace.runsError ? '?' : workspace.runsLoaded ? active : '…'}</span>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="local-card"><ShieldCheck size={18} /><div><strong>Yours. Locally.</strong><span>No cloud. No noise.</span></div></div><button className="help-link" aria-label="Documentation" aria-current={page === 'Help' ? 'page' : undefined} title="Documentation · available offline" onClick={() => openHelp()}><CircleHelp size={16} /><span>Documentation</span></button><div className="sidebar-footer"><span>DevStation</span><span>{workspace.version ? `v${workspace.version}` : 'Local desktop'}</span></div></div>
    </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><div className="topbar-status"><span className="local-dot" />Local environment<span className="topbar-divider" /><button className="text-button muted" onClick={() => setPage('Runs')}><Play size={13} />{runSummary}</button></div></header>
      <main className="page-content" id="main-content" tabIndex={-1}>
        <div className="page-heading"><div><div className="eyebrow">{copy.eyebrow}</div><h1>{copy.title}</h1><p>{copy.description}</p></div>{(page === 'Overview' || page === 'Projects') && <button className="button primary" onClick={() => { void addProject(); }} disabled={workspace.adding}><Plus size={17} />{workspace.adding ? 'Choosing folder…' : 'Add project'}</button>}</div>
        {workspace.error && <ErrorBanner message={workspace.error} onDismiss={() => workspace.setError(undefined)} />}
        {workspace.shutdownError && <ErrorBanner message={`Close status could not be checked: ${workspace.shutdownError}${workspace.shutdown ? ' The last known close state remains below.' : ''}`} onRetry={() => { void workspace.refreshShutdown(); }} />}
        <ShutdownNotice workspace={workspace} />
        {workspace.settings.tour?.status === 'in-progress' && <TourPanel tour={workspace.settings.tour} onUpdate={tour => workspace.updateSettings({ ...workspace.settings, tour })} onAction={step => { if (step === 1) void addProject(); else if (step === 4) setPage('Runs'); else { setProjectId(workspace.projects[0]?.id); setPage('Projects'); } }} />}
        {page === 'Overview' && workspace.settingsLoaded && (!workspace.settings.tour || workspace.settings.tour.status === 'not-started') && <TourInvitation onStart={() => { void restartTour(); }} onSkip={() => { void workspace.updateSettings({ ...workspace.settings, tour: { status: 'skipped', step: 0 } }); }} />}
        {page !== 'Help' && <div className="context-help-row"><button className="text-button" onClick={() => openHelp(helpForPage[page])}><CircleHelp size={15} />Help with {page.toLowerCase()}</button>{page === 'Overview' && <button className="text-button" onClick={onExample}>Explore an example workspace</button>}</div>}
        {page === 'Projects' && addedMessage && <div className="project-added" role="status"><p>{addedMessage}</p><button className="text-button" onClick={() => setAddedMessage(undefined)}>Dismiss</button></div>}
        {page === 'Overview' && <OverviewPage workspace={workspace} onProject={openProject} onRun={openRun} onNavigate={setPage} onAdd={() => { void addProject(); }} />}
        {page === 'Projects' && <ProjectsPage workspace={workspace} selectedId={projectId} onSelect={setProjectId} onRun={openRun} onAdd={() => { void addProject(); }} />}
        {page === 'Runs' && <RunsPage workspace={workspace} selectedId={runId} onSelect={setRunId} onProjects={() => { setProjectId(undefined); setPage('Projects'); }} />}
        {page === 'Ports' && <PortsPage />}
        {page === 'Diagnostics' && <DiagnosticsPage />}
        {page === 'Settings' && <SettingsPage workspace={workspace} onHelp={() => openHelp()} onTour={() => { void restartTour(); }} onExample={onExample} />}
        {page === 'Help' && <HelpPage topic={helpTopic} />}
      </main>
    </div>
  </div>;
}
