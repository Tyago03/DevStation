import { Eraser, Pause, Play, Search, Terminal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LogLine } from '../../shared/contracts';
import { messageOf, valueOf } from '../hooks/useWorkspace';
import { ErrorBanner, Loading } from './common';
import { TermHelp } from '../help/HelpPage';

const MAX_LINES = 5000;
const MAX_CHARACTERS = 1_000_000;
export function boundLogLines(lines: LogLine[]) {
  let characters = 0;
  let start = lines.length;
  while (start > 0 && lines.length - start < MAX_LINES) {
    const next = lines[start - 1];
    if (characters + next.line.length > MAX_CHARACTERS) break;
    characters += next.line.length; start -= 1;
  }
  return { lines: lines.slice(start), truncated: start > 0 };
}

export function LogConsole({ runId, active = true }: { runId: string; active?: boolean }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [stream, setStream] = useState('all');
  const [paused, setPaused] = useState(false);
  const [clearAfter, setClearAfter] = useState(-1);
  const viewport = useRef<HTMLDivElement>(null);
  const latestSequence = useRef(-1);
  const refreshSnapshot = useRef<() => void>(() => undefined);

  useEffect(() => {
    let live = true;
    let pending: LogLine[] = [];
    let snapshotReady = false;
    let snapshotPending = false;
    setLines([]); setTruncated(false); setError(undefined); setLoading(true); setClearAfter(-1); latestSequence.current = -1;
    // Subscribe before reading the snapshot; sequence IDs remove the overlap.
    const unsubscribe = window.devstation.runs.onLog(runId, line => {
      if (!live) return;
      latestSequence.current = Math.max(latestSequence.current, line.sequence);
      pending.push(line);
      if (pending.length > MAX_LINES) { pending = pending.slice(-MAX_LINES); setTruncated(true); }
    });
    const readSnapshot = () => {
      if (!live || snapshotPending) return;
      snapshotPending = true;
      void window.devstation.runs.logs(runId).then(result => {
        if (!live) return;
        const snapshot = valueOf(result);
        const batch = pending; pending = [];
        setLines(previous => {
          const unique = new Map([...previous, ...snapshot.lines, ...batch].map(line => [line.sequence, line]));
          const bounded = boundLogLines([...unique.values()].sort((a, b) => a.sequence - b.sequence));
          if (snapshot.truncated || bounded.truncated) setTruncated(true);
          if (bounded.lines.length) latestSequence.current = Math.max(latestSequence.current, bounded.lines[bounded.lines.length - 1].sequence);
          return bounded.lines;
        });
        setError(undefined);
      }).catch(problem => { if (live) setError(messageOf(problem)); }).finally(() => {
        snapshotPending = false;
        if (live) { setLoading(false); snapshotReady = true; }
      });
    };
    refreshSnapshot.current = readSnapshot;
    readSnapshot();
    const timer = window.setInterval(() => {
      if (!snapshotReady || pending.length === 0) return;
      const batch = pending; pending = [];
      setLines(previous => {
        const last = previous.length ? previous[previous.length - 1].sequence : -1;
        const bounded = boundLogLines([...previous, ...batch.filter(line => line.sequence > last)]);
        if (bounded.truncated) setTruncated(true);
        return bounded.lines;
      });
    }, 120);
    // The bounded event queue can shed output during a flood. Reconcile with
    // the main-process ring buffer so its truncation state stays authoritative.
    const reconcileTimer = window.setInterval(() => { if (snapshotReady) readSnapshot(); }, 2000);
    return () => { live = false; window.clearInterval(timer); window.clearInterval(reconcileTimer); unsubscribe(); };
  }, [runId]);

  const filtered = useMemo(() => lines.filter(line => line.sequence > clearAfter && (stream === 'all' || line.stream === stream) && line.line.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [lines, clearAfter, stream, query]);
  useEffect(() => { if (!paused && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; }, [filtered, paused]);

  return <section className="log-console" aria-label="Task output"><div className="console-heading"><div><Terminal size={16} /><strong>Output</strong><span>Session only</span></div><div className="console-actions"><button className="icon-button" aria-label={paused ? 'Resume autoscroll' : 'Pause autoscroll'} title={paused ? 'Resume autoscroll' : 'Pause autoscroll'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button><button className="icon-button" aria-label="Clear view only" title="Clear view only" onClick={() => setClearAfter(latestSequence.current)}><Eraser size={16} /></button></div></div>
    <div className="console-toolbar"><label className="search-field"><Search size={14} /><input aria-label="Search logs" value={query} placeholder="Find in output…" onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter log stream" value={stream} onChange={event => setStream(event.target.value)}><option value="all">All output</option><option value="stdout">Normal output (stdout)</option><option value="stderr">Errors / diagnostics (stderr)</option></select><span>{paused ? 'Autoscroll paused' : 'Following output'}</span></div>
    {error && <ErrorBanner message={`${error}${lines.length ? ' Showing output already received; more may be unavailable.' : ''}`} onRetry={() => refreshSnapshot.current()} />}
    {truncated && <div className="log-truncated" role="status">Older output hidden to limit memory usage.</div>}
    <div className="console-viewport" ref={viewport} tabIndex={0} aria-label="Log lines">{loading ? <Loading label="Reading task output…" /> : filtered.length === 0 ? <div className="console-empty">{error ? 'Output could not be read. Try again to check for messages.' : query || stream !== 'all' ? 'No output matches your filters.' : clearAfter >= 0 ? 'View cleared. Only new output will appear here.' : active ? 'Waiting for output…' : 'This task ended without captured output.'}</div> : filtered.map(line => <div className={`log-line ${line.stream}`} key={line.sequence}><time title={line.timestamp}>{new Date(line.timestamp).toLocaleTimeString([], { hour12: false })}</time><span className="log-stream">{line.stream}</span><span className="log-text">{line.line || ' '}</span></div>)}</div>
    <div className="console-footer"><span>{filtered.length.toLocaleString()} lines in view</span><span>Output is kept in memory for this session.</span></div>
    <div className="inline-help"><TermHelp topic="output" summary="What do stdout, stderr, and Clear view mean?">Normal output (stdout) holds regular messages. Errors (stderr) can include routine diagnostics. Clear view hides earlier messages; the task keeps running.</TermHelp></div>
  </section>;
}
