# Contributing

DevStation is a Windows desktop preview. Development currently happens in a private repository; this guide also prepares the project for possible future source publication. Public access and binary distribution have not been approved.

## Development and verification

Use Windows x64, Node.js 24 LTS, npm and Git. Work on a focused branch, keep the committed lockfile, and use synthetic temporary projects. Read [architecture](docs/ARCHITECTURE.md) and [security boundaries](docs/SECURITY.md) before changing privileged operations.

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:ui
npm start
```

For packaging and Electron checks:

```powershell
npm run make
npm run test:e2e
```

Run Node-based tests before packaging: Forge rebuilds native SQLite for Electron. Follow [troubleshooting](docs/TROUBLESHOOTING.md) if a native ABI mismatch occurs. An unsigned executable blocked by Windows policy is a recorded limitation, not a reason to disable protection. Report compiled Electron checks and actual packaged checks separately.

## Issues and pull requests

For ordinary bugs, include the affected commit/version, Windows version, steps using a minimal synthetic project, expected behavior and observed behavior. Remove personal paths, credentials and raw private logs from reports. Use [SECURITY.md](SECURITY.md) for vulnerabilities; do not disclose exploit details in an issue or PR.

Keep changes focused and explain the user-visible problem, resulting behavior and relevant validation. Add regression coverage where it verifies meaningful behavior. Update documentation only with observed results; distinguish PASS, FAIL and NOT RUN. Include real application screenshots for visible changes, using synthetic data. Preserve the existing MIT license and third-party notices; do not copy code or assets with incompatible terms.

## Scope and review boundaries

The renderer stays sandboxed with no Node access. New IPC needs explicit contracts, strict schemas, sender checks and service authorization. Tasks use an explicitly selected executable and separate arguments with `shell: false`; Save does not run a task. Stop targets session-owned handles only. Git stays read-only, and removing registration never removes a project directory.

No generic shell/terminal, Git writes, arbitrary PID termination, automatic execution, telemetry, cloud synchronization or automatic dependency installation belongs in this cycle. npm/Flutter shell wrappers, signed updates and other platforms need separate designs. Public visibility, binary publication, purchases and changes to host security policy require separate owner authorization.

Release preparation follows [PUBLICATION_CHECKLIST.md](docs/PUBLICATION_CHECKLIST.md). Do not create a release tag just because a development branch is green.
