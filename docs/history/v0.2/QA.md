# v0.2 QA and acceptance evidence

Date: 2026-11-23. Target: private Windows x64 v0.2.0 preview. **Technical preview validation completed; full v0.2 acceptance is not claimed.** Previous evidence is preserved in [QA-v0.1](../v0.1/QA.md), including its original 47-case matrix, artifacts and native procedures.

PASS means the stated scenario was actually executed. A mock, compiled Electron session, CI package and physically disconnected Windows machine are distinct evidence layers.

## Environment and commands

Local: Windows 11 Pro 10.0.26300, unelevated; Node 24.21.0, npm 11.19.0, Git 2.55.0, Python 3.14, Electron 45.4.1. Baseline HEAD was `f9ee2e3`; current work is on `codex/v0.2-guided-workspace`. Validated application source is `3092f81a37b575296e9e7afdef8d6e990cfe49c6`; subsequent documentation-only commits do not change the tested application. Exact artifacts are in [RELEASE](RELEASE.md).

| Check | Command / evidence | Result and scope |
| --- | --- | --- |
| Baseline reproduction | npm ci; types/lint/test; desktop/security; make | PASS: 53 original automated tests; two compiled desktop checks; baseline ZIP built. Baseline local EXE remained blocked |
| v0.2 automated suite | npm test | PASS: 98 tests/11 files, 23.81 seconds, including module-shadow and stale-error regressions |
| Python isolation regression | npx vitest run tests/integration/guided.test.ts | PASS: 6 tests, 1.96 seconds; a project http.py marker never executes, real isolated server starts/serves/stops on loopback |
| Static checks | npm run typecheck; npm run lint | PASS after current integration |
| Complete desktop suite | npm run test:e2e | PASS: 11 tests, 1.1 minutes on final source. Ten compiled Electron tests and one actual hardened packaged EXE test; automated native dialogs use fixture responses |
| Windows ZIP | npm run make -- --arch=x64 | PASS: final ZIP built, notices checked, packaged EXE starts with system-only PATH and persists preferences; local test 19.6 seconds |
| Native local workflow | Actual final DevStation.exe, real Windows dialogs | PASS: project/program/script selection, Save, confirmed Start, live log/PID/port, confirmed Stop, port gone, close/reopen and preserved project/configuration. [Native record](../../evidence/v0.2-native-review.json) |
| Windows CI | [Run 45233998754](https://github.com/Tyago03/DevStation/actions/runs/45233998754) | PASS: 42 unit + 28 integration + 28 UI = 98; 11 desktop in 1.6 minutes (98-second step). Types/lint/build/checksums/private artifact upload also PASS. [CI record](../../evidence/v0.2-ci.json) |

Initial validation found and corrected an async focus race in the guided form. The changed-script desktop assertion was corrected to expect a Failed history entry without a PID; rejection does not mean no history record. Review also found Python module shadowing; the server template now fixes isolated/unbuffered flags in both renderer preview and main-process validation.

## Remaining-case matrix

| ID | Result | Evidence and limits |
| --- | --- | --- |
| T20 unsafe Git ownership | PASS, controlled ownership simulation | Real Git rejects its official test-only ownership override; isolated configuration remains byte-identical. No actual Windows ACL owner or global trust changed. integration/system-faults |
| T21 stalled Git/UI | PASS, controlled real subprocess | Test substitutes real Git hash-object held on stdin at spawn boundary; unmodified 10-second production timeout terminates it. Help/navigation stays usable, no false Clean, retry succeeds. e2e/system-faults |
| T30 >3 MB live output | PASS, finite measured run | 12,582,912 bytes produced, 2,096,150 retained; renderer 978 lines/999,494 characters; six navigations, maximum 267.8 ms. Main RSS 115,507,200–134,705,152 bytes; main heap 7,622,548–13,077,360; renderer heap 3,733,940–22,311,036. [Measurements](../../evidence/v0.2-T30-measurements.json). Not a long-duration leak guarantee |
| T35 crash ownership | PASS, actual surviving descendant | Abrupt main exit(86), project/config persistence, empty new session and RUN_NOT_FOUND for old run verified. A detached fixture-only descendant with its own PID/nonce remains alive through reopen and rejected Stop. The managed parent exits; the descendant is never represented as the managed PID. Cleanup uses its nonce endpoint. Production spawn remains unchanged. Final-suite check PASS in 2.1 seconds. [Observation](../../evidence/v0.2-crash-observation.json) |
| T39 all-interface listener | PASS | Real test-owned ephemeral 0.0.0.0 listener, real netstat/PID, UI scope and firewall/reachability caveat |
| T40 netstat failure/retry | PASS | Real netstat exits nonzero with test-only invalid option; production failure reaches UI, no false empty success, retry succeeds. This is failure, not a netstat timeout |
| T42 keyboard | PASS renderer and native subset; NOT RUN complete keyboard-only workflow | Tab/Enter reach all six modules at each tested zoom; form Enter/Escape/focus restoration covered. Native file pickers accepted typed paths/Enter; Start and Stop confirmations defaulted to Cancel and accepted Tab/Enter. Other native workflow actions used mouse input |
| T43 size/scale | PASS native minimum + Chromium zoom; NOT RUN Windows scaling | Actual window minimum 1050x700; Chromium zoom 100/125/150%, six modules, no document horizontal overflow. Not a Windows display-DPI change. The shared active desktop was not reconfigured |
| T44 offline | PASS Chromium simulation; NOT RUN physical disconnect | Bundled help/search, tour and Settings remain usable with Chromium offline. The active machine network was preserved; no isolated disconnected Windows machine was available |
| T46 local packaged launch | PASS identified v0.2 artifact | ZIP SHA-256 2e38b79a…0a882, source 3092f81, unsigned, Windows 11 Pro 10.0.26300 unelevated. Actual packaged boot test and real native workflow both passed. No Windows protection changed; cause of acceptance difference from old v0.1 was not established |
| T47 remove portable package | PASS, actual archive removal | Copy/extract actual v0.2 ZIP; remove only test-owned ZIP/extracted copy. Project including .git and separate SQLite bytes survive; re-open compiled Electron with same IDs/theme. Original build ZIP hash unchanged. Does not prove extracted EXE launch |

Existing T01–T19, T22–T29, T31–T34, T36–T38, T41 and T45 retain their explicitly limited historical evidence in QA-v0.1; their automated regressions remain in the suite. No old native/package observation is silently transferred to new bytes.

## Added v0.2 acceptance

- Schema v1→v2 migration backs up the existing database and preserves project/config IDs; theme-only updates retain tour progress.
- Guided Python/Node scripts run literal arguments, including spaces/operators. Save launches nothing; canceled Start launches nothing; script change refuses a new process.
- Wrong extension, outside-root/junction escape, oversize scripts, unsupported interpreter, invalid port and altered template arguments are rejected.
- Python http.server fixes isolated mode, unbuffered output and loopback binding. This is not a general task sandbox.
- Tour is opt-in, persistent, skippable, resumable and restartable without requiring installed tools or any execution.
- UI tests assert zero bridge calls during the standalone example workspace, including five seconds beyond the normal polling interval; returning resumes real state checks.
- Production Electron checks cover CSP, permissions, window/navigation denial, sender/schema checks and official external-link allowlist. Documentation no longer uses the private GitHub README.
- Ports/Diagnostics retain the last successful snapshot with an explicit failed-check message/timestamp; Unknown is not labeled Stopped.

## Evidence and open gates

[Welcome](../../screenshots/v0.2-welcome.png), [Help](../../screenshots/v0.2-help.png) and [Demo](../../screenshots/v0.2-demo.png) are actual compiled renderer captures from the final guided desktop suite, source 3092f81, Electron 45.4.1, isolated fixture userData. They were visually reviewed on 2026-11-23: synthetic empty/example workspaces, no personal path or credential visible. Their hashes are in [screenshot evidence](../../evidence/v0.2-screenshots.json); they are not packaged-executable acceptance. Logs/memory measurements are finite-window observations, not a long-running leak guarantee. Automated dialogs use test-supplied responses unless a native procedure is explicitly documented.

Human usability remains **NOT RUN**. [USABILITY_STUDY](../../USABILITY_STUDY.md) contains a protocol and blank P01–P05 records. No participants were contacted or invented. Windows 10, physical offline, real Windows display scaling, trusted signing/local distribution and publication decisions remain open.

Automatic approval rejected additional cleanup of two temporary directories left by the first failed lifecycle harness attempt, returning only `blocked by policy`. No workaround was attempted. Final successful fixtures cleaned themselves; the old TEMP remnants are separate from user projects and application data.
