import { describe, expect, it } from 'vitest';
import { isTrustedSender } from '../../src/main/security/sender';
import { authorizeScriptSchema, configSchema, idSchema, noInput, settingsSchema } from '../../src/shared/schemas';
describe('privileged IPC boundaries', () => {
  const expected = { id: 10, url: 'devstation://app/index.html' };
  it('accepts only the authorized main frame and exact document', () => {
    expect(isTrustedSender({ ...expected, frameIsMain: true }, expected)).toBe(true);
    for (const input of [
      { id: 11, frameIsMain: true, url: expected.url },
      { id: 10, frameIsMain: false, url: expected.url },
      { id: 10, frameIsMain: true, url: 'https://app/index.html' },
      { id: 10, frameIsMain: true, url: 'devstation://evil/index.html' },
      { id: 10, frameIsMain: true, url: 'devstation://app/other.html' },
      { id: 10, frameIsMain: true, url: 'devstation://app/index.html?other' },
    ]) expect(isTrustedSender(input, expected)).toBe(false);
  });
  it('rejects injected fields, generic commands and malformed IDs', () => {
    expect(idSchema.safeParse(123).success).toBe(false);
    expect(noInput.safeParse({ command: 'whoami' }).success).toBe(false);
    expect(settingsSchema.safeParse({ theme: 'dark', autoRun: true }).success).toBe(false);
    const config = { projectId: '11111111-1111-4111-8111-111111111111', label: 'Server', executablePath: 'C:\\tools\\python.exe', args: ['-m', 'http.server'], workingDir: 'C:\\project' };
    expect(configSchema.safeParse(config).success).toBe(true);
    expect(configSchema.safeParse({ ...config, shell: true }).success).toBe(false);
    expect(configSchema.safeParse({ ...config, args: 'python -m http.server' }).success).toBe(false);
    expect(configSchema.safeParse({ ...config, args: ['a\0b'] }).success).toBe(false);
  });
  it('accepts only a config ID and review token for script authorization, never client content or paths', () => {
    const request = { configId: '11111111-1111-4111-8111-111111111111', token: '22222222-2222-4222-8222-222222222222' };
    expect(authorizeScriptSchema.safeParse(request).success).toBe(true);
    for (const input of [{ ...request, path: 'C:\\other\\script.py' }, { ...request, content: 'unreviewed code' }, { ...request, fingerprint: 'a'.repeat(64) }, { ...request, approved: true }, { ...request, token: '../forged' }]) expect(authorizeScriptSchema.safeParse(input).success).toBe(false);
  });
});
