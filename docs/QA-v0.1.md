# QA and acceptance evidence

Date: 2026-11-21. Target: v0.1.0, Windows x64. Status: **functional preview; current Windows CI passes 53 automated and 3 desktop checks**. The final local unsigned package is blocked by Smart App Control; distribution acceptance and remaining P0 checks are incomplete.

PASS means the described check was actually executed with the expected result. FAIL means an observed failure. NOT RUN means no qualifying execution evidence has been recorded. Code inspection, a mock, or a passing unit test must not be relabeled as a complete packaged workflow.

## Current briefing iteration

The newly supplied briefing is textually equivalent to the original specification; its archive identity and comparison are recorded in [ROADMAP.md](ROADMAP.md). The checks below apply to source **`96e6c45abfd007d5d9d47bea2753022df002050b`**, not automatically to the historical artifacts or CI run listed later.

| Check | Result | Observed evidence and scope |
| --- | --- | --- |
| Backend unit and integration | PASS | 36 tests: 17 unit and 19 integration. Includes fragmented UTF-8/ANSI, bounded long output, timed partial output from a live process, imported Git-root changes, and a saved executable disappearing before Start |
| IPC unit | PASS | 2 schema/sender tests |
| React UI | PASS | 15 tests after the dialog-focus correction; JSDOM and a stubbed typed bridge. Includes load errors versus empty success, Unknown run states, accessible labels, associated validation, and dialog focus |
| Automated suite count | PASS: 53 unique tests | Current CI passes 19 unit (17 backend plus 2 IPC; 664 ms), 19 integration (15.23 seconds), and 15 React UI tests (5.23 seconds). Local targeted runs also pass; the earlier local combined run had 51 before two final UI tests were added |
| Final lint and type checking | PASS | `npm run lint` and `npm run typecheck` completed after the corrections |
| Compiled Electron security | PASS | 1 test in 1.1 seconds: production inline-script/connect CSP, denied geolocation, popup/navigation denial, strict IPC schemas, unauthorized window rejection, and external-help allowlist. The final OS URL opener is stubbed |
| Simulated offline Settings | PASS, limited | The security test disables Chromium networking and opens/reloads Settings. This is not a physically disconnected network or a complete offline run/Git workflow |
| Expanded compiled desktop workflow | PASS | 1 test in 3.7 seconds: real configuration form, autofocus/Enter/Escape/focus restoration, subfolder-root notice, two project IDs/paths plus one configuration and theme across restart, Python process/logs/ports. Native dialogs are stubbed; this is unbundled production compilation |
| Current Windows ZIP build | PASS | 176,736,251 bytes; modified 23:05:10.8840703Z; SHA-256 `e74cb698644cba853c62eb7abd57034c4600ac7a2da77667f2b25b541f5936fe`. Build success is not launch acceptance |
| Current local packaged smoke | FAIL, policy block | Final rebuilt executable returns `spawn UNKNOWN`; Code Integrity events 3033/3077 at 23:08:06–08Z reject its signing level. No bypass attempted |
| Current Windows CI | PASS | [Run 44960251660](https://github.com/Tyago03/DevStation/actions/runs/44960251660), job 137017251900, source 96e6c45: all steps pass, including lint/types, 53 automated tests, Windows make, 3 desktop checks in 20.5 seconds, checksums and private artifact upload. Desktop checks include compiled workflow/security and hardened packaged startup/persistence |

The private CI artifact is `devstation-windows-x64-96e6c45abfd007d5d9d47bea2753022df002050b`, ID **14728928833**, 175,361,324 bytes, expiring **2026-12-05**. Its artifact-container SHA-256 is `cf6f8aa9fd965f940ad02d2af100943c81def39df449344ff0b2c238c2a80d40`. This identifies the uploaded CI container, **not the local application ZIP** with hash `e74cb698…`.

During this iteration, read-only Code Integrity evidence recorded signing-policy rejection at **2026-11-21 20:03:10–11 -03:00** (23:03:10–11Z), events 3033/3077, and again for the final rebuilt executable at **20:08:06–08 -03:00** (23:08:06–08Z). No host application-control policy was changed. The final local artifact above is distinct from the baseline ZIP and any eventual CI artifact.

Log output now uses incremental UTF-8 decoding and stateful ANSI removal. Newline-free or very long output is emitted as segments of at most **16,384 UTF-16 code units**, preserving surrogate pairs. Pending text is flushed after a **200 ms first-pending deadline** or stream end; continuous small writes cannot indefinitely postpone display. These are display segments, not a promise that arbitrarily long source lines retain identical line boundaries. Backend ring and renderer retention limits still apply. Unit and real-process checks pass; sustained live UI load remains T30.

## Historical baseline environment and command evidence

Local environment: Microsoft Windows 11 Pro, version 10.0.26300, build 26300; process not elevated as administrator. Development tools: Node 24.21.0, npm 11.19.0, Git 2.55.0, Electron 45.4.1, better-sqlite3 13.2.0. Baseline artifact/CI source: `ed3b5db5d62d9c2ab5e51ced1fff5e44ecf8240b`. Earlier locally tested artifact: `ed0cd05781c40a52e1385ba89057cacff402190b`. The intervening change corrects test fixture paths, not application source. Both historical artifact records and distinct hashes are in [RELEASE.md](RELEASE.md). Every result in the following table predates the current briefing iteration.

| Check | Command / action | Result | Evidence / limitation |
| --- | --- | --- | --- |
| Official generator | `npx create-electron-app@8.0.1 ...` | FAIL | Windows App Control blocked oxfmt native binding; local scaffold selected in ADR-002 |
| Dependency reproduction | `npm ci` | PASS | 44 seconds; 321 packages; npm audit reported 0 vulnerabilities at that run (not a security guarantee) |
| Type checking | `npm run typecheck` | PASS | Completed without TypeScript errors |
| Lint | `npm run lint` | PASS | Completed without lint errors |
| Combined automated suite | `npm test` | PASS | 35 tests across 5 files; 13.09 seconds |
| Unit | Unit files included in `npm test` | PASS | 14 tests: 12 backend parser/path/environment tests and 2 IPC schema/sender tests |
| Integration | Integration file included in `npm test` | PASS | 15 real Git/SQLite/process tests, including Python listener and process limits |
| React UI | UI files included in `npm test` | PASS | 6 tests; JSDOM with a stubbed typed bridge, not Electron |
| Earlier local desktop suite | `npm run test:e2e` | PASS (historical) | 2 tests in 6.3 seconds against the earlier `677acfca…` package; not the final local artifact |
| Compiled Electron workflow | `tests/e2e/desktop.spec.ts` in desktop suite | PASS | Real Electron, Git, SQLite, and Python; native dialogs mocked; unbundled production compilation; initial standalone run was 30.5 seconds |
| Initial Forge package build | Forge Windows packaging | PASS | Build produced an executable; build success did not establish launch success |
| Initial packaged launch | Actual `DevStation.exe` | FAIL (resolved) | SQLite was omitted by the Vite package ignore policy; explicit runtime dependency inclusion fixed the failure; corrected package passes below |
| Final local Windows ZIP build | `npm run make` | PASS | 176,611,525 bytes; local/Downloads hash `bab21b30886079127d765686550d54d2f22eaa4e4bd8c69c8fd537faefc8a5a1`; build is not launch approval |
| Earlier local hardened smoke | `tests/e2e/packaged.spec.ts` | PASS (historical) | Earlier genuine package; system-only PATH; no external Node/Git; no renderer Node APIs; SQLite Light preference survives restart |
| Final local packaged smoke | Actual rebuilt executable | FAIL (policy block) | `spawn UNKNOWN`; Windows Code Integrity events 3077/3033/3118 at 22:17:40–42Z reject unsigned signing level; no bypass attempted |
| Earlier native packaged workflow | Real folder/executable/Start/Stop/close dialogs | PASS (historical) | Procedure below used the earlier `677acfca…` package; not transferred to final local ZIP |
| Development startup | `npm start` | PASS | Complete React UI, bridge version returned, no console errors, normal close after final code changes |
| GitHub Actions initial run | Windows workflow | FAIL (resolved) | Four fixture assertions compared 8.3 temp alias `RUNNER~1` against canonical `runneradmin`; fixture fix in ed3b5db |
| Final Windows CI | [Run 44955738087](https://github.com/Tyago03/DevStation/actions/runs/44955738087), job 137003299131 | PASS | Source ed3b5db; types, lint, 14 unit, 15 integration, 6 UI, Windows make, both desktop tests, checksums, private artifact upload. Its archive is separate from the local ZIP |
| Production package notices | Inspect installed licenses and packaged resources | PASS | Nine package notices inventoried; Lucide ISC/Feather MIT retained; `resources/THIRD_PARTY_NOTICES.txt` confirmed in package |

## Acceptance matrix

All scenarios use synthetic temporary repositories. PASS rows identify their evidence layer and artifact; they do not imply that the final local unsigned executable can launch. Earlier P/M results remain valid observations of the earlier package, while final local distribution is blocked. Untested native interactions, fault conditions, or packaged behavior remain NOT RUN.

Evidence keys: **U** = [backend unit tests](../tests/unit/backend.test.ts), **I** = [backend integration tests](../tests/integration/backend.test.ts), **R** = [workspace React tests](../tests/ui/workspace.test.tsx), **L** = [log React tests](../tests/ui/logs.test.tsx), **A** = [recovery/accessibility React tests](../tests/ui/recovery-accessibility.test.tsx), **S** = [compiled Electron security test](../tests/e2e/security.spec.ts), **E** = [compiled Electron workflow](../tests/e2e/desktop.spec.ts), **P** = [hardened packaged smoke](../tests/e2e/packaged.spec.ts), **M** = earlier native packaged procedure below. Current U/I/R/L/A targeted runs and compiled E/S pass locally; all also pass in current CI, including P. Current local P is blocked by host policy. The older baseline U/I/R/L/E/P passed in CI, and E/P passed on the earlier local artifact. E mocks native dialogs; M used real native dialogs on `677acfca…`.

| ID | Scenario | Expected outcome | Result | Evidence / scope |
| --- | --- | --- | --- | --- |
| T01 | First opening, no database | Empty home and userData database without crash | PASS | R/E plus P genuine package with fresh userData, welcome screen, and SQLite creation |
| T02 | Restart with two projects | Same IDs and paths persist | PASS | Current E preserves two project IDs/paths, one configuration and theme across restart in compiled Electron; current packaged two-project restart remains unverified locally |
| T03 | Import same repository twice | Duplicate rejected with explanation | PASS | I service error; E bridge duplicate rejection with mocked picker |
| T04 | Select a repository subfolder | Resolve root and communicate it | PASS | I resolves the root; current E verifies the subfolder selection and explanatory root notice with native dialogs stubbed. Real native notice interaction remains unverified |
| T05 | Remove registration | Only metadata removed; repository untouched | PASS | I preserves .git; E preserves synthetic README after remove through bridge |
| T06 | Imported directory disappears | Entry remains with missing-path message | PASS | I service returns PATH_MISSING and keeps catalog entry; full error presentation not manually checked |
| T07 | Spaces, accents, Unicode paths | Import and inspection work | PASS | I uses `Café workspace & literal`; Unicode filenames included |
| T08 | Select a non-Git directory | Recoverable error | PASS | I rejects malformed Git fixture with NOT_GIT_REPO; native picker flow not manually checked |
| T09 | Junction/symlink duplicate | Same canonical identity, no duplicate | PASS | I creates real Windows junction alias and verifies duplicate rejection |
| T10 | Failed database migration | Preserve backup and report failure | PASS | I preserves corrupt file, creates backup before failing migration, retains schema version |
| T11 | Clean working tree | Correct branch and zero changes | PASS | I real committed fixture; U parser |
| T12 | Modified tracked file | Correct modified count | PASS | I real modified renamed file; U parser |
| T13 | Untracked file | Correct untracked count | PASS | I Unicode file; E real server.py untracked |
| T14 | Staged file | Correct staged count | PASS | I staged rename; U staged and conflict records |
| T15 | Rename with spaces | NUL parser consumes rename correctly | PASS | I real rename; U source name resembles status record |
| T16 | Unicode file name | No loss or parser crash | PASS | I Japanese filename; U Unicode input |
| T17 | Repository without commits | Unborn state; no last commit | PASS | I real empty repository |
| T18 | Detached HEAD | Detached label without invented branch | PASS | I actual detached HEAD; service returns null branch and detached flag |
| T19 | Git missing or denied | Helpful error; application stays usable | PASS | I unavailable-executable error; P launches without Git on PATH, diagnostics reports not-found, Settings remains usable |
| T20 | Git refuses unsafe ownership | Explain refusal; do not alter configuration | NOT RUN | No actual unsafe-ownership fixture; similarly named missing-tool test does not cover this |
| T21 | Git operation times out | Bounded operation; UI remains responsive | NOT RUN | I command-runner timeout/output caps PASS; actual stalled Git plus UI not exercised |
| T22 | Path with shell metacharacters | Literal path; no injected command | PASS | I fixtures use spaces and ampersand with real Git argument arrays |
| T23 | Save Python server profile | Configuration saved without launching | PASS | R/E plus M native executable selection followed by typed-bridge config save; no process starts on save |
| T24 | Start after consent | Managed process, PID, state, and logs | PASS | M real native Start prompt reviewed and confirmed; Python PID 6388, state Running, actual stdout |
| T25 | Natural process exit | Exit code and final state | PASS | I real exit code 7; parent exit with inherited descendant pipes regression |
| T26 | Executable missing at start | Recoverable EXE_NOT_FOUND | PASS | Current I saves a real executable, removes it before Start, then verifies EXE_NOT_FOUND, Failed state and no PID; no native picker/confirmation claim |
| T27 | Select .cmd executable | Explicit unsupported rejection | PASS | I EXE_INVALID rejection; no shell fallback |
| T28 | Working directory escapes project | Reject including junction escape | PASS | I outside-root save and post-save junction substitution rejected |
| T29 | Shell metacharacters in arguments | Arguments arrive literally | PASS | I child echoes structured arguments including operators, quotes, HTML, and Unicode |
| T30 | Process produces 3 MB output | Bounded buffer, truncation notice, responsive UI | NOT RUN | I real output cap PASS; U/L buffer and warning PASS; sustained live UI responsiveness not measured |
| T31 | HTML and ANSI in output | Text-only safe display | PASS | Current U/I preserve fragmented UTF-8 and strip split ANSI/OSC; L verifies literal script text without script element. Long/partial lines are bounded segments as described above |
| T32 | Stop managed run | Confirmation; main process stops; child caveat shown | PASS | M real native Stop confirmation; main process exits and its TCP listener disappears; child-process caveat shown |
| T33 | Stop unknown ID/PID | Reject; no external process terminated | PASS | I unknown ID rejected while owned runs remain; E unknown UUID rejected |
| T34 | Close with active process | Decision dialog and documented behavior | PASS | M Alt+F4 opens real active-run dialog; Cancel preserves the running server. Native stop-and-quit branch not separately tested |
| T35 | Reopen after crash | No ownership of old PIDs | NOT RUN | E normal restart has empty run list; crash/old-process case not yet exercised |
| T36 | Exceed concurrent run limit | RUN_LIMIT before spawning extra process | PASS | I concurrent per-project limit of 2 and global limit of 5 |
| T37 | Controlled listener on loopback | Correct TCP port and loopback scope | PASS | I/E and M actual Python listener at 127.0.0.1:8765, PID 6388; absent after confirmed Stop |
| T38 | IPv6 loopback listener | Correct IPv6 parsing | PASS | U synthetic `[::1]` netstat record; actual IPv6 listener unverified |
| T39 | Listener on all interfaces | Correct scope plus network caveat | NOT RUN | U scope classification PASS; actual bind and UI caveat interaction not yet checked |
| T40 | netstat failure or timeout | Unavailable error with retry; no false empty success | NOT RUN | R failure/retry UI PASS using stub; actual netstat failure not yet induced |
| T41 | Missing Node or Python | Not found; application remains usable | PASS | P system-only PATH, Node not-found, application and settings work; Python-specific absence not separately asserted |
| T42 | Keyboard-only navigation | Navigation, dialogs, and inputs accessible | NOT RUN | A verifies labels, field-error association, focus and loading/error states with JSDOM. Current E passes form autofocus, Enter, Escape and focus restoration after correction. Full keyboard-only workflow, including native dialogs, still unverified |
| T43 | 150% scaling and minimum window | No overlap or hidden critical actions | NOT RUN | Pending display/layout check |
| T44 | No Internet connection | P0 local workflows function | NOT RUN | S passes Settings navigation/reload with Chromium offline simulation. Actual network disconnection and the full offline workflow are not tested |
| T45 | Malicious repository metadata | Escaped text; no execution | PASS | R synthetic malicious project name remains text and creates no img element |
| T46 | Packaged Windows app | Opens, imports, runs task, persists without external Node | FAIL (final local artifact) | Host Smart App Control prevents e74cb698… EXE startup. Earlier native P/M workflows and current CI E/S/P pass, including hardened packaged startup/persistence without external Node. They do not establish local distribution acceptance; current two-project restart is compiled E evidence under T02 |
| T47 | Remove application package | User repositories preserved; userData policy documented | NOT RUN | ZIP removal policy documented; actual removal test pending |

## Additional security gates

- [x] E verifies renderer sandbox/isolation/nodeIntegration; P verifies no renderer require/process in the hardened artifact.
- [x] Unit checks reject unauthorized sender/subframe/document and malformed/extra IPC fields; I/E reject unknown run IDs.
- [x] Current S verifies production inline-script/connect CSP, geolocation permission denial, popup/navigation denial, malformed IPC and unauthorized-window rejection, plus the help URL allowlist. The approved final OS opener is stubbed; subframe checks remain unit evidence.
- [x] I proves configured fsmonitor hook can execute outside DevStation, does not execute during inspection, and index bytes remain unchanged.
- [ ] No generic command API, automatic run, external PID kill, or secret enumeration.
- [x] I caps real 3 MB output; U verifies malformed-OSC regression; L verifies bounded frontend retention and unsubscribe. Live UI load measurement remains pending.
- [x] P loads native SQLite and verifies appearance persistence in the earlier local package and final CI package.
- [x] P uses hardened artifacts with Chromium CDP without enabling Node inspector fuses or disabling renderer sandbox.
- [ ] Final local artifact passes startup under this host's Smart App Control policy; trusted signing/distribution and retest remain needed.

## Native packaged workflow and screenshot provenance

This procedure used the **earlier local package with SHA-256 `677acfca…`**, before the final rebuild. On Windows 11 Pro without elevation, its actual `DevStation.exe` imported **Atlas API** through the Windows folder dialog. Its Git status came from a real synthetic working tree. The Windows executable picker selected `C:\Python314\python.exe`; a configuration with separate `-u` and `server.py` arguments was saved through the typed application bridge without starting a process. The native Start confirmation displayed the executable, arguments, and working directory and was explicitly accepted.

The resulting fixture server ran as PID 6388, printed real stdout, and listened on `127.0.0.1:8765`. Alt+F4 displayed the active-run confirmation; canceling kept the run active. The native Stop confirmation was then accepted, the run exited, and its listener disappeared. This verifies those actual native interaction paths; configuration form behavior is separately covered by React tests.

Three screenshots were captured from this packaged application and visually reviewed: [Overview](screenshots/overview.png), [Git details](screenshots/project-git.png), and [Runs](screenshots/runs.png). **Workbench UI** and **Notes CLI** were real synthetic Git repositories whose catalog metadata was seeded in SQLite for the screenshots; only Atlas API's import was exercised through the native picker. Displayed Git states and the active process were real, not rendered mock data.

P launches with test-only `--remote-debugging-port`, `--remote-debugging-address=127.0.0.1`, and an isolated `--user-data-dir`. Its PATH contains Windows system directories only. It performs no Node-inspector attachment to the packaged main process and deletes only its own temporary fixture directory.

## Known verification gaps

The final local artifact cannot currently launch under the host's Smart App Control signing policy. Windows 10, clean-machine installation, actual offline behavior, complete keyboard-only navigation, scaling, and 50-project performance remain unverified. Full descendant-tree termination is unsupported and the artifact is unsigned. Some fault scenarios remain NOT RUN. No coverage or performance percentage is claimed. The core workflow was demonstrated on an earlier local artifact and CI; neither final local distribution acceptance nor the entire P0 matrix is declared complete.

## Review fixes incorporated

Code review led to configuration locking during async save/Start confirmation, realpath revalidation before opening folders, main-process exit handling independent of inherited pipe closure, a linear ANSI sanitizer, bounded/throttled log delivery, and consistent unknown-run controls. Unit/integration coverage includes malformed OSC and parent/descendant exit regressions; this does not claim every concurrency interleaving has been tested.

Current hardening adds stateful decoding/sanitization, bounded log segments and timely partial-output flushing, and reconfirms the imported Git root so a deleted nested `.git` cannot silently expose an ancestor repository. UI load failures no longer appear as empty successful results; Unknown runs, sidebar labels, field validation, and modal focus have explicit handling. Expanded Electron testing found the focus regression; its complete rerun now passes after the correction. The desktop test also waits for dialog removal before reopening, avoiding a false race caused by a hidden dialog still awaiting its close handler.

Development CSP permits inline React Refresh initialization only for the exact Vite development document. Packaged production CSP remains without inline script permission. Including compiled `.vite` files, package metadata, and production `node_modules` fixed the initial SQLite omission, as earlier P/M and final CI confirm. The later local startup rejection is a distinct host signing-policy failure; no OS policy, antivirus setting, or application-control mechanism was changed to bypass it.
