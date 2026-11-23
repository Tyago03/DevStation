// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogLine } from '../../src/shared/contracts';
import { boundLogLines, LogConsole } from '../../src/renderer/components/LogConsole';
import { success, testApi } from './api';

function line(sequence: number, text = `line ${sequence}`): LogLine { return { sequence, line: text, stream: 'stdout', timestamp: '2026-11-21T12:00:00Z', runId: 'run-1' }; }
beforeEach(() => { window.devstation = testApi(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('bounded task console', () => {
  it('distinguishes a failed read from waiting for output and recovers through an explicit retry', async () => {
    vi.mocked(window.devstation.runs.logs).mockResolvedValueOnce({ ok: false, error: { code: 'LOGS_UNAVAILABLE', message: 'Output is temporarily unavailable.', retryable: true } }).mockResolvedValueOnce(success({ lines: [line(1, 'Recovered output')], truncated: false }));
    render(<LogConsole runId="run-1" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Waiting for output…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered output')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(window.devstation.runs.logs).toHaveBeenCalledTimes(2);
  });
  it('keeps the newest lines when either length or character cap is reached', () => {
    const byLines = boundLogLines(Array.from({ length: 5100 }, (_, index) => line(index)));
    expect(byLines.truncated).toBe(true);
    expect(byLines.lines).toHaveLength(5000);
    expect(byLines.lines[0].sequence).toBe(100);
    const byCharacters = boundLogLines([line(0, 'a'.repeat(600000)), line(1, 'b'.repeat(600000))]);
    expect(byCharacters.lines.map(item => item.sequence)).toEqual([1]);
  });

  it('escapes output, repairs dropped stream events, preserves clear-view boundary and unsubscribes', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    vi.mocked(window.devstation.runs.onLog).mockReturnValue(unsubscribe);
    vi.mocked(window.devstation.runs.logs).mockResolvedValue(success({ lines: [line(1, '<script>window.hacked=true</script>')], truncated: false }));
    const rendered = render(<LogConsole runId="run-1" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('<script>window.hacked=true</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear view only' }));
    vi.mocked(window.devstation.runs.logs).mockResolvedValue(success({ lines: [line(1, '<script>window.hacked=true</script>'), line(2, 'Recovered from ring buffer')], truncated: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(screen.queryByText('<script>window.hacked=true</script>')).not.toBeInTheDocument();
    expect(screen.getByText('Recovered from ring buffer')).toBeInTheDocument();
    expect(screen.getByText('Older output hidden to limit memory usage.')).toBeInTheDocument();
    rendered.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
