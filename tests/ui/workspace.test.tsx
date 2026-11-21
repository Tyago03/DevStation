// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';
import { PortsPage } from '../../src/renderer/pages/Ports';
import { ConfigurationDialog } from '../../src/renderer/components/ConfigurationDialog';
import { success, testApi } from './api';

beforeEach(() => {
  window.devstation = testApi();
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('workspace UI', () => {
  it('shows a genuine empty workspace without automatically running tools or importing folders', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Bring your projects into focus.' })).toBeInTheDocument();
    expect(screen.getByText('Not checked yet')).toBeInTheDocument();
    expect(window.devstation.projects.chooseAndAdd).not.toHaveBeenCalled();
    expect(window.devstation.diagnostics.check).not.toHaveBeenCalled();
    expect(window.devstation.ports.list).not.toHaveBeenCalled();
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add your first project' }));
    await waitFor(() => expect(window.devstation.projects.chooseAndAdd).toHaveBeenCalledOnce());
  });

  it('searches imported paths and renders untrusted project names as text', async () => {
    const suspicious = '<img src=x onerror=alert(1)>';
    vi.mocked(window.devstation.projects.list).mockResolvedValue(success([
      { id: 'one', name: suspicious, path: 'C:\\code\\demo', addedAt: '2026-11-21' },
      { id: 'two', name: 'Local API', path: 'C:\\code\\python-api', addedAt: '2026-11-21' },
    ]));
    render(<App />);
    await screen.findByText(suspicious);
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    const search = screen.getByRole('textbox', { name: 'Search projects' });
    expect(document.querySelector('img')).toBeNull();
    fireEvent.change(search, { target: { value: 'python-api' } });
    expect(screen.getByText('Local API')).toBeInTheDocument();
    expect(screen.queryByText(suspicious)).not.toBeInTheDocument();
  });

  it('keeps a failed port check distinct from a successful empty list and supports retry', async () => {
    vi.mocked(window.devstation.ports.list).mockResolvedValueOnce({ ok: false, error: { code: 'PORTS_UNAVAILABLE', message: 'Ports are unavailable. Try again.', retryable: true } });
    render(<PortsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect listening ports' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ports are unavailable');
    expect(screen.queryByText('No TCP listening ports found.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No TCP listening ports found.')).toBeInTheDocument();
  });

  it('saves structured arguments without starting a task', async () => {
    const project = { id: 'one', name: 'Test repo', path: 'C:\\code\\demo', addedAt: '2026-11-21' };
    vi.mocked(window.devstation.configs.chooseExecutable).mockResolvedValue(success('C:\\Python\\python.exe'));
    const saved = vi.fn();
    render(<ConfigurationDialog project={project} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText('Configuration name'), { target: { value: 'Local server' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Browse' })[0]);
    await waitFor(() => expect(screen.getByLabelText('Executable')).toHaveValue('C:\\Python\\python.exe'));
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.change(screen.getByLabelText('Argument 1'), { target: { value: 'a & b | c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(window.devstation.configs.save).toHaveBeenCalledWith({ projectId: 'one', label: 'Local server', executablePath: 'C:\\Python\\python.exe', args: ['a & b | c'], workingDir: project.path });
    expect(window.devstation.runs.start).not.toHaveBeenCalled();
  });
});
