import { app, BrowserWindow, dialog, protocol, session } from 'electron';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createServices } from './services';
import { registerIpc } from './ipc/register';
import { ShutdownController } from './lifecycle/shutdown';
import type { LogLine } from '../shared/contracts';

protocol.registerSchemesAsPrivileged([{ scheme: 'devstation', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const productionCsp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'";
let services: ReturnType<typeof createServices> | undefined;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const window = BrowserWindow.getAllWindows()[0]; if (window?.isMinimized()) window.restore(); window?.focus(); });
  void app.whenReady().then(async () => {
    app.setAppUserModelId('com.tyago.devstation');
    const dataOverride = app.commandLine.getSwitchValue('user-data-dir');
    if (dataOverride) app.setPath('userData', path.resolve(dataOverride));
    const assetRoot = path.resolve(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`);
    protocol.handle('devstation', async request => {
      try {
        const url = new URL(request.url);
        if (url.host !== 'app' || request.method !== 'GET') return new Response('Forbidden', { status: 403 });
        const filePath = path.resolve(assetRoot, '.' + decodeURIComponent(url.pathname));
        const relative = path.relative(assetRoot, filePath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
        const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
        const data = await readFile(filePath);
        return new Response(data, { headers: { 'Content-Type': types[path.extname(filePath)] ?? 'application/octet-stream', 'Content-Security-Policy': productionCsp, 'X-Content-Type-Options': 'nosniff' } });
      } catch { return new Response('Not found', { status: 404 }); }
    });
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    // Vite React Refresh injects an inline preamble in development only.
    if (devUrl) session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:* ws://127.0.0.1:*; object-src 'none'; frame-src 'none'; base-uri 'none'"] } }));
    const window = new BrowserWindow({
      width: 1380, height: 900, minWidth: 1050, minHeight: 700, title: 'DevStation', backgroundColor: '#0B1017', autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, preload: path.join(__dirname, 'preload.cjs') },
    });
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.on('will-attach-webview', event => event.preventDefault());
    const expectedUrl = devUrl ?? 'devstation://app/index.html';
    const logQueue: LogLine[] = [];
    let queuedBytes = 0;
    const logTimer = setInterval(() => {
      const batch = logQueue.splice(0, 500);
      queuedBytes -= batch.reduce((total, line) => total + Buffer.byteLength(line.line), 0);
      if (batch.length && !window.isDestroyed()) window.webContents.send('runs:log', batch);
    }, 100);
    logTimer.unref();
    window.on('closed', () => { clearInterval(logTimer); logQueue.length = 0; });
    services = createServices(path.join(app.getPath('userData'), 'devstation.sqlite'), line => {
      logQueue.push(line); queuedBytes += Buffer.byteLength(line.line);
      while (logQueue.length > 2000 || queuedBytes > 2 * 1024 * 1024) queuedBytes -= Buffer.byteLength(logQueue.shift()!.line);
    });
    const runServices = services;
    const shutdown = new ShutdownController({
      activeRuns: () => runServices.runs.active(),
      listRuns: () => runServices.runs.list(),
      stopAll: () => runServices.runs.stopAll(),
      chooseClose: async (runs, alreadyBlocked) => {
        const result = await dialog.showMessageBox(window, {
          type: 'warning', title: alreadyBlocked ? 'Tasks may still be running' : 'Active runs',
          message: alreadyBlocked ? 'The earlier stop could not be confirmed.' : 'Stop active runs and quit?',
          detail: `${runs.map(run => `${run.label} — ${run.state}`).join('\n')}\n\nOnly managed main processes can be stopped. Child processes may still be running.`,
          buttons: alreadyBlocked ? ['Keep DevStation open', 'Try again', 'Quit anyway…'] : ['Keep DevStation open', 'Stop runs and quit'],
          defaultId: 0, cancelId: 0, noLink: true,
        });
        return result.response === 1 ? 'retry' : result.response === 2 && alreadyBlocked ? 'quit-anyway' : 'keep-open';
      },
      confirmQuitAnyway: async runs => {
        const result = await dialog.showMessageBox(window, {
          type: 'warning', title: 'Quit while tasks may still be running?',
          message: 'Leave these tasks without confirming they stopped?',
          detail: `${runs.map(run => run.label).join('\n')}\n\nThese tasks and their child processes may continue after DevStation closes. Reopening DevStation will not take ownership of them. No additional process will be terminated by this action.`,
          buttons: ['Keep DevStation open', 'Quit anyway'], defaultId: 0, cancelId: 0, noLink: true,
        });
        return result.response === 1;
      },
      quit: () => app.quit(),
    });
    registerIpc(window, new URL(expectedUrl).href, services, shutdown);
    window.on('close', event => {
      if (shutdown.isQuitting || (shutdown.status().phase === 'idle' && runServices.runs.active().length === 0)) return;
      event.preventDefault();
      void shutdown.requestClose();
    });
    await window.loadURL(expectedUrl);
  }).catch(() => {
    dialog.showErrorBox('DevStation could not open', 'Local storage or application files could not be opened. Your database has not been deleted. Close other instances and consult the recovery steps in the README.');
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => services?.store.close());
}
