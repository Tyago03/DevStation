// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedRun, Result, RunConfig } from '../../src/shared/contracts';
import { App } from '../../src/renderer/App';
import { ConfigurationDialog } from '../../src/renderer/components/ConfigurationDialog';
import { RunConfigurations } from '../../src/renderer/components/RunConfigurations';
import { success, testApi } from './api';

const project = { id: 'project-1', name: 'Local API', path: 'C:\\code\\local-api', addedAt: '2026-11-21' };
const config: RunConfig = { id: 'config-1', projectId: project.id, label: 'Local server', executablePath: 'C:\\Python\\python.exe', args: ['-m', 'http.server'], workingDir: project.path };
const loadFailure = { ok: false as const, error: { code: 'SQLITE_ERROR', message: 'Saved data is temporarily unavailable.', retryable: true } };

beforeEach(() => {
  window.devstation = testApi();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('P0 error recovery', () => {
  it('does not invent zero active runs after initial failure and recovers through Runs Retry', async () => {
    const run: ManagedRun = { id: 'run-1', projectId: project.id, configId: config.id, label: config.label, state: 'running', startedAt: '2026-11-21T12:00:00Z' };
    vi.mocked(window.devstation.projects.list).mockResolvedValue(success([project]));
    vi.mocked(window.devstation.runs.list).mockResolvedValueOnce(loadFailure).mockResolvedValueOnce(success([run]));
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Run status unavailable' })).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Active runs/ })).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Runs' })).toHaveAttribute('title', 'Run status unavailable');
    expect(screen.queryByRole('button', { name: '0 active runs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'A quiet workspace.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Runs' }));
    expect(screen.getByRole('heading', { name: 'Session runs could not be loaded.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ready when you are.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: config.label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 active run' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.devstation.runs.list).toHaveBeenCalledTimes(2);
  });

  it('preserves the last successful runs during polling and labels failed refreshes as stale', async () => {
    vi.useFakeTimers();
    const run: ManagedRun = { id: 'run-1', projectId: project.id, configId: config.id, label: config.label, state: 'running', startedAt: '2026-11-21T12:00:00Z' };
    let finishPoll: ((value: Result<ManagedRun[]>) => void) | undefined;
    vi.mocked(window.devstation.projects.list).mockResolvedValue(success([project]));
    vi.mocked(window.devstation.runs.list).mockResolvedValueOnce(success([run])).mockImplementationOnce(() => new Promise(resolve => { finishPoll = resolve; }));
    render(<App />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: 'Runs' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('heading', { name: config.label })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.queryByText('Loading session runs…')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: config.label })).toBeInTheDocument();
    await act(async () => { finishPoll?.(loadFailure); });
    expect(screen.getByRole('alert')).toHaveTextContent('Showing the last successful check; run status may have changed.');
    expect(screen.getByRole('heading', { name: config.label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 active at last check' })).toBeInTheDocument();
    expect(screen.queryByText('Loading session runs…')).not.toBeInTheDocument();
  });

  it('does not claim an empty catalog after a load failure, then recovers through Retry', async () => {
    vi.mocked(window.devstation.projects.list).mockResolvedValueOnce(loadFailure).mockResolvedValueOnce(success([project]));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Your workspace could not be loaded.' })).toBeInTheDocument();
    expect(screen.queryByText('Repositories in your workspace')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bring your projects into focus.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(screen.getByRole('heading', { name: 'Your projects could not be loaded.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(project.name)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.devstation.projects.list).toHaveBeenCalledTimes(2);
    expect(window.devstation.projects.chooseAndAdd).not.toHaveBeenCalled();
  });

  it('keeps failed configuration loading distinct from an empty project and retries safely', async () => {
    vi.mocked(window.devstation.configs.list).mockResolvedValueOnce(loadFailure).mockResolvedValueOnce(success([config]));
    render(<RunConfigurations project={project} runs={[]} onRun={vi.fn()} refreshRuns={vi.fn(async () => undefined)} />);
    expect(await screen.findByRole('heading', { name: 'Run configurations could not be loaded.' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Give this project a starting point.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: config.label })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.devstation.configs.list).toHaveBeenCalledTimes(2);
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('labels an uncertain managed run Unknown while keeping duplicate starts and editing disabled', async () => {
    const run: ManagedRun = { id: 'run-1', projectId: project.id, configId: config.id, label: config.label, state: 'unknown', startedAt: '2026-11-21T12:00:00Z' };
    vi.mocked(window.devstation.configs.list).mockResolvedValue(success([config]));
    render(<RunConfigurations project={project} runs={[run]} onRun={vi.fn()} refreshRuns={vi.fn(async () => undefined)} />);
    expect(await screen.findByRole('button', { name: 'Unknown' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Running' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Edit ${config.label}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `Delete ${config.label}` })).toBeDisabled();
  });
});

describe('P0 accessible controls', () => {
  it('keeps navigation names available when compact layout hides its visible labels', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Bring your projects into focus.' });
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const label of navigation.querySelectorAll('button > span')) (label as HTMLElement).hidden = true;
    const help = screen.getByRole('button', { name: 'Documentation' });
    const helpLabel = help.querySelector('span');
    if (helpLabel) helpLabel.hidden = true;
    for (const name of ['Overview', 'Projects', 'Runs', 'Ports', 'Diagnostics', 'Settings']) expect(within(navigation).getByRole('button', { name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Documentation' })).toBeInTheDocument();
  });

  it('associates validation feedback with fields and focuses the first invalid field', async () => {
    render(<ConfigurationDialog project={project} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    const name = screen.getByRole('textbox', { name: 'Configuration name' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter a configuration name without control characters.');
    expect(name).toHaveFocus();
    fireEvent.change(name, { target: { value: config.label } });
    expect(name).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    const executable = screen.getByRole('textbox', { name: 'Executable' });
    expect(executable).toHaveAttribute('aria-invalid', 'true');
    expect(executable).toHaveAccessibleDescription(/Choose an existing Windows \.exe file\./);
    expect(executable).toHaveFocus();
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
  });

  it.each([
    { code: 'EXE_NOT_FOUND', field: 'Executable', message: 'The selected executable is no longer available. Choose it again.' },
    { code: 'INVALID_CWD', field: 'Working directory', message: 'Working directory must be inside this project.' },
  ])('associates a backend $code error with its field', async ({ code, field, message }) => {
    vi.mocked(window.devstation.configs.save).mockResolvedValue({ ok: false, error: { code, message, retryable: true } });
    const saved = vi.fn();
    render(<ConfigurationDialog project={project} config={config} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    const input = screen.getByRole('textbox', { name: field });
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(input).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(input).toHaveFocus();
    expect(saved).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });
});
