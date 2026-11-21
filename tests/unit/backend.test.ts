import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parsePorcelain } from '../../src/main/services/git';
import { parseNetstat } from '../../src/main/services/ports';
import { cleanLog, LogBuffer } from '../../src/main/services/logs';
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
