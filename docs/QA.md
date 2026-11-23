# v0.2.1 validation

Reviewed 2026-11-23. Target: unsigned Windows x64 pre-release. Human usability and broad Windows compatibility are not claimed. Historical evidence is preserved in [v0.1](history/v0.1/QA.md) and [v0.2.0](history/v0.2/QA.md).

## Local results

Environment: Windows 11 Pro 10.0.26300, unelevated; Node 24.21.0, npm 11.19.0, Git 2.55.0, Python 3.14 and Electron 45.4.1. Application changes are in 6f90eb6; package privacy fixes in f4b1997 and 98fe037. Test commit 6753074 extracts the actual distribution ZIP and launches its EXE in CI; it does not reuse the staging directory. Subsequent documentation changes are identified in Git history.

| Check | Result | Evidence and limits |
| --- | --- | --- |
| TypeScript / ESLint | PASS | Complete application and test checks; packaging/test edits checked again |
| Unit, integration and UI | PASS | 143 tests in 13 files, 27.96 seconds; includes 45 interface tests |
| Compiled desktop workflows | PASS | 12 Playwright tests: actual Python/Node, script review, cancellation, no autorun, logs, ports, persistence, keyboard, faults, shutdown and crash ownership |
| Windows ZIP creation | PASS | Final local candidate after privacy fixes built successfully; exact identity in RELEASE |
| Package contents/privacy | PASS | 5,887 files scanned, including unpacked native modules; caches and native build metadata absent, no configured credential or developer-home-path matches. MIT and third-party notices match source |
| Local packaged EXE launch | FAIL â€” Windows signing policy | Playwright spawn rejected; Code Integrity events 3033 and 3077 at 2026-11-23T19:07:05â€“06Z state signing-level requirements were not met. No protection changed |
| Windows CI and final main | PENDING | Must pass for the final source before publication; CI package acceptance does not erase the local block |
| Visual review | PASS, stated scope | Six minimum-window screens plus welcome/help/demo, script-review dialog and exit-outcome page reviewed; no horizontal clipping or overlapping controls found |

The complete local desktop run was **12 PASS / 1 FAIL in 1.1 minutes**. The failed case is the genuine packaged executable, not a compiled Electron workflow. The v0.2.0 native success is historical and does not establish acceptance of these new bytes.

## New regressions

- Changed-script preview shows complete UTF-8 content up to 256 KiB, renders code as text and marks invisible controls. Larger/non-text files require external review and native reselection.
- Config-specific tokens expire after five minutes, are single-use including Cancel, and are bounded to twenty. Forged, reused, expired and cross-config tickets cannot authorize.
- Main rechecks file identity, containment, content, configuration, executable, working directory and generated arguments after confirmation. Changes during review cannot update the saved approval.
- Authorization preserves the configuration until explicit confirmation and never creates a process. A later Start rechecks the file again.
- Real Node/Python tasks verify completion, nonzero errors and confirmed user stops. Accepted-but-unconfirmed termination remains active Unknown; a natural zero-code exit wins a race with Stop.
- Logs distinguish failure, waiting and a finished task without output; Retry fetches again. Keyboard focus recovery and skip-to-content preserve the trusted local document URL.
- Package regression excludes development caches/intermediate metadata and scans for the build machine's home/workspace in UTF-8 and UTF-16.

Two packaging privacy findings were caught before publication: a Vitest manifest and eleven generated SQLite build files contained local paths. The copy filter and post-rebuild staging cleanup remove them, preserving runtime .node files. [Package audit](evidence/v0.2.1-package-audit.json) and [publication audit](evidence/v0.2.1-publication-audit.json) keep the initial findings and exact scope.

## Screenshots

Current v0.2.1 screenshots are actual compiled-renderer captures with synthetic data: [welcome](screenshots/v0.2.1-welcome.png), [help](screenshots/v0.2.1-help.png), [example](screenshots/v0.2.1-demo.png) and [task outcomes](screenshots/v0.2.1-runs.png). They are not proof of packaged EXE acceptance.

A private test capture of the script-review dialog was deliberately excluded from documentation because its synthetic file lived under the development user's TEMP profile. It is retained only in ignored local test output. No actual project contents were published.

## Explicitly untested or limited

- Native Windows display scaling: NOT RUN. Minimum native window 1050Ã—700 and Chromium zoom 100/125/150% passed.
- Physical network disconnect: NOT RUN. Bundled help/tour/settings passed Chromium offline emulation.
- Complete native-picker keyboard/accessibility audit and Windows 10: NOT RUN.
- Human usability: NOT RUN. [Study protocol](USABILITY_STUDY.md) has blank records; no agent substitutes for participants.
- Real v0.2.1 native-dialog workflow on this machine: BLOCKED by packaged startup policy.
- Logs and memory measurements are finite tests, not a long-duration leak guarantee.
- Automated native dialogs use controlled fixture responses. Process, filesystem, Git and listener operations are real within synthetic fixtures.

Pre-release status and known limitations must accompany any unsigned download. Never weaken Windows policy to turn a result into PASS.
