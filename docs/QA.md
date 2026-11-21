# QA and acceptance evidence

Date: 2026-11-21. Target: v0.1.0, Windows x64. Status: **core automated checks pass; packaged-release verification in progress**.

PASS means the described check was actually executed with the expected result. FAIL means an observed failure. NOT RUN means no qualifying execution evidence has been recorded. Code inspection, a mock, or a passing unit test must not be relabeled as a complete packaged workflow.

## Environment and command evidence

Initial development tools: Node 24.21.0, npm 11.19.0, Git 2.55.0, Electron 45.4.1, better-sqlite3 13.2.0. Full Windows build, privilege level, test commit, and artifact checksum must accompany packaged verification.

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
| Compiled Electron workflow | `npm run test:e2e` | PASS | 1 test; 30.5 seconds; real Electron, Git, SQLite, and Python; native dialogs mocked; unbundled production compilation |
| Initial Forge package build | Forge Windows packaging | PASS | Build produced an executable; build success did not establish launch success |
| Initial packaged launch | Actual `DevStation.exe` | FAIL | `better-sqlite3` was omitted by Forge Vite's package ignore policy; explicit runtime dependency inclusion added; retest pending |
| Final Windows ZIP | `npm run make` | NOT RUN | Final corrected artifact and checksum not yet recorded |
| Hardened packaged smoke | Actual executable with Chromium CDP observation | NOT RUN | Pending runtime, no-external-Node, and restart-persistence checks |
| GitHub Actions | Windows workflow | NOT RUN | No completed remote run recorded |
| Production package notices | Inspect locked installed licenses | PASS | Nine package entries inventoried; Lucide ISC and Feather MIT text retained; final ZIP notice inclusion still pending |

## Acceptance matrix

All scenarios use synthetic temporary repositories. PASS rows identify their evidence layer and do not imply packaged UI approval. Where a scenario also requires an untested native interaction, real failure condition, or packaged behavior, it remains NOT RUN with the completed partial evidence stated.

Evidence keys: **U** = [backend unit tests](../tests/unit/backend.test.ts), **I** = [backend integration tests](../tests/integration/backend.test.ts), **R** = [workspace React tests](../tests/ui/workspace.test.tsx), **L** = [log React tests](../tests/ui/logs.test.tsx), **E** = [compiled Electron workflow](../tests/e2e/desktop.spec.ts). U/I/R/L ran in the 35-test suite; E ran separately. E replaces native file/confirmation dialogs with deterministic test answers.

| ID | Scenario | Expected outcome | Result | Evidence / scope |
| --- | --- | --- | --- | --- |
| T01 | First opening, no database | Empty home and userData database without crash | PASS | R empty-state behavior; E fresh isolated userData, application opens and queries work |
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
| T19 | Git missing or denied | Helpful error; application stays usable | NOT RUN | I nonexistent executable rejection PASS; whole application without Git not yet run |
| T20 | Git refuses unsafe ownership | Explain refusal; do not alter configuration | NOT RUN | No actual unsafe-ownership fixture; similarly named missing-tool test does not cover this |
| T21 | Git operation times out | Bounded operation; UI remains responsive | NOT RUN | I command-runner timeout/output caps PASS; actual stalled Git plus UI not exercised |
| T22 | Path with shell metacharacters | Literal path; no injected command | PASS | I fixtures use spaces and ampersand with real Git argument arrays |
| T23 | Save Python server profile | Configuration saved without launching | PASS | R structured form saves without Start; E saves real Python profile and verifies zero runs |
| T24 | Start after consent | Managed process, PID, state, and logs | NOT RUN | I/E real Python launch/PID/logs PASS; E auto-answers confirmation, native consent interaction pending |
| T25 | Natural process exit | Exit code and final state | PASS | I real exit code 7; parent exit with inherited descendant pipes regression |
| T26 | Executable missing at start | Recoverable EXE_NOT_FOUND | NOT RUN | I missing executable rejected at save; saved executable disappearing before Start not yet exercised |
| T27 | Select .cmd executable | Explicit unsupported rejection | PASS | I EXE_INVALID rejection; no shell fallback |
| T28 | Working directory escapes project | Reject including junction escape | PASS | I outside-root save and post-save junction substitution rejected |
| T29 | Shell metacharacters in arguments | Arguments arrive literally | PASS | I child echoes structured arguments including operators, quotes, HTML, and Unicode |
| T30 | Process produces 3 MB output | Bounded buffer, truncation notice, responsive UI | NOT RUN | I real output cap PASS; U/L buffer and warning PASS; sustained live UI responsiveness not measured |
| T31 | HTML and ANSI in output | Text-only safe display | PASS | U/I sanitized output; L verifies literal script text without script element |
| T32 | Stop managed run | Confirmation; main process stops; child caveat shown | NOT RUN | I/E real stop and port release PASS; E auto-answers confirmation; native Stop dialog pending |
| T33 | Stop unknown ID/PID | Reject; no external process terminated | PASS | I unknown ID rejected while owned runs remain; E unknown UUID rejected |
| T34 | Close with active process | Decision dialog and documented behavior | NOT RUN | Native active-run close decision not yet exercised |
| T35 | Reopen after crash | No ownership of old PIDs | NOT RUN | E normal restart has empty run list; crash/old-process case not yet exercised |
| T36 | Exceed concurrent run limit | RUN_LIMIT before spawning extra process | PASS | I concurrent per-project limit of 2 and global limit of 5 |
| T37 | Controlled listener on loopback | Correct TCP port and loopback scope | PASS | I real Python HTTP listener, PID, local HTTP response, stderr request log, port release; E confirms listener |
| T38 | IPv6 loopback listener | Correct IPv6 parsing | PASS | U synthetic `[::1]` netstat record; actual IPv6 listener unverified |
| T39 | Listener on all interfaces | Correct scope plus network caveat | NOT RUN | U scope classification PASS; actual bind and UI caveat interaction not yet checked |
| T40 | netstat failure or timeout | Unavailable error with retry; no false empty success | NOT RUN | R failure/retry UI PASS using stub; actual netstat failure not yet induced |
| T41 | Missing Node or Python | Not found; application remains usable | NOT RUN | Pending isolated missing-tool launch |
| T42 | Keyboard-only navigation | Navigation, dialogs, and inputs accessible | NOT RUN | Full keyboard-only workflow pending |
| T43 | 150% scaling and minimum window | No overlap or hidden critical actions | NOT RUN | Pending display/layout check |
| T44 | No Internet connection | P0 local workflows function | NOT RUN | Local operations pass; actual disconnected network not tested |
| T45 | Malicious repository metadata | Escaped text; no execution | PASS | R synthetic malicious project name remains text and creates no img element |
| T46 | Packaged Windows app | Opens, imports, runs task, persists without external Node | FAIL | Initial executable could not find better-sqlite3; corrected package retest pending |
| T47 | Remove application package | User repositories preserved; userData policy documented | NOT RUN | ZIP removal policy documented; actual removal test pending |

## Additional security gates

- [x] E verifies no renderer require/process and sandbox/isolation/nodeIntegration settings; hardened artifact still pending.
- [x] Unit checks reject unauthorized sender/subframe/document and malformed/extra IPC fields; I/E reject unknown run IDs.
- [ ] Production CSP, permission denial, navigation denial, and external URL allowlist verified.
- [x] I proves configured fsmonitor hook can execute outside DevStation, does not execute during inspection, and index bytes remain unchanged.
- [ ] No generic command API, automatic run, external PID kill, or secret enumeration.
- [x] I caps real 3 MB output; U verifies malformed-OSC regression; L verifies bounded frontend retention and unsubscribe. Live UI load measurement remains pending.
- [ ] SQLite loads and persists in the actual packaged Electron executable.
- [ ] Production fuses remain hardened during packaged smoke.

## Known verification gaps

Windows 10, code signing, clean-machine installation, actual offline behavior, a full descendant process tree, display scaling, and 50-project performance are unverified until explicit evidence is added. Screenshots have not yet been captured. No coverage or performance percentage is claimed.

## Review fixes incorporated

Code review led to configuration locking during async save/Start confirmation, realpath revalidation before opening folders, main-process exit handling independent of inherited pipe closure, a linear ANSI sanitizer, bounded/throttled log delivery, and consistent unknown-run controls. Unit/integration coverage includes malformed OSC and parent/descendant exit regressions; this does not claim every concurrency interleaving has been tested.

Development CSP permits inline React Refresh initialization only for the exact Vite development document. Packaged production CSP remains without inline script permission. The initial packaged failure is being addressed by explicitly retaining the compiled `.vite` files, package metadata, and production `node_modules` during packaging while pruning development dependencies.
