import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import type { ZodType } from 'zod';
import { configSchema, helpSchema, idSchema, noInput, settingsSchema } from '../../shared/schemas';
import { AppError } from '../../shared/errors';
import type { Result } from '../../shared/contracts';
import type { createServices } from '../services';
import { isTrustedSender } from '../security/sender';
import { canonicalDirectory, pathIdentity } from '../security/paths';

export function registerIpc(window: BrowserWindow, url: string, services: ReturnType<typeof createServices>) {
  const selectedExecutables = new Set<string>();
  const pending = new Set<string>();
  const assertNotPending = (id: string) => { if (pending.has(id)) throw new AppError('BUSY', 'Finish the current confirmation first.'); };
  function handle<T, R>(channel: string, schema: ZodType<T>, action: (value: T) => R | Promise<R>) {
    ipcMain.handle(channel, async (event, payload: unknown): Promise<Result<R>> => {
      try {
        if (!isTrustedSender({ id: event.sender.id, frameIsMain: event.senderFrame === event.sender.mainFrame, url: event.senderFrame?.url ?? '' }, { id: window.webContents.id, url })) {
          throw new AppError('FORBIDDEN', 'This request did not come from the DevStation window.');
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) throw new AppError('INVALID_INPUT', 'Check the supplied values and try again.');
        return { ok: true, data: await action(parsed.data) };
      } catch (error) {
        if (error instanceof AppError) return { ok: false, error: { code: error.code, message: error.message, retryable: error.retryable } };
        return { ok: false, error: { code: 'OP_FAILED', message: 'The operation could not be completed. Check that the folder or tool is available and try again.', retryable: true } };
      }
    });
  }
  async function confirm(title: string, message: string, detail: string, button: string) {
    const result = await dialog.showMessageBox(window, { type: 'warning', title, message, detail, buttons: ['Cancel', button], defaultId: 0, cancelId: 0, noLink: true });
    return result.response === 1;
  }
  handle('projects:list', noInput, () => services.projects.list());
  handle('projects:choose-and-add', noInput, async () => {
    const choice = await dialog.showOpenDialog(window, { title: 'Add a Git project', properties: ['openDirectory'] });
    if (choice.canceled || !choice.filePaths[0]) return null;
    const selected = await canonicalDirectory(choice.filePaths[0]);
    const project = await services.projects.add(selected);
    if (pathIdentity(selected) !== pathIdentity(project.path)) {
      await dialog.showMessageBox(window, { type: 'info', title: 'Repository root found', message: 'Added the Git repository containing this folder.', detail: `Selected folder: ${selected}\nRepository root: ${project.path}`, buttons: ['OK'], noLink: true });
    }
    return project;
  });
  handle('projects:remove', idSchema, async id => {
    const project = services.projects.get(id);
    if (await confirm('Remove project', `Remove ${project.name} from DevStation?`, 'Only the catalog entry and its run configurations will be removed. Your folder and Git repository stay on disk.', 'Remove from DevStation')) services.projects.remove(id);
  });
  handle('projects:git-overview', idSchema, id => services.git.overview(services.projects.get(id).path));
  handle('projects:open-folder', idSchema, async id => {
    const savedPath = services.projects.get(id).path;
    const actualPath = await canonicalDirectory(savedPath);
    if (pathIdentity(actualPath) !== pathIdentity(savedPath)) throw new AppError('PATH_CHANGED', 'This folder points to a different location. Review it and import it again.');
    const result = await shell.openPath(actualPath);
    if (result) throw new AppError('PATH_MISSING', 'This folder is no longer available at its saved path.');
  });
  handle('configs:list', idSchema, id => services.configs.list(id));
  handle('configs:choose-executable', noInput, async () => {
    const choice = await dialog.showOpenDialog(window, { title: 'Choose a trusted Windows executable', properties: ['openFile'], filters: [{ name: 'Windows executable', extensions: ['exe'] }] });
    const file = choice.canceled ? null : choice.filePaths[0] ?? null;
    if (file) selectedExecutables.add(file.toLowerCase());
    return file;
  });
  handle('configs:choose-working-dir', idSchema, async id => {
    const choice = await dialog.showOpenDialog(window, { title: 'Choose a directory inside this project', defaultPath: services.projects.get(id).path, properties: ['openDirectory'] });
    return choice.canceled ? null : choice.filePaths[0] ?? null;
  });
  handle('configs:save', configSchema, async input => {
    if (input.id) assertNotPending(input.id);
    if (input.id) pending.add(input.id);
    try {
      const old = input.id ? services.configs.get(input.id) : null;
      if (old?.executablePath.toLowerCase() !== input.executablePath.toLowerCase() && !selectedExecutables.has(input.executablePath.toLowerCase())) throw new AppError('EXE_NOT_SELECTED', 'Choose the executable using the file picker.');
      return await services.configs.save(input);
    } finally { if (input.id) pending.delete(input.id); }
  });
  handle('configs:delete', idSchema, async id => {
    assertNotPending(id);
    const config = services.configs.get(id);
    if (await confirm('Delete configuration', `Delete ${config.label}?`, 'Only this saved run configuration will be deleted.', 'Delete configuration')) { assertNotPending(id); services.configs.delete(id); }
  });
  handle('runs:list', noInput, () => services.runs.list());
  handle('runs:logs', idSchema, id => services.runs.logs(id));
  handle('runs:start', idSchema, async id => {
    assertNotPending(id); pending.add(id);
    try {
      const config = services.configs.get(id);
      const detail = `Running this tool will execute code on your computer. Only run projects and executables you trust.\n\nExecutable: ${config.executablePath}\nArguments (separate values): ${JSON.stringify(config.args)}\nWorking directory: ${config.workingDir}`;
      return await confirm('Run locally', `Start ${config.label}?`, detail, 'Start run') ? await services.runs.start(id) : null;
    } finally { pending.delete(id); }
  });
  handle('runs:stop', idSchema, async id => {
    const run = services.runs.get(id);
    return await confirm('Stop this run', `Stop ${run.label}?`, 'Windows will terminate the managed main process. It cannot be guaranteed to shut down gracefully. Child processes may still be running; DevStation will not terminate unrelated processes.', 'Stop run') ? services.runs.stop(id) : null;
  });
  handle('ports:list', noInput, () => services.ports.list());
  handle('diagnostics:check', noInput, () => services.diagnostics.check());
  handle('settings:get', noInput, () => services.store.getSettings());
  handle('settings:update', settingsSchema, value => services.store.updateSettings(value));
  handle('app:info', noInput, () => ({ version: app.getVersion(), platform: process.platform }));
  const helpUrls = { git: 'https://git-scm.com/downloads/win', node: 'https://nodejs.org/en/download', python: 'https://www.python.org/downloads/windows/', readme: 'https://github.com/Tyago03/DevStation#readme' };
  handle('app:open-help', helpSchema, target => shell.openExternal(helpUrls[target]));
}
