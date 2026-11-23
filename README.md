# DevStation

**Your local development workspace, in one place.**

DevStation brings local Git projects, running tasks, output, tool checks and TCP listeners into a Windows desktop app. It uses Electron, React, TypeScript and SQLite. The interface is in English.

**Status: private v0.2.0 preview, under validation.** This is not a public release. [QA](docs/QA.md) records technical results and remaining gates; [RELEASE](docs/RELEASE.md) identifies exact builds. A successful CI run does not remove the local Smart App Control signing-policy block.

## Getting started

Open **Documentation** inside the app for searchable offline help. The optional five-step tour can be skipped, resumed and restarted in Settings. **Explore an example workspace** uses synthetic, in-memory data without creating files, projects, listeners or processes.

1. Add a local Git project. Its folder stays where it is.
2. Check its branch and changes. Inspection does not commit, fetch, push or alter Git trust.
3. Add a launch setup: Python script, Python local web server, Node.js script or Advanced executable.
4. Select the installed program manually. Select scripts inside the project and review the exact program, separate arguments and working folder.
5. Save, then explicitly Start and confirm. Saving never executes a task. Follow its output in Runs.

The guided server uses Python's isolated `http.server` on **127.0.0.1 only**, with a validated port. Files in the selected folder are served to software on this computer. Current-directory module lookup cannot replace the standard-library server. Guided script selections are fingerprinted and checked on Save and Start; changes require reselection and review.

## Included in this preview

- Local catalog and read-only Git status/latest commit.
- Guided Python/Node launch setups and manually selected advanced Windows executables.
- Confirmed start/stop, bounded output and session-owned process control.
- Safe closing: uncertain stops keep the window open; retry and a second Quit anyway confirmation.
- TCP inspection and diagnostics with not-checked, failed and last-successful states.
- Offline/contextual help, optional tour and isolated example workspace.
- SQLite metadata/preferences, with a backed-up migration from v0.1.

There is no account, cloud sync, telemetry, AI integration or automatic execution. Built-in shell recipes (`npm run`, `.cmd`, `.bat`, PowerShell profiles), arbitrary PID termination and automatic updates are outside this preview. Advanced executable can launch an explicitly selected interpreter with user-supplied arguments. npm diagnostics remain **Not checked** because its Windows shell wrapper is unsupported.

## Development

Use Windows x64, Node.js 24 LTS, npm and Git. Validation uses Node 24.21.0, npm 11.19.0 and Git 2.55.0; exact dependencies are locked.

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm start
```

Build the unsigned ZIP before desktop tests:

```powershell
npm run make -- --arch=x64
npm run test:e2e
```

Extract the entire archive from `out/make/zip/win32/x64/` before opening `DevStation.exe`. Electron supplies its runtime; tasks need the selected program and Git inspection needs Git. Use repository scripts so SQLite matches its runtime.

Windows can block the unsigned EXE before startup. Follow the machine's software policy; do not disable protections. [Signing research](docs/SIGNING_OPTIONS.md) is preparation only. No certificate was purchased, signing performed or public download published.

## Safety and local data

Tasks use your Windows permissions. Select trusted projects/programs. Fingerprinting detects script changes; it is not a sandbox or an audit of dependencies. A file can still change between the final check and the interpreter opening it.

Stop targets only this session's managed main process; children may remain. Unknown is not Stopped. After a crash/restart, DevStation does not reclaim earlier processes. An uncertain stop keeps the app open; Quit anyway requires a separate warning confirmation.

Removing a project removes only its catalog entry and saved setups. Removing the ZIP/extracted app preserves imported projects and separate userData. SQLite stores paths, launch metadata, fingerprints, theme and tour state; output remains in bounded session memory. Upgrades back up an existing database before migration. See [recovery](docs/TROUBLESHOOTING.md) and [security design](docs/SECURITY.md).

## Records

- [v0.2 roadmap and briefing provenance](docs/ROADMAP.md)
- [QA](docs/QA.md), [build identities](docs/RELEASE.md), [changelog](CHANGELOG.md)
- [Architecture](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [design](docs/DESIGN.md)
- [Human study protocol](docs/USABILITY_STUDY.md) — no participant results yet
- [Publication/privacy checklist](docs/PUBLICATION_CHECKLIST.md), [contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md), [third-party notices](docs/THIRD_PARTY.md)

Windows 10, physical offline operation, native Windows display scaling, human usability and trusted local distribution remain separate acceptance gates. Agents do not count as human participants. The repository remains private until a separate publication decision.

## License

Original source is [MIT licensed](LICENSE). Dependencies retain their own licenses/notices.
