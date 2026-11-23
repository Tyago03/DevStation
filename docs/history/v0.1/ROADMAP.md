# P0 implementation and acceptance roadmap

Archived v0.1 record. Results and pending checks below describe that historical milestone; consult [current QA](../../QA.md) for newer evidence.

Reviewed: 2026-11-21. This roadmap continues the existing private DevStation repository. It does not restart the project or declare the complete P0 accepted.

## Briefing provenance and scope

The newly received **briefing archive**, `DevStation_Codex_Package.zip`, is 74,763 bytes with SHA-256:

```text
949e2bd1a239c3c24784932ecf9ac7dfcf3096efd5627bb518a42b3273a0bca1
```

This is a specification archive, not an application binary. Its extracted `DEVSTATION_MASTER_BRIEF.md` has SHA-256 `2b3bae8ed5d73f3f0443d04e135bc06423a0b2a9058bd7b03be2108ce7c268e3`.

A complete text comparison found the extracted master exactly equal to the previously supplied `DevStation_Manual_para_Codex.md` after normalizing CRLF/LF and surrounding whitespace. Each complete numbered document, 01 through 06, also appears verbatim in that earlier manual. There is **no new product scope or changed acceptance matrix** in the received package.

The package's `AGENTS.md`, start-here document, and starter prompt are briefing context. Their instructions to start a new repository or wait for initial remote authorization describe the original bootstrap. The existing `Tyago03/DevStation` private repository is retained, and the owner's earlier explicit authorization for private repository creation and push remains applicable. Public publication, paid signing, and changes to Windows security policy are separate actions and have not been authorized by this briefing.

## Existing baseline

Application source was implemented at `ed0cd05`; `ed3b5db` corrected Windows temporary-path test fixtures. [Windows CI run 44955738087](https://github.com/Tyago03/DevStation/actions/runs/44955738087) passed for that baseline, including automated tests, package creation, both desktop checks, checksums, and private artifact upload. The current follow-up changes have their own independent results recorded below.

An earlier local package demonstrated native import, executable selection, Start/Stop confirmation, real Python output, listening-port inspection, and canceling an active-run close prompt. The later local unsigned package is blocked by Smart App Control. Earlier package and CI results remain valid within their recorded scope; they do not prove that the latest local executable can start.

The baseline executable ZIP, distinct from the briefing archive above, is 176,611,525 bytes with SHA-256 `bab21b30886079127d765686550d54d2f22eaa4e4bd8c69c8fd537faefc8a5a1`. The current source is `96e6c45abfd007d5d9d47bea2753022df002050b`; its local ZIP is 176,736,251 bytes with SHA-256 `e74cb698644cba853c62eb7abd57034c4600ac7a2da77667f2b25b541f5936fe`. That rebuilt executable is also blocked by host signing policy. See [QA](QA.md), [release evidence](RELEASE.md), and [machine-readable build evidence](../../evidence/local-build-96e6c45.json) for separate artifact records.

## Phases and remaining acceptance

Statuses below distinguish implemented baseline behavior from work and verification still in progress. They do not promote unexecuted tests to PASS.

| Phase | Acceptance criterion from briefing | Current status | Remaining work or evidence |
| --- | --- | --- | --- |
| 0 — Bootstrap | Isolated repository; locked install; React window; typecheck; initial Windows package opens | Baseline implemented and historically exercised | Keep current checkout and lockfile. Revalidate the changed source; do not restart scaffolding. Current local unsigned distribution remains a separate phase 7 issue. |
| 1 — Secure shell | Main/preload/renderer separation; restricted bridge; sender/schema validation; sandbox/isolation/CSP | Implemented; compiled security test and current CI PASS | Production CSP, geolocation denial, navigation/new-window denial, unauthorized-window/schema rejection, and help allowlist pass in compiled Electron. Final OS URL opening is stubbed. Current hardened package checks pass in CI; local startup remains blocked. |
| 2 — Catalog and SQLite | Canonical Git import; duplicate handling; search; metadata-only removal; restart persistence in packaged app | Implemented; compiled subfolder/restart checks PASS | Current compiled E verifies the subfolder-root notice and two project IDs/paths, one configuration and theme across restart. Native dialogs are stubbed; current packaged restart remains a separate gate. |
| 3 — Read-only Git | Clean/dirty/staged/rename/unborn/detached metadata; bounded async operations; no project mutation | Implemented; root revalidation regression PASS | Inspection reconfirms the saved working-tree root; a deleted nested `.git` cannot expose an ancestor repository. Preserve index/worktree non-mutation guarantees. Unsafe-ownership and stalled-Git/UI tests remain open without editing global Git trust. |
| 4 — Diagnostics and TCP | Honest installed/missing/unchecked states; readonly listener inspection with real controlled server | Implemented baseline | Exercise actual failure paths through test-owned command seams; verify all-interface scope and explanatory UI. npm remains explicitly Not checked where no safe P0 query exists. |
| 5 — Runs and logs | Explicit selected executable/argv/cwd; confirmation; session-owned Stop; bounded stdout/stderr; exit state | Implemented; targeted log/T26 and compiled workflow PASS | Incremental UTF-8/ANSI, bounded long segments, 200 ms partial-output flush, and saved-executable disappearance pass unit/integration checks. Compiled E exercises the configuration form and Python/logs/ports. Sustained live UI load and remaining confirmation/concurrency paths need their stated evidence. |
| 6 — UX and reliability | Accessible errors and loading states; keyboard/scale checks; edge cases; complete defined tests | Partial; 15 React tests and expanded compiled desktop PASS | Failed loads, Unknown states, sidebar labels, associated field errors, and modal focus have explicit coverage. Expanded desktop testing found a focus defect; the corrected complete rerun passes. Live output load, full keyboard workflow, scaling, crash recovery, and actual offline behavior remain open. |
| 7 — Distribution | Genuine Windows ZIP/installer, native workflow and restart, evidence, notices, checksum | Current ZIP and CI PASS; local launch blocked | Current CI run 44960251660 passes all 3 desktop checks, including hardened package startup/persistence, and uploads its own private artifact. Preserve Smart App Control; a trusted distribution/signing path and local retest remain necessary for local launch acceptance. Retain remaining NOT RUN cases. |

## Current iteration evidence and open gates

| Workstream | Planned change or check | Status for this iteration |
| --- | --- | --- |
| Backend logs | Incremental bounded buffering, Unicode boundaries, stateful ANSI handling | PASS in targeted unit/integration checks; live renderer load NOT RUN |
| Backend Git | Reconfirm imported root before inspection | PASS in the nested-repository regression fixture |
| Run validation | Saved executable removed before Start (T26) | PASS in real temporary-file integration check; Failed state and no PID verified |
| Frontend reliability | Failed load versus empty success; unknown runs; sidebar labels; field-associated errors and focus | PASS in 15 React tests with bridge stubs; compiled form autofocus/Enter/Escape/focus restoration also PASS |
| Import UX | Explicit explanation when a subfolder resolves to Git root (T04) | PASS in compiled E with native dialogs stubbed; real native notice interaction NOT RUN |
| Persistence | Two projects and configuration/settings across restart (T02) | PASS in compiled E: two project IDs/paths, one configuration and theme; current packaged restart blocked locally |
| Electron security | CSP, permission denial, navigation/new-window denial, sender/schema validation, help allowlist | PASS in 1 compiled Electron test, 1.1 seconds; approved final OS URL opener stubbed |
| Network constraint | Chromium offline Settings navigation/reload | PASS as a simulation only; physical disconnection and full offline workflow NOT RUN |
| Static checks | Final lint and TypeScript checking | PASS |
| Expanded desktop | Real form, subfolder notice, restart, Python/logs/ports | PASS: 1 compiled Electron test in 3.7 seconds, native dialogs stubbed |
| New distribution | Rebuild, current packaged launch, current Windows CI and artifact identity | ZIP build PASS; local packaged launch FAIL due to SAC; [CI run 44960251660](https://github.com/Tyago03/DevStation/actions/runs/44960251660) PASS, including hardened package and private artifact upload |

Current CI confirms **53 unique automated tests**: 19 unit (17 backend plus 2 IPC; 664 ms), 19 integration (15.23 seconds), and 15 React UI (5.23 seconds), plus **3 desktop checks** in 20.5 seconds. Lint, types, Windows make, checksums and private artifact upload also pass. Local targeted suites and the separate compiled security/expanded desktop checks pass; the earlier local combined run had 51 before two final UI tests were added.

CI job 137017251900 produced private artifact ID **14728928833**, named `devstation-windows-x64-96e6c45abfd007d5d9d47bea2753022df002050b`, 175,361,324 bytes, expiring **2026-12-05**. SHA-256 `cf6f8aa9fd965f940ad02d2af100943c81def39df449344ff0b2c238c2a80d40` identifies the uploaded artifact container, not the local application ZIP `e74cb698…`.

Long or newline-free logs are displayed in segments of at most 16,384 UTF-16 code units, preserving surrogate pairs, with pending output flushed after 200 ms or on stream end. This does not promise identical source-line boundaries for arbitrary long output. The incremental decoder, sanitizer, timer cleanup, and live partial-output regression are tested; full UI responsiveness under sustained output is still T30.

Smart App Control rejection was observed again at 20:03:10–11 -03:00 on 2026-11-21 (Code Integrity events 3033/3077). The final rebuilt executable was blocked at 20:08:06–08 -03:00 (23:08:06–08Z), returning `spawn UNKNOWN`. No policy is disabled. Its new `e74cb698…` checksum above remains distinct from both the baseline ZIP and any CI artifact.

## High-value follow-up checks without changing host security

1. **Preserve the verified baseline for the next iteration.** CI now passes for 96e6c45, including hardened packaged startup/persistence. Keep its artifact identity separate from the blocked local unsigned ZIP. Advance the remaining checks below without weakening host security or claiming universal P0 acceptance.
2. **Exercise the whole configuration lifecycle.** Create, edit, save without running, start after review, reject concurrent edits, stop, and delete. Confirm that the executable/arguments reviewed in the prompt are the values actually launched. Use deterministic async gates for the confirmation/save race rather than timing-dependent sleeps.
3. **Measure live log behavior (T30).** A test-owned process should emit more than 3 MB, fragmented multi-byte Unicode, split ANSI sequences, and newline-free output. While it runs, search/filter logs and navigate the UI. Check memory/output limits, displayed truncation, final exit state, and listener cleanup. Existing isolated buffer tests alone do not prove UI responsiveness.
4. **Verify keyboard and layout (T42/T43).** Use `npm start` or compiled Electron with synthetic data. Exercise Tab/Shift+Tab/Enter/Escape, native and HTML dialogs, visible focus, and error association. Test the minimum window size and both themes. Keep simulated viewport/zoom results distinct from actual Windows 125%/150% scaling.
5. **Test failure recovery without touching personal projects.** Cover missing executable after Save, missing/replaced Git root, command timeout, netstat failure, corrupt metadata, and failed migration using temporary fixtures or explicit injected command providers. Keep fixture failures distinct from user machine configuration changes.
6. **Test crash ownership (T35).** Start a synthetic child that exits on its own after a bounded time, terminate only the test-owned application process, reopen, and verify that the new session neither marks the old run as active nor offers to terminate its PID. Never kill unrelated processes during cleanup.
7. **Expand actual listener checks.** Use local test servers for IPv6 loopback when available and an all-interface bind with no external requests. Verify the displayed scope and firewall caveat. Record IPv6 unavailable as a limitation rather than manufacturing a passing network test.
8. **Retest distribution in Windows CI.** Run the hardened package checks on the changed commit and preserve its own checksums and evidence. This is complementary to the local SAC block, not a claim that the host's block is resolved. Do not weaken fuses, replace the blocked executable with an untested binary, or disable application-control policy.

A precise unsafe-ownership test (T20) is also feasible without changing real directory ownership or global trust: Git's own test suite uses a test-only ownership override. Any use must remain inside a temporary subprocess fixture with isolated configuration; it must not be added to the application's normal environment allowlist. The production refusal path and non-mutation behavior still need explicit assertions. [Git's safe-directory tests](https://kernel.googlesource.com/pub/scm/git/git/+/6a044a20480a8ef56f7ddb8142f660ca01a3391e/t/t0033-safe-directory.sh).

## Scope boundaries and completion rule

No P1 work is started by this roadmap. Shell recipes (`npm run`, `.cmd`, `.bat`), Git writes, diff/history, GitHub synchronization, notifications, cloud features, AI, automatic runs, arbitrary PID termination, and other platforms remain outside this P0 iteration.

ZIP distribution instead of an installer, npm **Not checked**, and a warning that child processes may survive Stop are permitted by the briefing when honest and tested. Paying for a signing certificate is not an implicit prerequisite to continue independent implementation and testing; however, current local package acceptance remains open while the unsigned executable is blocked.

After the work completes, update [QA.md](QA.md) with only newly observed outcomes, revise the artifact/source identity if rebuilt, and update README status to match. Do not infer a full P0 pass from a green unit suite, historical screenshots, a previous executable, or a different CI artifact.
