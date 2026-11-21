import type { LogLine, RunLogs } from '../../shared/contracts';
import { StringDecoder } from 'node:string_decoder';

class AnsiSanitizer {
  private state: 'text' | 'escape' | 'csi' | 'osc' | 'osc-escape' = 'text';
  write(value: string): string {
    // Linear scan: repeated unterminated OSC escapes must never cause regex backtracking.
    const parts: string[] = [];
    let start = 0;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      if (this.state === 'text') {
        if (code === 27) { parts.push(value.slice(start, index)); this.state = 'escape'; }
        else if ((code < 32 && code !== 9 && code !== 10) || code === 127) {
          parts.push(value.slice(start, index)); start = index + 1;
        }
      } else if (this.state === 'escape') {
        this.state = code === 91 ? 'csi' : code === 93 ? 'osc' : 'text';
        start = index + 1;
      } else if (this.state === 'csi') {
        if (code >= 64 && code <= 126) { this.state = 'text'; start = index + 1; }
      } else if (this.state === 'osc') {
        if (code === 7) { this.state = 'text'; start = index + 1; }
        else if (code === 27) this.state = 'osc-escape';
      } else if (code === 92 || code === 7) { this.state = 'text'; start = index + 1; }
      else this.state = code === 27 ? 'osc-escape' : 'osc';
    }
    if (this.state === 'text') parts.push(value.slice(start));
    return parts.join('');
  }
}

export function cleanLog(value: string): string { return new AnsiSanitizer().write(value); }

/** One instance per stdout/stderr stream; neither UTF-8 nor ANSI state crosses streams. */
export class LogStream {
  private decoder = new StringDecoder('utf8');
  private sanitizer = new AnsiSanitizer();
  private pending = '';
  private flushTimer?: ReturnType<typeof setTimeout>;
  private ended = false;
  private segmented = false;
  // Extremely long lines are emitted as bounded segments without losing text.
  private readonly maxCharacters = 16_384;
  constructor(private emit: (line: string) => void) {}
  write(chunk: Buffer): void {
    if (!this.ended) this.accept(this.sanitizer.write(this.decoder.write(chunk)));
  }
  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.cancelFlush();
    this.accept(this.sanitizer.write(this.decoder.end()));
    if (this.pending) { this.emit(this.pending); this.pending = ''; }
  }
  private accept(value: string): void {
    let start = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== '\n') continue;
      this.append(value.slice(start, index));
      this.cancelFlush();
      // Preserve real blank lines without adding an empty segment to a long line.
      if (this.pending || !this.segmented) this.emit(this.pending);
      this.pending = ''; this.segmented = false; start = index + 1;
    }
    this.append(value.slice(start));
  }
  private append(value: string): void {
    this.pending += value;
    while (this.pending.length >= this.maxCharacters) {
      let boundary = this.maxCharacters;
      const last = this.pending.charCodeAt(boundary - 1);
      if (last >= 0xd800 && last <= 0xdbff) boundary -= 1;
      this.emit(this.pending.slice(0, boundary));
      this.pending = this.pending.slice(boundary); this.segmented = true;
      this.cancelFlush();
    }
    this.scheduleFlush();
  }
  private scheduleFlush(): void {
    if (this.ended || !this.pending || this.flushTimer) return;
    // First-pending deadline, not a debounce: continuous small writes cannot defer output.
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      if (this.pending) {
        this.emit(this.pending); this.pending = ''; this.segmented = true;
      }
    }, 200);
    this.flushTimer.unref();
  }
  private cancelFlush(): void {
    clearTimeout(this.flushTimer); this.flushTimer = undefined;
  }
}

export class LogBuffer {
  private lines: (LogLine | undefined)[];
  private first = 0;
  private count = 0;
  private bytes = 0;
  private sequence = 0;
  private truncated = false;
  constructor(private maxBytes = 2 * 1024 * 1024, private maxLines = 5000) {
    this.lines = new Array<LogLine | undefined>(maxLines);
  }
  push(runId: string, stream: LogLine['stream'], text: string): LogLine {
    let line = cleanLog(text);
    if (Buffer.byteLength(line, 'utf8') > this.maxBytes) {
      line = Buffer.from(line, 'utf8').subarray(-Math.floor(this.maxBytes / 2)).toString('utf8');
      this.truncated = true;
    }
    const entry: LogLine = { sequence: ++this.sequence, runId, stream, timestamp: new Date().toISOString(), line };
    if (this.count === this.maxLines) this.dropOldest();
    this.lines[(this.first + this.count) % this.maxLines] = entry;
    this.count += 1;
    this.bytes += Buffer.byteLength(line, 'utf8');
    while (this.bytes > this.maxBytes) this.dropOldest();
    return entry;
  }
  private dropOldest() {
    const removed = this.lines[this.first];
    if (removed) this.bytes -= Buffer.byteLength(removed.line, 'utf8');
    this.lines[this.first] = undefined;
    this.first = (this.first + 1) % this.maxLines; this.count -= 1; this.truncated = true;
  }
  snapshot(): RunLogs {
    const lines = Array.from({ length: this.count }, (_, index) => this.lines[(this.first + index) % this.maxLines]!);
    return { lines, truncated: this.truncated };
  }
}
