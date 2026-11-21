# DevStation

**Your local development workspace, in one place.**

DevStation is a Windows desktop workspace for local Git projects, explicit run configurations, process output, environment diagnostics, and listening TCP ports. It uses Electron, React, TypeScript, and SQLite.

**Status: v0.1.0 core implemented; packaged-app verification in progress.** Local validation has passed 35 unit, integration, and React tests plus one real Electron workflow test. That Electron test uses mocked native dialogs and is not a packaged-release approval. The first packaged launch exposed a missing SQLite dependency; the packaging fix is being revalidated. See [QA](docs/QA.md) for exact evidence and remaining checks. This repository is private; there is no public release or signed installer.

## First version

The implemented first-version modules cover:

- Importing local Git working trees, searching the project catalog, and opening project folders.
- Inspecting branch, changes, and the latest commit without changing the repository.
- Saving a trusted Windows `.exe`, separate arguments, and a working directory inside the project.
- Starting a configuration explicitly, reading stdout/stderr, and stopping its session-owned main process.
- Inspecting listening TCP ports and checking Git, Node.js, npm, and Python availability.
- Keeping projects, configurations, and appearance preferences in a local SQLite database.

No account, AI service, cloud sync, telemetry, or automatic project execution is planned for v0.1. Git operations are read-only. Shell scripts (`.cmd`, `.bat`, and PowerShell profiles), `npm run`, arbitrary PID termination, and automatic updates are outside this version.

## Development

Use Windows x64, Node.js 24 LTS, npm, and Git. Initial development uses Node 24.21.0, npm 11.19.0, and Git 2.55.0. Exact dependency versions are recorded in `package-lock.json`.

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:ui
npm start
```

Build the Windows ZIP and run the desktop tests:

```powershell
npm run make
npm run test:e2e
```

The ZIP will be written under `out/make/`. Extract the complete archive before opening `DevStation.exe`; do not copy only the executable. Electron bundles its own runtime, so the packaged application does not need a separate Node.js installation to open. Project tasks still need the executable you select, and Git inspection requires Git on the machine. Packaged-runtime verification is tracked in [QA](docs/QA.md).

Native SQLite must match the runtime that loads it. Forge rebuilds native dependencies for Electron during packaging; tests and packaging must follow the repository's scripts rather than copying a binary from another Node installation. See [troubleshooting](docs/TROUBLESHOOTING.md) for ABI and Windows policy errors.

## Safety and local data

Removing a project removes its DevStation registration and saved configurations; it does not delete the project folder. Runs require an explicit action and a confirmation. Their output stays in a bounded memory buffer for the current session.

Tasks execute with your Windows user permissions. Select only executables and projects you trust. Stopping a run targets its managed main process; child processes may remain running. The Ports page does not terminate processes.

SQLite lives under Electron's application `userData` directory, outside imported projects. Before a schema migration, preserve a database backup. No credentials or project file contents belong in the database. See [security design](docs/SECURITY.md) and [recovery instructions](docs/TROUBLESHOOTING.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) and [technical decisions](docs/DECISIONS.md)
- [Design and interaction](docs/DESIGN.md)
- [Test evidence and acceptance matrix](docs/QA.md)
- [Packaging and release procedure](docs/RELEASE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Security reporting](SECURITY.md)

Screenshots will be added only after capturing the real application with synthetic test projects. Windows 10 compatibility, code signing, full process-tree termination, and broader platform support are not claimed.

## License

Original DevStation source is [MIT licensed](LICENSE). Third-party dependencies retain their own licenses. The dependency notice review is tracked separately in [THIRD_PARTY.md](docs/THIRD_PARTY.md).
