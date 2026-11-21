# QA and acceptance evidence

Date: 2026-11-21. Target: v0.1.0, Windows x64. Status: **functional preview and green Windows CI; final local unsigned package blocked by Smart App Control**. Local distribution acceptance and remaining P0 checks are incomplete.

PASS means the described check was actually executed with the expected result. FAIL means an observed failure. NOT RUN means no qualifying execution evidence has been recorded. Code inspection, a mock, or a passing unit test must not be relabeled as a complete packaged workflow.

## Environment and command evidence

Local environment: Microsoft Windows 11 Pro, version 10.0.26300, build 26300; process not elevated as administrator. Development tools: Node 24.21.0, npm 11.19.0, Git 2.55.0, Electron 45.4.1, better-sqlite3 13.2.0. Final artifact/CI source: `ed3b5db5d62d9c2ab5e51ced1fff5e44ecf8240b`. Earlier locally tested artifact: `ed0cd05781c40a52e1385ba89057cacff402190b`. The intervening change corrects test fixture paths, not application source. Both artifact records and distinct hashes are in [RELEASE.md](RELEASE.md).

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

Evidence keys: **U** = [backend unit tests](../tests/unit/backend.test.ts), **I** = [backend integration tests](../tests/integration/backend.test.ts), **R** = [workspace React tests](../tests/ui/workspace.test.tsx), **L** = [log React tests](../tests/ui/logs.test.tsx), **E** = [compiled Electron workflow](../tests/e2e/desktop.spec.ts), **P** = [hardened packaged smoke](../tests/e2e/packaged.spec.ts), **M** = earlier native packaged procedure below. U/I/R/L pass locally and in final CI; E/P passed on the earlier local artifact and final CI artifact. P failed to launch the final local artifact because of host policy. E mocks native dialogs; M used real native dialogs on `677acfca…`.

| ID | Scenario | Expected outcome | Result | Evidence / scope |
| --- | --- | --- | --- | --- |
| T01 | First opening, no database | Empty home and userData database without crash | PASS | R/E plus P genuine package with fresh userData, welcome screen, and SQLite creation |
| T02 | Restart with two projects | Same IDs and paths persist | NOT RUN | I and E preserve one project/config/theme; exact two-project restart still pending |
| T03 | Import same repository twice | Duplicate rejected with explanation | PASS | I service error; E bridge duplicate rejection with mocked picker |
| T04 | Select a repository subfolder | Resolve root and communicate it | NOT RUN | I root resolution PASS; native import explanation not yet observed |
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
| T26 | Executable missing at start | Recoverable EXE_NOT_FOUND | NOT RUN | I missing executable rejected at save; saved executable disappearing before Start not yet exercised |
| T27 | Select .cmd executable | Explicit unsupported rejection | PASS | I EXE_INVALID rejection; no shell fallback |
| T28 | Working directory escapes project | Reject including junction escape | PASS | I outside-root save and post-save junction substitution rejected |
| T29 | Shell metacharacters in arguments | Arguments arrive literally | PASS | I child echoes structured arguments including operators, quotes, HTML, and Unicode |
| T30 | Process produces 3 MB output | Bounded buffer, truncation notice, responsive UI | NOT RUN | I real output cap PASS; U/L buffer and warning PASS; sustained live UI responsiveness not measured |
| T31 | HTML and ANSI in output | Text-only safe display | PASS | U/I sanitized output; L verifies literal script text without script element |
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
| T42 | Keyboard-only navigation | Navigation, dialogs, and inputs accessible | NOT RUN | Full keyboard-only workflow pending |
| T43 | 150% scaling and minimum window | No overlap or hidden critical actions | NOT RUN | Pending display/layout check |
| T44 | No Internet connection | P0 local workflows function | NOT RUN | Local operations pass; actual disconnected network not tested |
| T45 | Malicious repository metadata | Escaped text; no execution | PASS | R synthetic malicious project name remains text and creates no img element |
| T46 | Packaged Windows app | Opens, imports, runs task, persists without external Node | FAIL (final local artifact) | Host Smart App Control prevents final local EXE startup. Earlier P/M workflows and final CI desktop tests pass; they do not establish local distribution acceptance. Two-project restart remains T02 |
| T47 | Remove application package | User repositories preserved; userData policy documented | NOT RUN | ZIP removal policy documented; actual removal test pending |

## Additional security gates

- [x] E verifies renderer sandbox/isolation/nodeIntegration; P verifies no renderer require/process in the hardened artifact.
- [x] Unit checks reject unauthorized sender/subframe/document and malformed/extra IPC fields; I/E reject unknown run IDs.
- [ ] Production CSP, permission denial, navigation denial, and external URL allowlist verified.
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

Development CSP permits inline React Refresh initialization only for the exact Vite development document. Packaged production CSP remains without inline script permission. Including compiled `.vite` files, package metadata, and production `node_modules` fixed the initial SQLite omission, as earlier P/M and final CI confirm. The later local startup rejection is a distinct host signing-policy failure; no OS policy, antivirus setting, or application-control mechanism was changed to bypass it.
