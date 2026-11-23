// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';
import { HelpPage } from '../../src/renderer/help/HelpPage';
import { LaunchSetupDialog } from '../../src/renderer/components/LaunchSetupDialog';
import { DiagnosticsPage } from '../../src/renderer/pages/Diagnostics';
import { PortsPage } from '../../src/renderer/pages/Ports';
import { testApi, success } from './api';

const project = { id: 'project-one', name: 'Example project', path: 'C:\\code\\Example project', addedAt: '2026-11-23' };
const failure = { ok: false as const, error: { code: 'UNAVAILABLE', message: 'Windows could not answer this check.', retryable: true } };
beforeEach(() => {
  window.devstation = testApi();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('offline learning', () => {
  it('searches bundled explanations and opens contextual help without external navigation', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Start tour' });
    fireEvent.click(screen.getByRole('button', { name: 'Ports' }));
    fireEvent.click(screen.getByRole('button', { name: 'Help with ports' }));
    expect(screen.getByRole('heading', { name: 'Understand local ports' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search offline help' }), { target: { value: 'working directory' } });
    expect(screen.getByRole('navigation', { name: 'Help topics' })).toHaveTextContent('Create a launch setup');
    expect(window.devstation.app.openHelp).not.toHaveBeenCalled();
    expect(window.devstation.ports.list).not.toHaveBeenCalled();
  });

  it('shows an honest help search empty state', () => {
    render(<HelpPage />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search offline help' }), { target: { value: 'not-a-real-help-term-123' } });
    expect(screen.getByRole('heading', { name: 'No matching help topics.' })).toBeInTheDocument();
  });

  it('persists optional tour progress, Back, Skip, and a Settings restart without running tools', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start tour' }));
    await screen.findByRole('heading', { name: 'What is DevStation?' });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { name: 'Add a Git project' });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('heading', { name: 'What is DevStation?' });
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Getting started tour' })).not.toBeInTheDocument());
    expect(window.devstation.settings.update).toHaveBeenLastCalledWith({ theme: 'dark', tour: { status: 'skipped', step: 0 } });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart getting started tour' }));
    await screen.findByRole('heading', { name: 'What is DevStation?' });
    expect(window.devstation.settings.update).toHaveBeenLastCalledWith({ theme: 'dark', tour: { status: 'in-progress', step: 0 } });
    expect(window.devstation.projects.chooseAndAdd).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
    expect(window.devstation.diagnostics.check).not.toHaveBeenCalled();
  });

  it('resumes the persisted tour and finishes all steps without requiring a project', async () => {
    vi.mocked(window.devstation.settings.get).mockResolvedValue(success({ theme: 'dark', tour: { status: 'in-progress', step: 4 } }));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Finish tour' }));
    await waitFor(() => expect(window.devstation.settings.update).toHaveBeenCalledWith({ theme: 'dark', tour: { status: 'completed', step: 4 } }));
    expect(window.devstation.projects.chooseAndAdd).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('makes zero API calls while exploring the example, including after polling intervals', async () => {
    vi.useFakeTimers();
    render(<App />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: 'Explore an example workspace' }));
    vi.clearAllMocks();
    fireEvent.click(screen.getByRole('button', { name: 'Preview example setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'See sample output' }));
    fireEvent.click(screen.getByRole('button', { name: 'See a sample listening port' }));
    fireEvent.click(screen.getByRole('button', { name: 'Offline help' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search offline help' }), { target: { value: 'Python' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    for (const group of Object.values(window.devstation)) for (const method of Object.values(group)) expect(method).not.toHaveBeenCalled();
    expect(screen.getByText(/Real tasks you already started may keep running/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exit example' }));
    await act(async () => { await Promise.resolve(); });
    expect(window.devstation.projects.list).toHaveBeenCalledOnce();
    expect(window.devstation.app.shutdownStatus).toHaveBeenCalledOnce();
  });
});

describe('guided launch setups', () => {
  it.each([
    { title: 'Python script', kind: 'python-script', runtime: 'python', exe: 'C:\\Python\\python.exe', path: `${project.path}\\hello world.py`, prefix: ['-u'] },
    { title: 'Node.js script', kind: 'node-script', runtime: 'node', exe: 'C:\\Node\\node.exe', path: `${project.path}\\hello world.mjs`, prefix: [] },
  ])('previews exact $title argv, preserves spaces, saves metadata, and never starts', async ({ title, kind, runtime, exe, path, prefix }) => {
    vi.mocked(window.devstation.configs.chooseExecutable).mockResolvedValue(success(exe));
    vi.mocked(window.devstation.configs.chooseScript).mockResolvedValue(success({ path, fingerprint: 'a'.repeat(64) }));
    const saved = vi.fn();
    render(<LaunchSetupDialog project={project} onClose={vi.fn()} onSaved={saved} onAdvanced={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Python script/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
    expect(screen.getByLabelText('Configuration name')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Configuration name'), { target: { value: 'My task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose program' }));
    await waitFor(() => expect(screen.getByLabelText('Program to launch (executable)')).toHaveValue(exe));
    fireEvent.click(screen.getByRole('button', { name: 'Choose script' }));
    await waitFor(() => expect(screen.getByLabelText('Script file')).toHaveValue(path));
    expect(window.devstation.configs.chooseScript).toHaveBeenCalledWith(project.id, runtime);
    fireEvent.click(screen.getByRole('button', { name: 'Add extra argument' }));
    fireEvent.change(screen.getByLabelText('Extra argument 1'), { target: { value: 'a & b | c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    expect(screen.getByLabelText('Exact execution preview').querySelector('pre')?.textContent).toBe(JSON.stringify([...prefix, path, 'a & b | c'], null, 2));
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Extra argument 1')).toHaveValue('a & b | c');
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(window.devstation.configs.save).toHaveBeenCalledWith({ projectId: project.id, label: 'My task', executablePath: exe, args: [...prefix, path, 'a & b | c'], workingDir: project.path, recipe: { kind, script: { path, fingerprint: 'a'.repeat(64) } } });
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('validates module ports accessibly and fixes binding to loopback without extra arguments', async () => {
    vi.mocked(window.devstation.configs.chooseExecutable).mockResolvedValue(success('C:\\Python\\python.exe'));
    render(<LaunchSetupDialog project={project} onClose={vi.fn()} onSaved={vi.fn()} onAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Python local web server/ }));
    fireEvent.change(screen.getByLabelText('Configuration name'), { target: { value: 'Local files' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose program' }));
    await waitFor(() => expect(screen.getByLabelText('Program to launch (executable)')).toHaveValue('C:\\Python\\python.exe'));
    fireEvent.change(screen.getByLabelText('Local port'), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    expect(screen.getByLabelText('Local port')).toHaveFocus();
    expect(screen.getByLabelText('Local port')).toHaveAccessibleDescription(/1024 to 65535/);
    fireEvent.change(screen.getByLabelText('Local port'), { target: { value: '8765' } });
    expect(screen.queryByRole('button', { name: 'Add extra argument' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    await waitFor(() => expect(window.devstation.configs.save).toHaveBeenCalledWith(expect.objectContaining({ args: ['-I', '-u', '-m', 'http.server', '8765', '--bind', '127.0.0.1'], recipe: { kind: 'python-module', module: 'http.server', port: 8765 } })));
    expect(window.devstation.configs.chooseScript).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('requires a fresh script selection after SCRIPT_CHANGED and associates the recovery with that field', async () => {
    const path = `${project.path}\\main.py`;
    const config = { id: 'saved', projectId: project.id, label: 'Python task', executablePath: 'C:\\Python\\python.exe', args: ['-u', path], workingDir: project.path, recipe: { kind: 'python-script' as const, script: { path, fingerprint: 'a'.repeat(64) } } };
    vi.mocked(window.devstation.configs.save).mockResolvedValueOnce({ ok: false, error: { code: 'SCRIPT_CHANGED', message: 'The script changed since selection.', retryable: true } });
    render(<LaunchSetupDialog project={project} config={config} onClose={vi.fn()} onSaved={vi.fn()} onAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    const script = await screen.findByLabelText('Script file');
    expect(script).toHaveValue('');
    expect(script).toHaveAttribute('aria-invalid', 'true');
    expect(script).toHaveAccessibleDescription('Choose this script again to review its current contents.');
    await waitFor(() => expect(script).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Review setup' }));
    expect(window.devstation.configs.save).toHaveBeenCalledOnce();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('keeps the previous script when its picker is cancelled and returns focus to the opener on close', async () => {
    const opener = document.createElement('button'); opener.textContent = 'Open setup'; document.body.append(opener); opener.focus();
    const path = `${project.path}\\main.mjs`;
    const config = { id: 'saved', projectId: project.id, label: 'Node task', executablePath: 'C:\\Node\\node.exe', args: [path], workingDir: project.path, recipe: { kind: 'node-script' as const, script: { path, fingerprint: 'b'.repeat(64) } } };
    const close = vi.fn();
    const view = render(<LaunchSetupDialog project={project} config={config} onClose={close} onSaved={vi.fn()} onAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose script' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose script' })).not.toBeDisabled());
    expect(screen.getByLabelText('Script file')).toHaveValue(path);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
  });
});

describe('honest checks and shutdown recovery', () => {
  it('labels diagnostics failures and their timestamp without claiming tools are missing', async () => {
    vi.mocked(window.devstation.diagnostics.check).mockResolvedValueOnce(failure).mockResolvedValueOnce(success([{ name: 'Python', status: 'installed', version: 'Python 3.12', checkedAt: '2026-11-23T12:00:00Z' }]));
    render(<DiagnosticsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Run diagnostics' }));
    await screen.findByText('Check failed. Tool availability is unknown.');
    expect(screen.getByText(/Last failed attempt:/)).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable')).toHaveLength(4);
    expect(screen.queryByText('Not found')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Python 3.12');
    expect(screen.queryByText(/Last failed attempt:/)).not.toBeInTheDocument();
  });

  it('preserves successful port results with stale timestamps when a later check fails', async () => {
    vi.mocked(window.devstation.ports.list).mockResolvedValueOnce(success({ ports: [{ protocol: 'tcp', address: '127.0.0.1', port: 8765, pid: 456, visibility: 'loopback' }], checkedAt: '2026-11-23T12:00:00Z' })).mockResolvedValueOnce(failure);
    render(<PortsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect listening ports' }));
    await screen.findByText('8765');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Check failed');
    expect(screen.getByText('8765')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('previous successful check');
    expect(screen.getByText(/Last failed attempt:/)).toHaveTextContent('Last successful check:');
  });

  it('keeps uncertain shutdown tasks visible and routes explicit recovery actions', async () => {
    const run = { id: 'r', configId: 'c', projectId: 'p', label: 'Uncertain task', state: 'unknown' as const, startedAt: '2026-11-23' };
    vi.mocked(window.devstation.app.shutdownStatus).mockResolvedValue(success({ phase: 'blocked', runs: [run], message: 'Windows could not confirm termination.' }));
    render(<App />);
    await screen.findByRole('heading', { name: 'Some tasks may still be running.' });
    expect(screen.getByText('Uncertain task')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep DevStation open' }));
    await waitFor(() => expect(window.devstation.app.shutdownAction).toHaveBeenCalledWith('keep-open'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Some tasks may still be running.' })).not.toBeInTheDocument());
    expect(window.devstation.runs.stop).not.toHaveBeenCalled();
  });
});
