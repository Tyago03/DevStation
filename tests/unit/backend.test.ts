import { describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { parsePorcelain } from '../../src/main/services/git';
import { parseNetstat } from '../../src/main/services/ports';
import { cleanLog, LogBuffer, LogStream } from '../../src/main/services/logs';
import { isInside } from '../../src/main/security/paths';
import { localEnvironment } from '../../src/main/services/command';

describe('machine-readable Git status', () => {
  it('counts tracked, untracked, staged and conflicts separately', () => {
    expect(parsePorcelain(' M one\0?? new file\0A  added\0MM both\0UU conflict\0')).toEqual({ modified: 3, untracked: 1, staged: 3 });
  });
  it('consumes rename source even if its name resembles a status record', () => {
    expect(parsePorcelain('R  new name\0?? old name\0 M café 日本語\0')).toEqual({ modified: 1, untracked: 0, staged: 1 });
  });
  it('handles empty output and ignored records', () => {
    expect(parsePorcelain('')).toEqual({ modified: 0, untracked: 0, staged: 0 });
    expect(parsePorcelain('!! ignore\0')).toEqual({ modified: 0, untracked: 0, staged: 0 });
  });
});

describe('TCP inspection parser', () => {
  it('parses IPv4, IPv6 and observed Portuguese states without active connections', () => {
    const ports = parseNetstat('  TCP    127.0.0.1:8765   0.0.0.0:0   LISTENING   123\n TCP [::1]:5000 [::]:0 LISTENING 20\n TCP 0.0.0.0:80 0.0.0.0:0 ESCUTANDO 1\n TCP [::]:443 [::]:0 LISTENING 9\n TCP 127.0.0.1:2345 127.0.0.1:8765 ESTABLISHED 456');
    expect(ports.map((port) => [port.port, port.visibility])).toEqual([[80, 'all-interfaces'], [443, 'all-interfaces'], [5000, 'loopback'], [8765, 'loopback']]);
    expect(ports[3].pid).toBe(123);
  });
  it('deduplicates exact endpoints and rejects invalid ports', () => {
    expect(parseNetstat('TCP 127.0.0.1:99 0.0.0.0:0 LISTENING 1\nTCP 127.0.0.1:99 0.0.0.0:0 LISTENING 1\nTCP 127.0.0.1:99999 0.0.0.0:0 LISTENING 2')).toHaveLength(1);
  });
  it('keeps unavailable PID explicit', () => {
    expect(parseNetstat('TCP 192.168.1.10:999 0.0.0.0:0 LISTENING -')[0]).toMatchObject({ pid: null, visibility: 'other' });
  });
});

describe('bounded plain text logs', () => {
  it('strips ANSI/OSC and unsafe controls but leaves HTML as text', () => {
    expect(cleanLog('\x1b[31m<script>alert(1)</script>\x1b[0m\x00\x1b]0;hidden\x07')).toBe('<script>alert(1)</script>');
  });
  it('retains newest lines and monotonic sequence when capped', () => {
    const buffer = new LogBuffer(100, 2);
    buffer.push('run', 'stdout', 'one'); buffer.push('run', 'stderr', 'two'); buffer.push('run', 'stdout', 'three');
    expect(buffer.snapshot()).toMatchObject({ truncated: true, lines: [{ sequence: 2, line: 'two' }, { sequence: 3, line: 'three' }] });
  });
  it('bounds a 3 MB newline-free chunk', () => {
    const buffer = new LogBuffer();
    buffer.push('run', 'stdout', 'x'.repeat(3 * 1024 * 1024));
    expect(buffer.snapshot().truncated).toBe(true);
    expect(Buffer.byteLength(buffer.snapshot().lines[0].line)).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
  it('drops malformed OSC escapes with linear work', () => {
    const started = performance.now();
    expect(cleanLog('\x1b]'.repeat(32000))).toBe('');
    expect(performance.now() - started).toBeLessThan(1000);
  });
  it('preserves line, UTF-8 and ANSI state across byte-sized chunks', () => {
    const lines: string[] = [];
    const stream = new LogStream(line => lines.push(line));
    const input = Buffer.from('hello \x1b[31mCafé 日本語 🙂\x1b[0m\n\nlast \x1b]0;hidden title\x07line');
    for (const byte of input) stream.write(Buffer.from([byte]));
    expect(lines).toEqual(['hello Café 日本語 🙂', '']);
    stream.end(); stream.end();
    expect(lines).toEqual(['hello Café 日本語 🙂', '', 'last line']);
  });
  it('segments endless lines within a fixed limit without splitting Unicode or losing content', () => {
    const input = 'x'.repeat(16_383) + '🙂'.repeat(20_000);
    const bytes = Buffer.from(input); const byteLines: string[] = [];
    const byteStream = new LogStream(line => byteLines.push(line));
    for (let index = 0; index < bytes.length; index += 1000) byteStream.write(bytes.subarray(index, index + 1000));
    expect(byteLines.length).toBeGreaterThan(0);
    byteStream.end();
    expect(byteLines.join('')).toBe(input);
    expect(byteLines.every(line => line.length <= 16_384 && !line.includes('\ufffd'))).toBe(true);
  });
  it('keeps malformed escape payload bounded until the stream ends', () => {
    const lines: string[] = [];
    const stream = new LogStream(line => lines.push(line));
    stream.write(Buffer.from('visible\x1b]'));
    for (let index = 0; index < 1000; index += 1) stream.write(Buffer.alloc(1024, 120));
    stream.end();
    expect(lines).toEqual(['visible']);
  });
  it('flushes partial output by its first-pending deadline and cancels timers on end', () => {
    vi.useFakeTimers();
    try {
      const lines: string[] = [];
      const stream = new LogStream(line => lines.push(line));
      stream.write(Buffer.from('Server'));
      vi.advanceTimersByTime(150);
      stream.write(Buffer.from(' ready'));
      vi.advanceTimersByTime(49);
      expect(lines).toEqual([]);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(1);
      expect(lines).toEqual(['Server ready']);
      stream.write(Buffer.from('\n\nfinal'));
      expect(lines).toEqual(['Server ready', '']);
      expect(vi.getTimerCount()).toBe(1);
      stream.end();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(lines).toEqual(['Server ready', '', 'final']);
    } finally { vi.useRealTimers(); }
  });
  it('preserves UTF-8 and ANSI state when a partial-line timer flushes', () => {
    vi.useFakeTimers();
    try {
      const lines: string[] = [];
      const stream = new LogStream(line => lines.push(line));
      stream.write(Buffer.from('prefix \x1b[3'));
      vi.advanceTimersByTime(200);
      stream.write(Buffer.from('1mCaf'));
      stream.write(Buffer.from([0xc3]));
      vi.advanceTimersByTime(200);
      stream.write(Buffer.from([0xa9]));
      stream.write(Buffer.from('\x1b[0m\n'));
      stream.end();
      expect(lines).toEqual(['prefix ', 'Caf', 'é']);
      expect(lines.join('')).toBe('prefix Café');
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});

describe('path boundaries and subprocess environment', () => {
  it('allows the root and descendants, rejecting sibling prefixes and parents', () => {
    const root = path.resolve('project');
    expect(isInside(root, root)).toBe(true);
    expect(isInside(root, path.join(root, 'src'))).toBe(true);
    expect(isInside(root, `${root}-other`)).toBe(false);
    expect(isInside(root, path.dirname(root))).toBe(false);
  });
  it('does not forward arbitrary secrets or Node execution overrides', () => {
    const beforeToken = process.env.DEVSTATION_TEST_TOKEN;
    const beforeOptions = process.env.NODE_OPTIONS;
    process.env.DEVSTATION_TEST_TOKEN = 'synthetic-value'; process.env.NODE_OPTIONS = '--require test';
    try {
      const env = localEnvironment();
      expect(env.DEVSTATION_TEST_TOKEN).toBeUndefined(); expect(env.NODE_OPTIONS).toBeUndefined();
    } finally {
      if (beforeToken === undefined) delete process.env.DEVSTATION_TEST_TOKEN; else process.env.DEVSTATION_TEST_TOKEN = beforeToken;
      if (beforeOptions === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = beforeOptions;
    }
  });
});
