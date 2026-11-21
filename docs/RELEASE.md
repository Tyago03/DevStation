# Windows release procedure

Target version: **0.1.0**. Status: **core automated checks passed; release acceptance not yet complete**. Distribution format: **unsigned Windows x64 ZIP**. No public release is authorized by the initial private-repository setup.

The 35-test unit/integration/React suite and one compiled Electron workflow have passed. The compiled Electron test stubs native dialogs and is distinct from the hardened packaged executable. An initial packaged launch failed because SQLite was omitted; the corrected package must pass its own smoke and persistence checks before a release is declared. See [QA.md](QA.md) for detailed evidence.

## Build

Use a clean Windows x64 checkout with Node 24 LTS and the committed lockfile:

```powershell
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:ui
npm run make
npm run test:e2e
```

Node-based tests precede Forge packaging because packaging rebuilds native SQLite for Electron. After changing native binaries, do not assume they still match the other runtime.

Collect the Git commit, UTC build time, Windows version, Node/npm versions, package filename, and SHA-256. Compute hashes from the actual ZIP, not from an executable that differs from the shipped archive:

```powershell
Get-ChildItem -LiteralPath out/make -Recurse -Filter *.zip |
  Get-FileHash -Algorithm SHA256
```

CI generates a checksum manifest beside its build evidence. Verify the manifest against the exact artifact before distributing it. Include dependency notices and Electron's shipped license files.

## Packaged application gate

Extract the entire ZIP to a fresh location. Run `DevStation.exe` without `npm start` or an IDE. Using temporary synthetic fixtures:

1. Import clean, changed, and empty Git repositories; verify displayed state and duplicate rejection.
2. Remove a registration and confirm the repository remains intact.
3. Save a Python server profile, start with consent, observe PID/output, and find its TCP listener.
4. Stop the managed main process and record any descendant limitation. Do not terminate other applications.
5. Close and reopen; confirm projects, profiles, and appearance persist without reviving old run ownership.
6. Check errors for missing Git, missing executable, missing folder, and failed port inspection.
7. Verify keyboard navigation, dark/light themes, minimum window size, and 125%/150% display scaling.
8. Capture Overview, Git details, and Runs screenshots using synthetic data only.

The automated packaged smoke may use Chromium remote debugging for test observation; it must launch the actual executable without disabling renderer sandbox or enabling production Node inspector fuses. Record any test-only launch flags and isolation directory in QA.

## Release checklist

- [ ] Required automated checks pass on Windows.
- [ ] Windows CI result and commit recorded.
- [ ] Packaged persistence and process workflow verified.
- [ ] Actual ZIP filename and SHA-256 recorded.
- [ ] Synthetic screenshots reviewed.
- [ ] Direct and bundled dependency licenses reviewed.
- [ ] Known failures and NOT RUN checks documented.
- [ ] Artifact explicitly labeled unsigned; no instruction to disable security protections.
- [ ] README reflects actual implemented behavior.
- [ ] Separate authorization obtained before public publication.

Windows 10, macOS/Linux, code signing, automatic updates, and reliable termination of arbitrary descendant trees are not release claims.
