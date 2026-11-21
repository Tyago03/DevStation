import type { ToolDiagnostic } from '../../shared/contracts';
import { findTool, runCommand } from './command';

export class DiagnosticService {
  async check(): Promise<ToolDiagnostic[]> {
    const checkedAt = new Date().toISOString();
    const tools: { name: ToolDiagnostic['name']; executables: string[] }[] = [
      { name: 'Git', executables: ['git.exe'] },
      { name: 'Node.js', executables: ['node.exe'] },
      { name: 'Python', executables: ['python.exe', 'py.exe'] },
    ];
    const results = await Promise.all(tools.map(async (tool): Promise<ToolDiagnostic> => {
      let found = false;
      for (const name of tool.executables) {
        const executable = await findTool(name);
        if (!executable) continue;
        found = true;
        try {
          const result = await runCommand(executable, ['--version'], { timeout: 5_000, maxBytes: 8_192 });
          if (result.code === 0) return { name: tool.name, status: 'installed', version: (result.stdout || result.stderr).trim().slice(0, 250), checkedAt };
        } catch { /* Try the Python launcher before reporting unavailable. */ }
      }
      if (found) return { name: tool.name, status: 'error', detail: 'A tool was located but its version check failed or timed out.', checkedAt };
      return { name: tool.name, status: 'not-found', detail: 'No accessible installation was found on PATH.', checkedAt };
    }));
    results.splice(2, 0, { name: 'npm', status: 'not-checked', detail: 'npm.cmd needs a command shell on Windows. Shell wrappers are not supported in v0.1.', checkedAt });
    return results;
  }
}
