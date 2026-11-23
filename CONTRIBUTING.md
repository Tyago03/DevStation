# Contributing

DevStation is a Windows desktop project. Keep contributions focused on a concrete user problem and preserve the existing visual identity and security boundaries.

## Development

Use Windows x64, Node.js 24 LTS, npm and Git. Work on a focused branch and keep the committed lockfile. Development fixtures must be synthetic and live in test-owned temporary directories; never exercise changes against another person's project.

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:ui
npm start
```

For a distribution build and desktop checks:

```powershell
npm run make -- --arch=x64
npm run test:e2e
```

Run Node-based tests before packaging: Forge rebuilds native SQLite for Electron. [Troubleshooting](docs/TROUBLESHOOTING.md) explains ABI recovery. Keep compiled Electron checks separate from actual packaged-executable checks. If Windows blocks an unsigned executable, record that result and preserve the machine's protections.

The current v0.2.1 candidate has 12 passing local compiled desktop checks, while its actual packaged EXE is blocked by Windows signing policy. Main-branch CI and publication remain pending. Treat [QA](docs/QA.md) and [RELEASE](docs/RELEASE.md) as the source of exact results, rather than transferring an older package's successful launch to new bytes.

Read the [architecture](docs/ARCHITECTURE.md) and [security design](docs/SECURITY.md) before changing privileged operations. The [documentation index](docs/README.md) links the implementation decisions and validation records.

## Report a bug

Include the affected version or commit, Windows version, expected behavior, observed behavior and minimal reproduction steps using synthetic data. Screenshots should hide private paths, repository names, credentials and task output. Do not attach an application database, a personal project or raw private logs.

For vulnerabilities, follow [SECURITY.md](SECURITY.md). Do not publish exploit details in an issue, pull request or discussion.

## Prepare a pull request

Explain the user-visible problem, the resulting behavior and relevant validation. Add regression coverage when it proves meaningful behavior, especially for process ownership, asynchronous confirmation, path validation and persistence. Update documentation for changed behavior and distinguish PASS, FAIL and NOT RUN.

For visible changes, include genuine application captures using synthetic fixtures. Preserve the root MIT license and dependency notices; add attribution for any new dependency or asset. Keep formatting-only changes out of unrelated fixes.

Review comments and CI are part of the acceptance process. A successful development run does not establish packaged compatibility, complete accessibility or human usability.

## Preserve these boundaries

- Renderer code has no Node, filesystem or process access. New privileged operations need a narrow typed bridge, strict schemas, sender checks and main-process authorization.
- Configurations use an explicitly selected executable and separate argument values with `shell: false`. Save and script authorization never start a task.
- Script review is limited to the saved in-project file, with bounded content, canonical path checks, a short-lived authorization and revalidation before saving. A review is not a sandbox or a full dependency audit.
- Stop targets a live process owned by the current session. Never terminate arbitrary PIDs or silently assume descendants stopped.
- Git inspection stays read-only. Removing a catalog entry must not remove its repository.
- No automatic execution, telemetry, cloud sync, dependency installation or fallback shell is part of this scope.

Large features, additional platforms, signing services, automatic updates and destructive history changes need a separate design and decision. Release preparation follows the [publication checklist](docs/PUBLICATION_CHECKLIST.md): validate the exact source and binary, preserve notices, review privacy, verify the confidential reporting route and publish accurate limitations.
