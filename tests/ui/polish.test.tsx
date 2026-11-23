// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedRun, RunConfig, ScriptReview } from '../../src/shared/contracts';
import { App } from '../../src/renderer/App';
import { RunBadge, isActive } from '../../src/renderer/components/common';
import { RunConfigurations } from '../../src/renderer/components/RunConfigurations';
import { ScriptReviewDialog, visibleScriptText } from '../../src/renderer/components/ScriptReviewDialog';
import { success, testApi } from './api';

const project = { id: 'project-one', name: 'Example project', path: 'C:\\Example\\Project', addedAt: '2026-11-23' };
const config: RunConfig = { id: 'config-one', projectId: project.id, label: 'Local task', executablePath: 'C:\\Python\\python.exe', args: ['-u', `${project.path}\\main.py`], workingDir: project.path, recipe: { kind: 'python-script', script: { path: `${project.path}\\main.py`, fingerprint: 'a'.repeat(64) } } };
const preview: ScriptReview = { token: 'opaque-review-token', configId: config.id, label: config.label, scriptPath: `${project.path}\\main.py`, previousFingerprint: 'a'.repeat(64), fingerprint: 'b'.repeat(64), content: 'print("new version")\n', byteLength: 21, changed: true, expiresAt: '2026-11-23T12:05:00Z' };
const updated: RunConfig = { ...config, recipe: { kind: 'python-script', script: { path: preview.scriptPath, fingerprint: preview.fingerprint } } };
beforeEach(() => {
  window.devstation = testApi();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('changed script authorization', () => {
  it('offers an explicit review after blocked Start, saves only on authorization, and never restarts automatically', async () => {
    vi.mocked(window.devstation.configs.list).mockResolvedValue(success([config]));
    vi.mocked(window.devstation.runs.start).mockResolvedValue({ ok: false, error: { code: 'SCRIPT_CHANGED', message: 'The file changed.', retryable: true } });
    vi.mocked(window.devstation.configs.reviewScript).mockResolvedValue(success(preview));
    vi.mocked(window.devstation.configs.authorizeScript).mockResolvedValue(success(updated));
    const onRun = vi.fn();
    render(<RunConfigurations project={project} runs={[]} onRun={onRun} refreshRuns={vi.fn(async () => undefined)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }));
    const reviewButton = await screen.findByRole('button', { name: 'Review changes and authorize' });
    expect(window.devstation.configs.reviewScript).not.toHaveBeenCalled();
    reviewButton.focus(); fireEvent.click(reviewButton);
    expect(await screen.findByRole('region', { name: 'Current script version' })).toHaveTextContent('new version');
    expect(window.devstation.configs.authorizeScript).not.toHaveBeenCalled();
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Authorize this version' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Nothing has started. Choose Start when you are ready.');
    expect(window.devstation.configs.authorizeScript).toHaveBeenCalledWith(config.id, preview.token);
    expect(window.devstation.runs.start).toHaveBeenCalledOnce();
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus();
  });

  it('shows source as text, reveals directional controls, and canceling native confirmation leaves the setup unchanged', async () => {
    vi.mocked(window.devstation.configs.reviewScript).mockResolvedValue(success({ ...preview, content: '<img src=x onerror=alert(1)>\n\u202Ehidden' }));
    const close = vi.fn(); const authorized = vi.fn();
    render(<ScriptReviewDialog config={config} onClose={close} onAuthorized={authorized} onEdit={vi.fn()} onReturnFocus={vi.fn()} />);
    const source = await screen.findByRole('region', { name: 'Current script version' });
    expect(source).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(source).toHaveTextContent('⟦U+202E⟧hidden');
    expect(document.querySelector('img')).toBeNull();
    expect(source).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('heading', { name: 'Review script changes' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Authorize this version' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(authorized).not.toHaveBeenCalled();
    expect(window.devstation.configs.save).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });

  it('invalidates the displayed token after a changed or expired review and requires a fresh preview', async () => {
    vi.mocked(window.devstation.configs.reviewScript).mockResolvedValueOnce(success(preview)).mockResolvedValueOnce(success({ ...preview, token: 'fresh-token', content: 'print("third version")' }));
    vi.mocked(window.devstation.configs.authorizeScript).mockResolvedValue({ ok: false, error: { code: 'SCRIPT_CHANGED', message: 'The file changed again. Reload its current version.', retryable: true } });
    render(<ScriptReviewDialog config={config} onClose={vi.fn()} onAuthorized={vi.fn()} onEdit={vi.fn()} onReturnFocus={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Authorize this version' }));
    await screen.findByText('The file changed again. Reload its current version.');
    expect(screen.queryByRole('button', { name: 'Authorize this version' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Current script version' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload current version' }));
    expect(await screen.findByRole('region', { name: 'Current script version' })).toHaveTextContent('third version');
    expect(window.devstation.configs.authorizeScript).toHaveBeenCalledOnce();
  });

  it('never offers authorization of a missing or partial preview and offers the external review path', async () => {
    vi.mocked(window.devstation.configs.reviewScript).mockResolvedValue({ ok: false, error: { code: 'SCRIPT_REVIEW_UNAVAILABLE', message: 'This file is too large for a complete preview.', retryable: false } });
    const edit = vi.fn();
    render(<ScriptReviewDialog config={config} onClose={vi.fn()} onAuthorized={vi.fn()} onEdit={edit} onReturnFocus={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit setup' }));
    expect(edit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Authorize this version' })).not.toBeInTheDocument();
    expect(screen.getByText(/No partial preview can be authorized/)).toBeInTheDocument();
    expect(window.devstation.configs.authorizeScript).not.toHaveBeenCalled();
  });

  it('preserves readable whitespace and makes invisible control characters explicit', () => {
    expect(visibleScriptText('a\n\tb\r\n\u0007\u200B\u2066x\u2069')).toBe('a\n\tb\r\n⟦U+0007⟧⟦U+200B⟧⟦U+2066⟧x⟦U+2069⟧');
  });
});

describe('truthful process outcomes', () => {
  const base: ManagedRun = { id: 'run-one', configId: config.id, projectId: project.id, label: config.label, state: 'exited', startedAt: '2026-11-23T12:00:00Z', endedAt: '2026-11-23T12:00:03Z' };
  it.each([
    { data: { exitCode: null, exitReason: 'stopped-by-user' as const }, label: 'Stopped by user', active: false },
    { data: { exitCode: 0, exitReason: 'completed' as const }, label: 'Completed successfully', active: false },
    { data: { exitCode: 7, exitReason: 'error' as const }, label: 'Exited with error', active: false },
    { data: { exitCode: null, exitReason: 'unknown' as const }, label: 'Unknown', active: false },
    { data: { state: 'unknown' as const, endedAt: undefined }, label: 'Unknown', active: true },
    { data: { state: 'stopping' as const, exitReason: 'stopped-by-user' as const, endedAt: undefined }, label: 'Stopping', active: true },
    { data: { exitCode: 0 }, label: 'Completed successfully', active: false },
    { data: { exitCode: 9 }, label: 'Exited with error', active: false },
    { data: { exitCode: null }, label: 'Unknown', active: false },
  ])('renders $label only from confirmed state/evidence ($data)', ({ data, label, active }) => {
    const run = { ...base, ...data };
    render(<RunBadge run={run} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(isActive(run)).toBe(active);
    expect(screen.queryByText('Exited (unknown)')).not.toBeInTheDocument();
  });

  it('distinguishes uncertain termination from a confirmed exit with an unknown reason in run details', async () => {
    vi.mocked(window.devstation.runs.list).mockResolvedValue(success([{ ...base, exitCode: null, exitReason: 'unknown' }]));
    render(<App />);
    await screen.findByRole('button', { name: '0 active runs' });
    fireEvent.click(screen.getByRole('button', { name: 'Runs' }));
    expect(screen.getByText('The process ended, but its exit reason could not be determined.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
    expect(await screen.findByText('This task ended without captured output.')).toBeInTheDocument();
  });

  it('provides a keyboard skip target without changing the trusted renderer URL', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Bring your projects into focus.' });
    const url = window.location.href;
    fireEvent.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.href).toBe(url);
  });
});
