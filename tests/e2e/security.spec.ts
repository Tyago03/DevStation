import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Settings } from '../../src/shared/contracts';

async function removeOwnedFixture(root: string) {
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('DevStation-security-e2e-')) throw new Error('Refusing unsafe fixture cleanup.');
  await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

test('production document enforces CSP, permissions, IPC sender and local-only navigation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'DevStation-security-e2e-'));
  let desktop: ElectronApplication | undefined;
  try {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>;
    desktop = await electron.launch({ args: ['.', `--user-data-dir=${root}`], env });
    const page = await desktop.firstWindow();
    await page.waitForURL('devstation://app/index.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => ({ node: typeof (window as unknown as { require?: unknown }).require, process: typeof (window as unknown as { process?: unknown }).process, ipc: typeof (window as unknown as { ipcRenderer?: unknown }).ipcRenderer }))).toEqual({ node: 'undefined', process: 'undefined', ipc: 'undefined' });

    // Cancel network requests even if a regression weakens CSP/navigation protection.
    // This observer is test-only; the production document's protections are unchanged.
    await desktop.evaluate(({ session }) => {
      const requests: string[] = [];
      (session as typeof session & { testRequests: string[] }).testRequests = requests;
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => { requests.push(details.url); callback({ cancel: true }); });
    });
    const response = await page.reload();
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    expect(response?.headers()['content-security-policy']).not.toContain('unsafe-inline');
    expect(response?.headers()['content-security-policy']).not.toContain('unsafe-eval');
    await page.evaluate(() => {
      const target = window as Window & { testCspViolations?: string[] };
      target.testCspViolations = [];
      document.addEventListener('securitypolicyviolation', event => target.testCspViolations!.push(event.effectiveDirective));
      const script = document.createElement('script');
      script.textContent = 'window.testUnsafeInlineRan = true';
      document.body.append(script); script.remove();
    });
    await expect.poll(() => page.evaluate(() => (window as Window & { testCspViolations?: string[] }).testCspViolations)).toContain('script-src-elem');
    expect(await page.evaluate(() => (window as Window & { testUnsafeInlineRan?: boolean }).testUnsafeInlineRan)).toBeUndefined();
    expect(await page.evaluate(async () => { try { await fetch('https://devstation-test.invalid/csp'); return 'allowed'; } catch { return 'blocked'; } })).toBe('blocked');
    await expect.poll(() => page.evaluate(() => (window as Window & { testCspViolations?: string[] }).testCspViolations)).toContain('connect-src');
    expect(await page.evaluate(() => new Promise<number>(resolve => navigator.geolocation.getCurrentPosition(() => resolve(0), error => resolve(error.code), { timeout: 5000 })))).toBe(1);

    expect(await page.evaluate(() => window.open('https://devstation-test.invalid/popup') === null)).toBe(true);
    await page.evaluate(() => { const anchor = document.createElement('a'); anchor.href = 'https://devstation-test.invalid/navigation'; document.body.append(anchor); anchor.click(); anchor.remove(); });
    // Electron cancels will-navigate before commitment; Chromium's automation
    // URL bookkeeping can be empty for that aborted attempt. Check the live
    // document and its native WebContents instead of the navigation cache.
    expect(await page.evaluate(() => location.href)).toBe('devstation://app/index.html');
    expect(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getURL())).toBe('devstation://app/index.html');
    expect(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
    expect(await desktop.evaluate(({ session }) => (session as typeof session & { testRequests: string[] }).testRequests)).toEqual([]);

    const invalidSettings = await page.evaluate(() => window.devstation.settings.update({ theme: 'light', unexpected: true } as Settings));
    expect(invalidSettings).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.settings.update({ theme: 'light', tour: { status: 'completed', step: 99 } }))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.app.shutdownAction({ action: 'retry', pid: 1 } as unknown as 'retry'))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.configs.chooseScript('not-a-project', 'python'))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.configs.reviewScript('not-a-config'))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.configs.authorizeScript('11111111-1111-4111-8111-111111111111', 'not-a-review'))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await page.evaluate(() => window.devstation.app.openHelp('readme' as 'git'))).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    const invalidHelp = await page.evaluate(() => window.devstation.app.openHelp('https://devstation-test.invalid' as 'git'));
    expect(invalidHelp).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    // Stub only the final OS browser opener to check the allowlist without opening a website.
    await desktop.evaluate(({ shell }) => {
      const urls: string[] = [];
      (shell as typeof shell & { testHelpUrls: string[] }).testHelpUrls = urls;
      shell.openExternal = async url => { urls.push(url); };
    });
    expect(await page.evaluate(() => window.devstation.app.openHelp('git'))).toMatchObject({ ok: true });
    expect(await desktop.evaluate(({ shell }) => (shell as typeof shell & { testHelpUrls: string[] }).testHelpUrls)).toEqual(['https://git-scm.com/downloads/win']);

    const unauthorized = await desktop.evaluate(async ({ BrowserWindow }, preload) => {
      const main = BrowserWindow.getAllWindows()[0];
      const other = new BrowserWindow({ show: false, webPreferences: { preload, sandbox: true, contextIsolation: true, nodeIntegration: false } });
      try {
        await other.loadURL(main.webContents.getURL());
        return await other.webContents.executeJavaScript('window.devstation.projects.list()');
      } finally { other.destroy(); }
    }, path.resolve('.vite/build/preload.cjs'));
    expect(unauthorized).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    // Chromium offline emulation is scoped to this isolated app session.
    // It is not a claim that Windows networking was physically disconnected.
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    expect(await page.evaluate(() => window.devstation.settings.get())).toEqual({ ok: true, data: { theme: 'light' } });
    expect(await desktop.evaluate(({ session }) => (session as typeof session & { testRequests: string[] }).testRequests)).toEqual([]);
  } finally {
    await desktop?.close();
    await removeOwnedFixture(root);
  }
});
