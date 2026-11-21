import { FolderOpen, Plus, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Project, RunConfig } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { ErrorBanner } from './common';

export function ConfigurationDialog({ project, config, onClose, onSaved }: { project: Project; config?: RunConfig; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [label, setLabel] = useState(config?.label ?? '');
  const [executable, setExecutable] = useState(config?.executablePath ?? '');
  const [args, setArgs] = useState<string[]>(config?.args ?? []);
  const [cwd, setCwd] = useState(config?.workingDir ?? project.path);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);

  async function pick(kind: 'exe' | 'cwd') {
    setPicking(true);
    try { const selected = valueOf(await (kind === 'exe' ? window.devstation.configs.chooseExecutable() : window.devstation.configs.chooseWorkingDir(project.id))); if (selected) { if (kind === 'exe') setExecutable(selected); else setCwd(selected); } }
    catch (problem) { setError(messageOf(problem)); }
    finally { setPicking(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!label.trim() || /[\u0000-\u001f\u007f]/u.test(label)) { setError('Enter a configuration name without control characters.'); return; }
    if (!executable) { setError('Choose an existing Windows .exe file.'); return; }
    setBusy(true); setError(undefined);
    try { valueOf(await window.devstation.configs.save({ ...(config ? { id: config.id } : {}), projectId: project.id, label: label.trim(), executablePath: executable, args, workingDir: cwd })); onSaved(); }
    catch (problem) { setError(messageOf(problem)); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="configuration-dialog" aria-labelledby="config-dialog-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}><form onSubmit={event => { void save(event); }}>
    <div className="dialog-heading"><div><span className="eyebrow">{project.name}</span><h2 id="config-dialog-title">{config ? 'Edit run configuration' : 'Add run configuration'}</h2><p>A local executable, with a clear set of arguments.</p></div><button type="button" className="icon-button" aria-label="Close configuration" disabled={busy} onClick={() => dialog.current?.close()}><X size={19} /></button></div>
    <div className="dialog-body">{error && <ErrorBanner message={error} />}
      <label className="form-field">Configuration name<input autoFocus required maxLength={60} placeholder="e.g. Local Python server" value={label} onChange={event => setLabel(event.target.value)} /></label>
      <div className="form-field"><label htmlFor="config-executable">Executable</label><div className="picker-field"><input id="config-executable" readOnly placeholder="Select a Windows executable…" value={executable} title={executable} /><button type="button" className="button secondary" disabled={picking || busy} onClick={() => { void pick('exe'); }}><FolderOpen size={15} />Browse</button></div><span className="field-hint">Windows .exe only. Shell scripts (.cmd, .bat, .ps1) are not supported.</span></div>
      <fieldset className="arguments-field"><legend>Arguments <span>One value per field</span></legend>{args.map((arg, index) => <div className="argument-row" key={index}><span>{String(index + 1).padStart(2, '0')}</span><input aria-label={`Argument ${index + 1}`} maxLength={4096} value={arg} placeholder="Argument value" onChange={event => setArgs(previous => previous.map((value, i) => i === index ? event.target.value : value))} /><button type="button" className="icon-button" aria-label={`Remove argument ${index + 1}`} onClick={() => setArgs(previous => previous.filter((_, i) => i !== index))}><X size={16} /></button></div>)}<button type="button" className="text-button" disabled={args.length >= 64} onClick={() => setArgs(previous => [...previous, ''])}><Plus size={15} />Add argument</button><p className="field-hint">Values are passed exactly as entered. Do not add shell quoting.</p></fieldset>
      <div className="form-field"><label htmlFor="config-cwd">Working directory</label><div className="picker-field"><input id="config-cwd" readOnly value={cwd} title={cwd} /><button type="button" className="button secondary" disabled={picking || busy} onClick={() => { void pick('cwd'); }}><FolderOpen size={15} />Browse</button></div><span className="field-hint">Must remain inside this project. The project root is selected by default.</span></div>
      <div className="notice info-notice"><ShieldCheck size={17} /><span>Saving does not run anything. You will review the executable and arguments when you start this task.</span></div>
    </div><div className="dialog-footer"><button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="button primary" disabled={busy || picking}>{busy ? 'Saving…' : 'Save configuration'}</button></div>
  </form></dialog>;
}
