import { FolderOpen, Plus, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Project, RunConfig } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { ErrorBanner } from './common';

type FieldName = 'label' | 'executable' | 'workingDir' | 'args';
type FieldErrors = Partial<Record<FieldName, string>>;
function labelError(value: string) {
  return !value.trim() || /[\u0000-\u001f\u007f]/u.test(value) ? 'Enter a configuration name without control characters.' : undefined;
}

export function ConfigurationDialog({ project, config, onClose, onSaved }: { project: Project; config?: RunConfig; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const executableInput = useRef<HTMLInputElement>(null);
  const cwdInput = useRef<HTMLInputElement>(null);
  const argumentInputs = useRef<Array<HTMLInputElement | null>>([]);
  const [label, setLabel] = useState(config?.label ?? '');
  const [executable, setExecutable] = useState(config?.executablePath ?? '');
  const [args, setArgs] = useState<string[]>(config?.args ?? []);
  const [cwd, setCwd] = useState(config?.workingDir ?? project.path);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.showModal();
    nameInput.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, []);

  function focusField(field: FieldName) {
    if (field === 'label') nameInput.current?.focus();
    else if (field === 'executable') executableInput.current?.focus();
    else if (field === 'workingDir') cwdInput.current?.focus();
    else argumentInputs.current.find(input => input?.value.includes('\0'))?.focus();
  }
  function showFieldError(field: FieldName, message: string) {
    setFieldErrors(previous => ({ ...previous, [field]: message }));
    focusField(field);
  }
  async function pick(kind: 'exe' | 'cwd') {
    setPicking(true);
    const field = kind === 'exe' ? 'executable' : 'workingDir';
    try {
      const selected = valueOf(await (kind === 'exe' ? window.devstation.configs.chooseExecutable() : window.devstation.configs.chooseWorkingDir(project.id)));
      if (selected) {
        if (kind === 'exe') setExecutable(selected); else setCwd(selected);
        setFieldErrors(previous => ({ ...previous, [field]: undefined }));
      }
    }
    catch (problem) { showFieldError(field, messageOf(problem)); }
    finally { setPicking(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const invalid: FieldErrors = {};
    const nameError = labelError(label);
    if (nameError) invalid.label = nameError;
    if (!executable) invalid.executable = 'Choose an existing Windows .exe file.';
    if (args.some(value => value.includes('\0'))) invalid.args = 'Arguments cannot contain a null character.';
    setFieldErrors(invalid); setError(undefined);
    const firstInvalid = (['label', 'executable', 'args'] as const).find(field => invalid[field]);
    if (firstInvalid) { focusField(firstInvalid); return; }
    setBusy(true); setError(undefined);
    try {
      const result = await window.devstation.configs.save({ ...(config ? { id: config.id } : {}), projectId: project.id, label: label.trim(), executablePath: executable, args, workingDir: cwd });
      if (result.ok) onSaved();
      else if (result.error.code.startsWith('EXE_')) showFieldError('executable', result.error.message);
      else if (result.error.code === 'INVALID_CWD') showFieldError('workingDir', result.error.message);
      else setError(result.error.message);
    }
    catch (problem) { setError(messageOf(problem)); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="configuration-dialog" aria-labelledby="config-dialog-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}><form noValidate onSubmit={event => { void save(event); }}>
    <div className="dialog-heading"><div><span className="eyebrow">{project.name}</span><h2 id="config-dialog-title">{config ? 'Edit run configuration' : 'Add run configuration'}</h2><p>A local executable, with a clear set of arguments.</p></div><button type="button" className="icon-button" aria-label="Close configuration" disabled={busy} onClick={() => dialog.current?.close()}><X size={19} /></button></div>
    <div className="dialog-body">{error && <ErrorBanner message={error} />}
      <div className="form-field"><label htmlFor="config-name">Configuration name</label><input id="config-name" ref={nameInput} autoFocus required maxLength={60} aria-invalid={Boolean(fieldErrors.label)} aria-describedby={fieldErrors.label ? 'config-name-error' : undefined} placeholder="e.g. Local Python server" value={label} onBlur={() => setFieldErrors(previous => ({ ...previous, label: labelError(label) }))} onChange={event => { setLabel(event.target.value); if (fieldErrors.label) setFieldErrors(previous => ({ ...previous, label: labelError(event.target.value) })); }} />{fieldErrors.label && <span id="config-name-error" className="field-error" role="alert">{fieldErrors.label}</span>}</div>
      <div className="form-field"><label htmlFor="config-executable">Executable</label><div className="picker-field"><input id="config-executable" ref={executableInput} readOnly aria-invalid={Boolean(fieldErrors.executable)} aria-describedby={`config-executable-help${fieldErrors.executable ? ' config-executable-error' : ''}`} placeholder="Select a Windows executable…" value={executable} title={executable} /><button type="button" className="button secondary" disabled={picking || busy} onClick={() => { void pick('exe'); }}><FolderOpen size={15} />Browse</button></div><span id="config-executable-help" className="field-hint">Windows .exe only. Shell scripts (.cmd, .bat, .ps1) are not supported.</span>{fieldErrors.executable && <span id="config-executable-error" className="field-error" role="alert">{fieldErrors.executable}</span>}</div>
      <fieldset className="arguments-field"><legend>Arguments <span>One value per field</span></legend>{args.map((arg, index) => <div className="argument-row" key={index}><span>{String(index + 1).padStart(2, '0')}</span><input ref={input => { argumentInputs.current[index] = input; }} aria-label={`Argument ${index + 1}`} aria-invalid={Boolean(fieldErrors.args) && arg.includes('\0')} aria-describedby={`config-arguments-help${fieldErrors.args ? ' config-arguments-error' : ''}`} maxLength={4096} value={arg} placeholder="Argument value" onChange={event => { setArgs(previous => previous.map((value, i) => i === index ? event.target.value : value)); setFieldErrors(previous => ({ ...previous, args: undefined })); }} /><button type="button" className="icon-button" aria-label={`Remove argument ${index + 1}`} onClick={() => { setArgs(previous => previous.filter((_, i) => i !== index)); setFieldErrors(previous => ({ ...previous, args: undefined })); }}><X size={16} /></button></div>)}<button type="button" className="text-button" disabled={args.length >= 64} onClick={() => setArgs(previous => [...previous, ''])}><Plus size={15} />Add argument</button><p id="config-arguments-help" className="field-hint">Values are passed exactly as entered. Do not add shell quoting.</p>{fieldErrors.args && <p id="config-arguments-error" className="field-error" role="alert">{fieldErrors.args}</p>}</fieldset>
      <div className="form-field"><label htmlFor="config-cwd">Working directory</label><div className="picker-field"><input id="config-cwd" ref={cwdInput} readOnly aria-invalid={Boolean(fieldErrors.workingDir)} aria-describedby={`config-cwd-help${fieldErrors.workingDir ? ' config-cwd-error' : ''}`} value={cwd} title={cwd} /><button type="button" className="button secondary" disabled={picking || busy} onClick={() => { void pick('cwd'); }}><FolderOpen size={15} />Browse</button></div><span id="config-cwd-help" className="field-hint">Must remain inside this project. The project root is selected by default.</span>{fieldErrors.workingDir && <span id="config-cwd-error" className="field-error" role="alert">{fieldErrors.workingDir}</span>}</div>
      <div className="notice info-notice"><ShieldCheck size={17} /><span>Saving does not run anything. You will review the executable and arguments when you start this task.</span></div>
    </div><div className="dialog-footer"><button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="button primary" disabled={busy || picking}>{busy ? 'Saving…' : 'Save configuration'}</button></div>
  </form></dialog>;
}
