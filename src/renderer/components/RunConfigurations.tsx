import { Pencil, Play, Plus, Terminal, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ManagedRun, Project, RunConfig } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { copy } from '../copy';
import { EmptyState, ErrorBanner, ErrorState, isActive, Loading, SectionTitle } from './common';
import { ConfigurationDialog } from './ConfigurationDialog';
import { LaunchSetupDialog } from './LaunchSetupDialog';
import { ScriptReviewDialog } from './ScriptReviewDialog';

export function RunConfigurations({ project, runs, onRun, refreshRuns }: { project: Project; runs: ManagedRun[]; onRun: (id: string) => void; refreshRuns: () => Promise<void> }) {
  const [configs, setConfigs] = useState<RunConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [editing, setEditing] = useState<RunConfig | 'new'>();
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [changedConfig, setChangedConfig] = useState<RunConfig>();
  const [reviewing, setReviewing] = useState<RunConfig>();
  const [authorizedMessage, setAuthorizedMessage] = useState<string>();
  const startButtons = useRef(new Map<string, HTMLButtonElement>());
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try { setConfigs(valueOf(await window.devstation.configs.list(project.id))); }
    catch (problem) { setLoadError(messageOf(problem)); }
    finally { setLoading(false); }
  }, [project.id]);
  useEffect(() => { void load(); }, [load]);

  async function start(config: RunConfig) {
    setBusyId(config.id); setError(undefined); setChangedConfig(undefined); setAuthorizedMessage(undefined);
    try {
      const result = await window.devstation.runs.start(config.id);
      if (!result.ok && result.error.code === 'SCRIPT_CHANGED' && config.recipe && config.recipe.kind !== 'python-module') { setChangedConfig(config); return; }
      const run = valueOf(result); await refreshRuns(); if (run) onRun(run.id);
    }
    catch (problem) { setError(messageOf(problem)); }
    finally { setBusyId(undefined); }
  }
  async function remove(id: string) {
    setBusyId(id); setError(undefined);
    try { valueOf(await window.devstation.configs.delete(id)); await load(); }
    catch (problem) { setError(messageOf(problem)); }
    finally { setBusyId(undefined); }
  }

  return <section className="panel configurations"><SectionTitle title="Run configurations" meta="Saved tasks. Started only by you." action={<button className="button secondary" onClick={() => setEditing('new')}><Plus size={15} />Add configuration</button>} />
    {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
    {changedConfig && <div className="script-changed-notice" role="alert"><div><strong>{changedConfig.label}: the script has changed.</strong><p>Review the current file before authorizing this setup to use it. Nothing has started.</p></div><button className="button secondary" onClick={() => setReviewing(changedConfig)}>Review changes and authorize</button></div>}
    {authorizedMessage && <div className="notice info-notice" role="status"><span>{authorizedMessage}</span><button className="text-button" onClick={() => setAuthorizedMessage(undefined)}>Dismiss</button></div>}
    {loading ? <Loading label="Loading configurations…" /> : loadError ? <ErrorState title="Run configurations could not be loaded." message={loadError} onRetry={() => { void load(); }} /> : configs.length === 0 ? <EmptyState icon={<Terminal size={26} />} title="Give this project a starting point." description="Choose a guided Python or Node.js setup, or configure another trusted program." action={<button className="text-button" onClick={() => setEditing('new')}><Plus size={15} />Add run configuration</button>} compact /> : <div>{configs.map(config => {
      const activeRun = runs.find(run => run.configId === config.id && isActive(run));
      const active = activeRun !== undefined;
      const stateLabel = activeRun ? activeRun.state.charAt(0).toUpperCase() + activeRun.state.slice(1) : undefined;
      return <div className="config-row" key={config.id}><div className="config-icon"><Terminal size={20} /></div><div className="config-info"><h3>{config.label}</h3><p className="mono" title={config.executablePath}>{config.executablePath}</p><div className="args-preview">{config.args.map((arg, index) => <code key={index}>{JSON.stringify(arg)}</code>)}{config.args.length === 0 && <span>No arguments</span>}</div></div><div className="config-actions"><button className="icon-button" aria-label={`Edit ${config.label}`} disabled={active || busyId === config.id} onClick={() => setEditing(config)}><Pencil size={16} /></button><button className="icon-button danger-button" aria-label={`Delete ${config.label}`} disabled={active || busyId === config.id} onClick={() => { void remove(config.id); }}><Trash2 size={16} /></button><button ref={button => { if (button) startButtons.current.set(config.id, button); else startButtons.current.delete(config.id); }} className="button primary" disabled={busyId === config.id || active} onClick={() => { void start(config); }}><Play size={14} />{stateLabel ?? (busyId === config.id ? 'Starting…' : 'Start')}</button></div></div>;
    })}</div>}
    <div className="panel-footnote">{copy.runTrust}</div>
    {editing && (advanced || (editing !== 'new' && !editing.recipe) ? <ConfigurationDialog project={project} config={editing === 'new' ? undefined : editing} onClose={() => { setEditing(undefined); setAdvanced(false); }} onSaved={() => { setEditing(undefined); setAdvanced(false); void load(); }} /> : <LaunchSetupDialog project={project} config={editing === 'new' ? undefined : editing} onAdvanced={() => setAdvanced(true)} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void load(); }} />)}
    {reviewing && <ScriptReviewDialog config={reviewing} onClose={() => setReviewing(undefined)} onReturnFocus={() => startButtons.current.get(reviewing.id)?.focus()} onEdit={() => { setEditing(reviewing); setReviewing(undefined); }} onAuthorized={config => { setConfigs(previous => previous.map(item => item.id === config.id ? config : item)); setReviewing(undefined); setChangedConfig(undefined); setAuthorizedMessage(`${config.label}: the new version is authorized. Nothing has started. Choose Start when you are ready.`); }} />}
  </section>;
}
