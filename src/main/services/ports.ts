import path from 'node:path';
import type { ListeningPort } from '../../shared/contracts';
import { AppError } from '../../shared/errors';
import { runCommand } from './command';

export function parseNetstat(output: string): ListeningPort[] {
  const ports = new Map<string, ListeningPort>();
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields[0]?.toUpperCase() !== 'TCP' || !['LISTENING', 'ESCUTANDO'].includes(fields[3]?.toUpperCase())) continue;
    const endpoint = fields[1].match(/^(?:\[([^\]]+)\]|(.+)):(\d+)$/);
    if (!endpoint) continue;
    const address = endpoint[1] ?? endpoint[2]; const port = Number(endpoint[3]);
    const pid = /^\d+$/.test(fields[4] ?? '') ? Number(fields[4]) : null;
    if (port < 1 || port > 65535) continue;
    const visibility = address === '::1' || /^127\./.test(address) ? 'loopback' : address === '::' || address === '0.0.0.0' ? 'all-interfaces' : 'other';
    ports.set(`${address}:${port}:${pid}`, { protocol: 'tcp', address, port, pid, visibility });
  }
  return [...ports.values()].sort((a, b) => a.port - b.port || a.address.localeCompare(b.address));
}
export class PortsService {
  async list() {
    if (process.platform !== 'win32') throw new AppError('PORTS_UNAVAILABLE', 'TCP inspection is available on Windows in this version.');
    try {
      const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'netstat.exe');
      const result = await runCommand(executable, ['-ano', '-p', 'tcp'], { timeout: 8_000 });
      if (result.code !== 0) throw new Error('netstat failed');
      return { ports: parseNetstat(result.stdout), checkedAt: new Date().toISOString() };
    } catch {
      throw new AppError('PORTS_UNAVAILABLE', 'TCP listening ports could not be checked. Try again; no processes were changed.', true);
    }
  }
}
