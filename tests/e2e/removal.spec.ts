import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Result } from '../../src/shared/contracts';

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

async function digest(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

async function projectSnapshot(root: string, relative = ''): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error('The synthetic repository must not contain links.');
    if (entry.isDirectory()) Object.assign(result, await projectSnapshot(root, name));
    else if (entry.isFile()) result[name] = await digest(path.join(root, name));
  }
  return result;
}

async function removeOwnedDescendant(root: string, target: string): Promise<void> {
  const canonical = await realpath(target);
  const relative = path.relative(root, canonical);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || (await lstat(target)).isSymbolicLink()) {
    throw new Error('Refusing to remove a path outside the exact removal-test fixture.');
  }
  await rm(canonical, { recursive: true, force: false, maxRetries: 5, retryDelay: 250 });
}

async function removeOwnedFixture(root: string, temporaryParent: string): Promise<void> {
  const canonical = await realpath(root);
  if (canonical !== root || path.dirname(root) !== temporaryParent || !path.basename(root).startsWith('DevStation-removal-e2e-')) {
    throw new Error('Refusing unsafe removal-test fixture cleanup.');
  }
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}

function extractOwnedArchive(archive: string, destination: string): void {
  const powershell = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  // Paths are passed as environment values, never interpolated into shell code.
  // Validate every archive entry before extracting the test-owned copy.
  const script = String.raw`
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = $env:DEVSTATION_TEST_ARCHIVE
    $destination = [IO.Path]::GetFullPath($env:DEVSTATION_TEST_DESTINATION)
    $prefix = $destination.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    try {
      if ($zip.Entries.Count -eq 0) { throw 'The Windows archive is empty.' }
      foreach ($entry in $zip.Entries) {
        $resolved = [IO.Path]::GetFullPath([IO.Path]::Combine($destination, $entry.FullName))
        if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
          throw 'Archive entry escapes the test-owned extraction directory.'
        }
      }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $destination)
  `;
  execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true, timeout: 60000, stdio: 'pipe',
    env: { ...process.env, DEVSTATION_TEST_ARCHIVE: archive, DEVSTATION_TEST_DESTINATION: destination },
  });
}

test('removing an extracted ZIP copy preserves project files and separate SQLite userData (T47)', async ({ browserName }, testInfo) => {
  test.skip(process.platform !== 'win32', 'This removal check uses the Windows ZIP and Windows extraction APIs.');
  test.skip(browserName !== 'chromium', 'Electron uses Chromium.');
  test.setTimeout(150000);
  const metadata = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')) as { version: string };
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(metadata.version)) throw new Error('Unexpected package version.');
  const originalArchive = path.resolve('out', 'make', 'zip', 'win32', 'x64', `DevStation-win32-x64-${metadata.version}.zip`);
  await access(originalArchive).catch(() => { throw new Error('Build this version with npm run make before running the removal check.'); });
  const temporaryParent = await realpath(os.tmpdir());
  const root = await realpath(await mkdtemp(path.join(temporaryParent, 'DevStation-removal-e2e-')));
  const archiveCopy = path.join(root, 'application-copy.zip');
  const extracted = path.join(root, 'extracted-application');
  const userData = path.join(root, 'separate-user-data');
  const repository = path.join(root, 'Synthetic repository');
  let desktop: ElectronApplication | undefined;
  try {
    const archiveHash = await digest(originalArchive);
    await copyFile(originalArchive, archiveCopy);
    expect(await digest(archiveCopy)).toBe(archiveHash);
    extractOwnedArchive(archiveCopy, extracted);
    // Forge ZIPs may contain the application at their root or under its platform directory.
    const candidates = [extracted, path.join(extracted, 'DevStation-win32-x64')];
    let applicationDirectory: string | undefined;
    for (const candidate of candidates) {
      if (await access(path.join(candidate, 'DevStation.exe')).then(() => true, () => false)) applicationDirectory = candidate;
    }
    expect(applicationDirectory, 'The copied ZIP must contain the real packaged application.').toBeDefined();
    await access(path.join(applicationDirectory!, 'resources', 'app.asar'));
    expect(path.relative(extracted, userData).startsWith(`..${path.sep}`)).toBe(true);
    expect(path.relative(extracted, repository).startsWith(`..${path.sep}`)).toBe(true);
    await mkdir(repository);
    execFileSync('git', ['init', '-b', 'main', repository], { windowsHide: true, stdio: 'pipe' });
    await writeFile(path.join(repository, 'README.md'), '# Removal fixture\nOnly synthetic, test-owned data.\n');
    await mkdir(path.join(repository, 'src'));
    await writeFile(path.join(repository, 'src', 'literal.txt'), 'Preserve this file and the Git metadata.\n');
    const projectBeforeImport = await projectSnapshot(repository);
    const launch = () => electron.launch({
      args: ['.', `--user-data-dir=${userData}`],
      env: Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined)) as Record<string, string>,
    });

    // This intentionally uses compiled Electron with the same application API.
    // It does not launch the extracted EXE or establish Smart App Control acceptance.
    desktop = await launch();
    const page = await desktop.firstWindow();
    await page.waitForFunction(() => typeof window.devstation?.projects?.list === 'function');
    expect(unwrap(await page.evaluate(() => window.devstation.projects.list()))).toEqual([]);
    await desktop.evaluate(({ dialog }, selected) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
    }, repository);
    const project = unwrap(await page.evaluate(() => window.devstation.projects.chooseAndAdd()));
    expect(project).not.toBeNull();
    expect(project!.path).toBe(await realpath(repository));
    unwrap(await page.evaluate(() => window.devstation.settings.update({ theme: 'light' })));
    expect(unwrap(await page.evaluate(() => window.devstation.runs.list()))).toEqual([]);
    await desktop.close(); desktop = undefined;

    const database = path.join(userData, 'devstation.sqlite');
    const databaseHash = await digest(database);
    const projectBeforeRemoval = await projectSnapshot(repository);
    expect(projectBeforeRemoval).toEqual(projectBeforeImport);

    // The deletion under test touches only the copied ZIP and extracted application.
    await removeOwnedDescendant(root, archiveCopy);
    await removeOwnedDescendant(root, extracted);
    expect(await access(archiveCopy).then(() => true, () => false)).toBe(false);
    expect(await access(extracted).then(() => true, () => false)).toBe(false);
    expect(await digest(database)).toBe(databaseHash);
    expect(await projectSnapshot(repository)).toEqual(projectBeforeRemoval);
    expect(await digest(originalArchive)).toBe(archiveHash);

    desktop = await launch();
    const reopened = await desktop.firstWindow();
    await reopened.waitForFunction(() => typeof window.devstation?.projects?.list === 'function');
    expect(unwrap(await reopened.evaluate(() => window.devstation.projects.list()))).toEqual([project]);
    expect(unwrap(await reopened.evaluate(() => window.devstation.settings.get())).theme).toBe('light');
    expect(unwrap(await reopened.evaluate(() => window.devstation.runs.list()))).toEqual([]);
    await desktop.close(); desktop = undefined;
    expect(await projectSnapshot(repository)).toEqual(projectBeforeRemoval);
    await testInfo.attach('removal-scope', {
      body: JSON.stringify({ archive: path.basename(originalArchive), archiveSha256: archiveHash, databaseSha256BeforeRemoval: databaseHash,
        projectFilesPreserved: Object.keys(projectBeforeRemoval).length, importedProjectIdPreserved: true, themePreserved: true,
        runtime: 'compiled Electron; folder picker stubbed', packagedExecutableLaunch: 'NOT RUN by this test' }, null, 2),
      contentType: 'application/json',
    });
  } finally {
    if (desktop) await desktop.close();
    // Teardown removes the whole synthetic fixture only after the preservation assertions.
    // No original build archive, imported user project or real userData is a cleanup target.
    await removeOwnedFixture(root, temporaryParent);
  }
});
