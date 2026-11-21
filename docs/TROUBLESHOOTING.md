# Troubleshooting

## Git or a project is unavailable

Check Diagnostics first. Git inspection requires Git for Windows to be discoverable by the application. Restart DevStation after changing system tool availability. An empty repository is valid but has no last commit. A bare repository has no working tree and is outside the import flow.

If Git reports dubious ownership, DevStation must show the refusal without changing global `safe.directory`. Review ownership and trust outside the app; do not automatically trust every directory. If a registered folder has moved or disappeared, its entry should remain visible. Removing that entry only removes DevStation metadata.

## A task does not start

Select an existing Windows `.exe`. The first version does not run `.cmd`, `.bat`, or shell command strings. For example, choose `python.exe` and use separate arguments `-u`, `-m`, `http.server`, and a free port number. `-u` helps make Python output immediately visible. The working directory must resolve inside the imported project, including when junctions are involved.

Executable files can disappear or permissions can change after saving; Start must validate again and report the error. Arguments containing `&`, `|`, spaces, or quotes are passed as argument values rather than shell syntax. A nonzero exit code is a task result: inspect its stderr without assuming DevStation itself failed.

## Stop leaves a service running

Stop targets the managed main process, and Windows does not guarantee that descendants exit with it. Check the Ports page or an external trusted system tool to investigate remaining processes. DevStation never takes ownership of an unrelated process based on its PID and does not expose a kill button in Ports.

## Ports or npm cannot be checked

TCP inspection uses the operating system's `netstat.exe`; a timeout or denied operation should display an error, not an empty successful result. Some endpoint/PID information may be unavailable. All-interface binding describes local listeners; firewall and routing determine external reachability.

`npm` commonly resolves to `npm.cmd` on Windows. If a safe diagnostic is unavailable, **Not checked** is expected in P0. DevStation does not install tools or use a fallback shell silently.

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

The first package is unsigned. Windows may warn because publisher identity is not established. Verify the artifact's SHA-256 against its supplied checksum and follow your organization's software policy; do not disable Defender or SmartScreen.

Extract the whole ZIP to a user-writable location and open its executable. This distribution has no installer/uninstaller. Removing the extracted application directory does not intentionally remove project repositories or the separate `userData` directory. Retaining local settings is the default; deletion of that data is a separate deliberate action.
