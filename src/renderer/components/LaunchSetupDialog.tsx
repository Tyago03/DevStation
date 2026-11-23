import { ArrowLeft, FileCode2, FolderOpen, Plus, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Project, RunConfig, RunRecipe, ScriptSelection } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { TermHelp } from '../help/HelpPage';
import { ErrorBanner } from './common';
import { ExecutionPreview } from './ExecutionPreview';
import { recipeArguments, validPort } from './launchRecipes';

type Kind = RunRecipe['kind'];
const choices: { kind: Kind; title: string; description: string }[] = [
  { kind: 'python-script', title: 'Python script', description: 'Run a .py file from this project.' },
  { kind: 'python-module', title: 'Python local web server', description: 'Serve a project folder on this computer with http.server.' },
  { kind: 'node-script', title: 'Node.js script', description: 'Run a .js or .mjs file from this project.' },
];

export function LaunchSetupDialog({ project, config, onClose, onSaved, onAdvanced }: { project: Project; config?: RunConfig; onClose: () => void; onSaved: () => void; onAdvanced: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const pendingFocus = useRef<string | undefined>(undefined);
  const [step, setStep] = useState<'choose' | 'details' | 'review'>(config ? 'details' : 'choose');
  const [kind, setKind] = useState<Kind>(config?.recipe?.kind ?? 'python-script');
  const [label, setLabel] = useState(config?.label ?? '');
  const [executable, setExecutable] = useState(config?.executablePath ?? '');
  const [script, setScript] = useState<ScriptSelection | undefined>(config?.recipe && config.recipe.kind !== 'python-module' ? config.recipe.script : undefined);
  const [port, setPort] = useState(String(config?.recipe?.kind === 'python-module' ? config.recipe.port : 8765));
  const [cwd, setCwd] = useState(config?.workingDir ?? project.path);
  const [extras, setExtras] = useState(config?.recipe?.kind === 'python-script' ? config.args.slice(2) : config?.recipe?.kind === 'node-script' ? config.args.slice(1) : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [invalid, setInvalid] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  // A new step replaces the focused element. Restore focus before the browser
  // paints the new fields, including when an asynchronous save rejects them.
  useLayoutEffect(() => {
    if (step === 'details') {
      if (pendingFocus.current) dialog.current?.querySelector<HTMLElement>(`[data-field="${pendingFocus.current}"]`)?.focus();
      else first.current?.focus();
      pendingFocus.current = undefined;
    } else dialog.current?.querySelector<HTMLElement>('[data-step-focus]')?.focus();
  }, [step]);

  const recipe: RunRecipe | undefined = kind === 'python-module' ? { kind, module: 'http.server', port: Number(port) } : script ? { kind, script } : undefined;
  const args = recipe ? recipeArguments(recipe, extras) : [];
  async function pick(field: 'executable' | 'script' | 'cwd') {
    setBusy(true); setError(undefined);
    try {
      if (field === 'executable') { const result = valueOf(await window.devstation.configs.chooseExecutable()); if (result) { setExecutable(result); setInvalid(previous => ({ ...previous, executable: '' })); } }
      else if (field === 'script') { const result = valueOf(await window.devstation.configs.chooseScript(project.id, kind === 'node-script' ? 'node' : 'python')); if (result) { setScript(result); setInvalid(previous => ({ ...previous, script: '' })); } }
      else { const result = valueOf(await window.devstation.configs.chooseWorkingDir(project.id)); if (result) setCwd(result); }
    } catch (problem) { setError(messageOf(problem)); }
    finally { setBusy(false); }
  }
  function review() {
    const problems: Record<string, string> = {};
    if (!label.trim() || [...label].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) problems.label = 'Enter a name without control characters.';
    if (!executable) problems.executable = `Choose ${kind === 'node-script' ? 'node.exe' : 'a Python .exe'} installed on this computer.`;
    if (kind !== 'python-module' && !script) problems.script = 'Choose a script inside this project.';
    if (kind === 'python-module' && !validPort(port)) problems.port = 'Enter a whole-number port from 1024 to 65535.';
    if (extras.some(value => value.includes('\0'))) problems.extras = 'Arguments cannot contain a null character.';
    setInvalid(problems); setError(undefined);
    if (Object.keys(problems).length) { const field = Object.keys(problems)[0]; dialog.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus(); return; }
    setStep('review');
  }
  async function save() {
    if (!recipe) return;
    setBusy(true); setError(undefined);
    try {
      const result = await window.devstation.configs.save({ ...(config ? { id: config.id } : {}), projectId: project.id, label: label.trim(), executablePath: executable, args, workingDir: cwd, recipe });
      if (result.ok) onSaved();
      else {
        setError(result.error.message);
        if (['SCRIPT_CHANGED', 'INVALID_SCRIPT'].includes(result.error.code)) { setScript(undefined); setInvalid({ script: 'Choose this script again to review its current contents.' }); pendingFocus.current = 'script'; setStep('details'); }
        else if (result.error.code.startsWith('EXE_') || result.error.code === 'INVALID_CWD') { const field = result.error.code === 'INVALID_CWD' ? 'cwd' : 'executable'; setInvalid({ [field]: result.error.message }); pendingFocus.current = field; setStep('details'); }
      }
    } catch (problem) { setError(messageOf(problem)); }
    finally { setBusy(false); }
  }
  const fieldError = (name: string) => invalid[name] ? <span id={`setup-${name}-error`} className="field-error" role="alert">{invalid[name]}</span> : null;
  return <dialog ref={dialog} className="configuration-dialog" aria-labelledby="setup-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">{project.name} · {step === 'choose' ? '1 / 3' : step === 'details' ? '2 / 3' : '3 / 3'}</span><h2 id="setup-title">{config ? 'Edit launch setup' : 'Create a launch setup'}</h2><p>{step === 'choose' ? 'Choose what you want to run.' : step === 'details' ? 'Choose the program and review its inputs.' : 'Check the exact values before saving.'}</p></div><button className="icon-button" aria-label="Close launch setup" disabled={busy} onClick={() => dialog.current?.close()}><X size={19} /></button></div>
    <div className="dialog-body">{error && <ErrorBanner message={error} />}
      {step === 'choose' && <div className="recipe-options">{choices.map((choice, index) => <button key={choice.kind} className="recipe-option" data-step-focus={index === 0 ? '' : undefined} onClick={() => { if (choice.kind !== kind) { setScript(undefined); setExecutable(''); setExtras([]); setInvalid({}); } setKind(choice.kind); setStep('details'); }}><FileCode2 size={23} /><span><strong>{choice.title}</strong><span>{choice.description}</span></span></button>)}<button className="recipe-option" onClick={onAdvanced}><span><strong>Advanced executable</strong><span>Choose a Windows .exe and enter each argument yourself.</span></span></button></div>}
      {step === 'details' && <>
        <div className="form-field"><label htmlFor="setup-name">Configuration name</label><input id="setup-name" data-field="label" ref={first} maxLength={60} value={label} onChange={event => setLabel(event.target.value)} aria-invalid={Boolean(invalid.label)} aria-describedby={invalid.label ? 'setup-label-error' : undefined} placeholder="e.g. My local server" />{fieldError('label')}</div>
        <div className="form-field"><label htmlFor="setup-executable">Program to launch (executable)</label><div className="picker-field"><input id="setup-executable" data-field="executable" readOnly value={executable} placeholder={kind === 'node-script' ? 'Choose node.exe…' : 'Choose python.exe or python3.exe…'} aria-invalid={Boolean(invalid.executable)} aria-describedby={invalid.executable ? 'setup-executable-error' : undefined} /><button className="button secondary" disabled={busy} onClick={() => { void pick('executable'); }}><FolderOpen size={15} />Choose program</button></div>{fieldError('executable')}<TermHelp topic="launch-setups" summary="What is an executable?">The installed program that opens your script. Choose Python for a .py file or Node.js for .js/.mjs. DevStation does not install these programs.</TermHelp></div>
        {kind !== 'python-module' ? <div className="form-field"><label htmlFor="setup-script">Script file</label><div className="picker-field"><input id="setup-script" data-field="script" readOnly value={script?.path ?? ''} placeholder={kind === 'node-script' ? 'Choose a .js or .mjs file…' : 'Choose a .py file…'} aria-invalid={Boolean(invalid.script)} aria-describedby={invalid.script ? 'setup-script-error' : undefined} /><button className="button secondary" disabled={busy} onClick={() => { void pick('script'); }}>Choose script</button></div>{fieldError('script')}<p className="field-hint">Must be inside this project. If it changes after saving, review and authorize the new version before starting.</p></div> : <div className="form-field"><label htmlFor="setup-port">Local port</label><input id="setup-port" data-field="port" type="number" min={1024} max={65535} value={port} onChange={event => setPort(event.target.value)} aria-invalid={Boolean(invalid.port)} aria-describedby={`setup-port-help${invalid.port ? ' setup-port-error' : ''}`} /><p id="setup-port-help" className="field-hint">http.server uses 127.0.0.1, accessible only from this computer. Files in the selected folder are served.</p>{fieldError('port')}</div>}
        <div className="form-field"><label htmlFor="setup-cwd">Folder used when running (working directory)</label><div className="picker-field"><input id="setup-cwd" data-field="cwd" readOnly value={cwd} aria-invalid={Boolean(invalid.cwd)} aria-describedby={invalid.cwd ? 'setup-cwd-error' : undefined} /><button className="button secondary" disabled={busy} onClick={() => { void pick('cwd'); }}>Choose folder</button></div><p className="field-hint">The project folder is selected by default. You can choose a folder inside it.</p>{fieldError('cwd')}</div>
        {kind !== 'python-module' && <fieldset className="arguments-field"><legend>Extra inputs (arguments) <span>Optional · one value per field</span></legend>{extras.map((value, index) => <div className="argument-row" key={index}><span>{index + 1}</span><input data-field="extras" aria-label={`Extra argument ${index + 1}`} aria-invalid={Boolean(invalid.extras)} aria-describedby={invalid.extras ? 'setup-extras-error' : undefined} value={value} maxLength={4096} onChange={event => setExtras(previous => previous.map((entry, i) => i === index ? event.target.value : entry))} /><button className="icon-button" aria-label={`Remove extra argument ${index + 1}`} onClick={() => setExtras(previous => previous.filter((_, i) => i !== index))}><X size={16} /></button></div>)}<button className="text-button" disabled={extras.length >= (kind === 'python-script' ? 62 : 63)} onClick={() => setExtras(previous => [...previous, ''])}><Plus size={15} />Add extra argument</button>{fieldError('extras')}<TermHelp topic="launch-setups" summary="How do arguments work?">Each field is one exact input. Spaces are preserved; do not add shell quoting. The script path and required options are included for you.</TermHelp></fieldset>}
      </>}
      {step === 'review' && <><h3 data-step-focus tabIndex={-1}>{label}</h3><ExecutionPreview executable={executable} args={args} workingDir={cwd} /></>}
    </div><div className="dialog-footer">{step !== 'choose' && <button className="button secondary" disabled={busy} onClick={() => { setStep(step === 'review' ? 'details' : 'choose'); setError(undefined); }}><ArrowLeft size={15} />Back</button>}<button className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button>{step === 'details' && <button className="button primary" disabled={busy} onClick={review}>Review setup</button>}{step === 'review' && <button className="button primary" disabled={busy} onClick={() => { void save(); }}>{busy ? 'Saving…' : 'Save configuration'}</button>}</div>
  </dialog>;
}
