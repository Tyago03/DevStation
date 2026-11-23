# Troubleshooting

## Git or a project is unavailable

Check Diagnostics first. Git inspection requires Git for Windows to be discoverable by the application. Restart DevStation after changing system tool availability. An empty repository is valid but has no last commit. A bare repository has no working tree and is outside the import flow.

If Git reports dubious ownership, DevStation must show the refusal without changing global `safe.directory`. Review ownership and trust outside the app; do not automatically trust every directory. If a registered folder has moved or disappeared, its entry should remain visible. Removing that entry only removes DevStation metadata.

## A task does not start

Select an existing Windows `.exe`. The app does not offer built-in `.cmd`, `.bat` or shell-command recipes. For a local web server, choose the guided Python server setup, select a trusted `python.exe` and use a free port. It fixes isolated/unbuffered Python arguments and binds to `127.0.0.1`. The working directory must resolve inside the imported project, including when junctions are involved.

Executable files can disappear or permissions can change after saving; Start must validate again and report the error. Arguments containing `&`, `|`, spaces, or quotes are passed as argument values rather than shell syntax. A nonzero exit code is a task result: inspect its stderr without assuming DevStation itself failed.

## A saved script has changed

Choose **Review changes and authorize** to inspect the current saved script. The app does not keep its old contents, so the preview is the current file rather than a historical diff. Review it, request authorization and confirm the native prompt only if you trust the change. Cancellation preserves the previous saved configuration. Authorization saves the new fingerprint; Start is still a separate action and confirmation.

A review expires after five minutes and must be repeated if the script or configuration changes again. Files larger than 256 KiB, binary files or invalid UTF-8 cannot use the in-app preview. Review those in an editor, then use Edit setup and the native file picker to select and save the script again. Path changes and files outside the registered project remain rejected.

## Understand an ended task

**Completed successfully** means confirmed exit with code zero, including when it races with Stop. Otherwise, **Stopped by user** means an accepted Stop followed by confirmed exit; it also covers canceling a pending start before any process was created. **Exited with error** means a nonzero exit without an accepted Stop. **Unknown** means the outcome could not be determined reliably; an unconfirmed stop remains active rather than being presented as exited. These states describe the managed process only, not all descendants.

## Stop leaves a service running

Stop targets the managed main process, and Windows does not guarantee that descendants exit with it. Check the Ports page or an external trusted system tool to investigate remaining processes. DevStation never takes ownership of an unrelated process based on its PID and does not expose a kill button in Ports.

## Ports or npm cannot be checked

TCP inspection uses the operating system's `netstat.exe`; a timeout or denied operation should display an error, not an empty successful result. Some endpoint/PID information may be unavailable. All-interface binding describes local listeners; firewall and routing determine external reachability.

`npm` commonly resolves to `npm.cmd` on Windows. **Not checked** is expected for that unsupported diagnostic. DevStation does not install tools or use a fallback shell silently.

## SQLite fails to load during development

`better-sqlite3` is a native module and must match Node or Electron's ABI. Run Node-based tests before `npm run make`, which rebuilds the module for Electron. If returning to Node tests after packaging causes a module-version mismatch, rebuild the dependency for Node with `npm rebuild better-sqlite3`, then rerun the affected tests. Packaging must subsequently rebuild it for Electron again.

A clean `npm ci` recreates the locked dependency tree. If a native binary is unavailable, compilation may need C++ Build Tools; install build tooling only after the concrete error demonstrates the need. Do not replace native files with binaries downloaded from an untrusted source.

If the packaged app says it cannot find `better-sqlite3`, inspect package inclusion before assuming an ABI error. Forge's Vite defaults can exclude runtime dependencies while leaving a successful build. DevStation explicitly includes compiled assets, package metadata, and production `node_modules`; always verify the actual packaged executable after changing this policy.

## Windows App Control blocks build tooling

The initial Forge generator was blocked while loading its `oxfmt` binding. This project uses a locally constructed Forge scaffold and ESLint tooling to avoid that dependency. Do not turn off Windows security protections to resolve a tool error. Record the exact blocked component and use a compatible supported toolchain where possible.

## Database recovery

Close DevStation before copying or replacing database files. Its metadata database is `devstation.sqlite` under the application's Electron `userData` directory; WAL/SHM sidecars may also exist. Preserve the entire directory before attempting recovery. Do not delete a database merely because opening or migration failed.

A migration backup, when available, is a recovery source. Retain the failed database and sidecars, restore only from a backup whose origin you understand, and verify your catalog after reopening. Recovery affects DevStation's saved registrations and configurations, not the repositories themselves. Never attach a personal database or private logs to a public report.

## Unsigned ZIP and removal

The package is unsigned. Windows may block it according to the machine's policy. Verify the artifact's SHA-256 and follow your organization's software policy; do not disable Smart App Control, Defender or SmartScreen. The specific v0.1 blocks and later v0.2.0 local successes are historical observations about different bytes; neither guarantees that another build will launch. [Release evidence](RELEASE.md) identifies the current tested artifact and environment.

Extract the whole ZIP to a user-writable location and open its executable. This distribution has no installer/uninstaller. Removing the extracted application directory does not intentionally remove project repositories or the separate `userData` directory. Retaining local settings is the default; deletion of that data is a separate deliberate action.
