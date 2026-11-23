# Windows release procedure

Version: **0.1.0 functional preview**. Distribution format: **unsigned Windows x64 ZIP**. **The final local executable is blocked by Smart App Control; local distribution acceptance is incomplete.** The current Windows CI passes all checks, and an earlier local package demonstrated the core workflow. Those results do not override the current local signing-policy block. No protection was bypassed and no public release is authorized.

Source `96e6c45abfd007d5d9d47bea2753022df002050b` passes type checking, lint, 53 distinct local unit/integration/React checks (19 unit, 19 integration, 15 React), the expanded compiled desktop workflow (3.7 seconds), and the compiled security check (1.1 seconds). These counts combine completed suites; the last aggregate local run preceded two additional UI cases. [Windows CI run 44960251660](https://github.com/Tyago03/DevStation/actions/runs/44960251660), job 137017251900, independently passes all 53 tests, all 3 desktop tests (20.5 seconds), Windows packaging, checksums, and private artifact upload. The current source was rebuilt as a Windows ZIP; its packaged executable is blocked locally. Historical baseline results remain separately identified below and in [QA.md](QA.md).

## Final local artifact: built, launch blocked

| Field | Value |
| --- | --- |
| Filename | `DevStation-win32-x64-0.1.0.zip` |
| Downloads copy | `DevStation-0.1.0-96e6c45-windows-x64.zip` (identical bytes) |
| Build output | `out/make/zip/win32/x64/DevStation-win32-x64-0.1.0.zip` |
| Size | 176,736,251 bytes |
| Source commit | `96e6c45abfd007d5d9d47bea2753022df002050b` |
| Artifact modified UTC | `2026-11-21T23:05:10.8840703Z` |
| Tested OS | Windows 11 Pro, 10.0.26300, build 26300 |
| Privileges | Standard unelevated process |
| Authenticode | NotSigned |
| SHA-256 | `e74cb698644cba853c62eb7abd57034c4600ac7a2da77667f2b25b541f5936fe` |
| Local launch | Blocked by Smart App Control signing policy; packaged test reports `spawn UNKNOWN` |

This hash applies to the final local ZIP and its renamed Downloads copy; a [checksum manifest](SHA256SUMS.txt) is included for the Downloads filename. [Machine-readable evidence](evidence/local-build.json) records the source, artifact, local policy block, and successful CI run. It does not identify the CI-built archive's bytes, which have their own checksum manifest. A checksum is not a signature or proof of publisher trust. This ZIP has no installer.

Windows Code Integrity events **3033 and 3077**, recorded at **2026-11-21T23:08:06–08Z**, identify rejection of the rebuilt unsigned executable's signing level. No signing certificate was introduced and no security policy was changed. Trusted signing/distribution work and a new local launch check are still needed.

The previous blocked baseline ZIP (`ed3b5db`, SHA-256 `bab21b30886079127d765686550d54d2f22eaa4e4bd8c69c8fd537faefc8a5a1`, 176,611,525 bytes) has a preserved [historical evidence record](evidence/local-build-ed3b5db.json). It differs from the current archive above.

## Current private CI artifact

The successful run uploaded `devstation-windows-x64-96e6c45abfd007d5d9d47bea2753022df002050b` (artifact ID 14728928833), 175,361,324 bytes, expiring 2026-12-05. GitHub reports container digest `sha256:cf6f8aa9fd965f940ad02d2af100943c81def39df449344ff0b2c238c2a80d40`. This is the outer CI artifact archive, not the local application ZIP above. Its bundled `SHA256SUMS.txt` identifies the CI-built application ZIP. Download through the authenticated [workflow run](https://github.com/Tyago03/DevStation/actions/runs/44960251660).

## Earlier local artifact: historical runtime evidence

The earlier ZIP was 175,527,489 bytes, built from `ed0cd05781c40a52e1385ba89057cacff402190b`, modified at `2026-11-21T22:08:08.599222Z`, with SHA-256 `677acfca81fc9d033ca170a5b2ae11b42700070f809148551c4661bebe182978`. Its 2 desktop checks passed locally in 6.3 seconds, including hardened startup without external Node and SQLite settings persistence.

That earlier artifact also passed genuine native import/executable selection, confirmed Python Start/Stop, logs and listener observation, and canceling an active-run close prompt. The README screenshots come from that artifact. These remain valid historical observations; they are not substituted for launch acceptance of the final local ZIP.

The initial CI failure involved four fixture assertions comparing Windows 8.3 temporary aliases (`RUNNER~1`) with canonical paths (`runneradmin`). Revision `ed3b5db` corrected fixture path expectations; application source was unchanged from `ed0cd05`. The subsequent Windows CI run succeeded, including the packaged test. CI and this local machine have distinct application-control environments.

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

## Preview checklist and remaining release work

- [x] Current code passes 53 automated tests and all three desktop tests in Windows CI.
- [x] Current Windows CI success and source commit recorded.
- [x] Earlier local package demonstrated settings persistence and native process workflow.
- [ ] Final local unsigned executable can launch under the host's signing policy.
- [x] Actual ZIP filename and SHA-256 recorded.
- [x] Three genuine synthetic-data screenshots reviewed; fixture preparation disclosed.
- [x] Production package notices collected and retained in packaged resources; Electron runtime notices preserved.
- [x] Initial resolved failures, successful CI, current local signing-policy block, and NOT RUN checks documented.
- [x] Artifact explicitly labeled unsigned; no instruction to disable security protections.
- [x] README reflects implemented behavior and preview limitations.
- [ ] Remaining P0 manual/fault-condition checks completed.
- [ ] Separate authorization obtained before public publication.

Windows 10, macOS/Linux, code signing, automatic updates, and reliable termination of arbitrary descendant trees are not release claims.
