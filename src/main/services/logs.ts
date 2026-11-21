import type { LogLine, RunLogs } from '../../shared/contracts';

export function cleanLog(value: string): string {
  // Linear scan: repeated unterminated OSC escapes must never cause regex backtracking.
  const parts: string[] = [];
  let state: 'text' | 'escape' | 'csi' | 'osc' | 'osc-escape' = 'text';
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (state === 'text') {
      if (code === 27) { parts.push(value.slice(start, index)); state = 'escape'; }
      else if ((code < 32 && code !== 9 && code !== 10) || code === 127) {
        parts.push(value.slice(start, index)); start = index + 1;
      }
    } else if (state === 'escape') {
      state = code === 91 ? 'csi' : code === 93 ? 'osc' : 'text';
      start = index + 1;
    } else if (state === 'csi') {
      if (code >= 64 && code <= 126) { state = 'text'; start = index + 1; }
    } else if (state === 'osc') {
      if (code === 7) { state = 'text'; start = index + 1; }
      else if (code === 27) state = 'osc-escape';
    } else if (code === 92 || code === 7) { state = 'text'; start = index + 1; }
    else state = code === 27 ? 'osc-escape' : 'osc';
  }
  if (state === 'text') parts.push(value.slice(start));
  return parts.join('');
}

export class LogBuffer {
  private lines: LogLine[] = [];
  private bytes = 0;
  private sequence = 0;
  private truncated = false;
  constructor(private maxBytes = 2 * 1024 * 1024, private maxLines = 5000) {}
  push(runId: string, stream: LogLine['stream'], text: string): LogLine {
    let line = cleanLog(text);
    if (Buffer.byteLength(line, 'utf8') > this.maxBytes) {
      line = Buffer.from(line, 'utf8').subarray(-Math.floor(this.maxBytes / 2)).toString('utf8');
      this.truncated = true;
    }
    const entry: LogLine = { sequence: ++this.sequence, runId, stream, timestamp: new Date().toISOString(), line };
    this.lines.push(entry);
    this.bytes += Buffer.byteLength(line, 'utf8');
    while (this.bytes > this.maxBytes || this.lines.length > this.maxLines) {
      const removed = this.lines.shift();
      if (removed) this.bytes -= Buffer.byteLength(removed.line, 'utf8');
      this.truncated = true;
    }
    return entry;
  }
  snapshot(): RunLogs { return { lines: this.lines.slice(), truncated: this.truncated }; }
}
