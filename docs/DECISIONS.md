# Technical decisions

Date: 2026-11-21. This records implementation choices and their validation status.

## ADR-001: Windows desktop and local storage

Use Electron, React, strict TypeScript, Zod, and SQLite. Main owns privileged operations, preload exposes a small typed API, and renderer contains presentation logic. Windows x64 is the first target. No account, hosted backend, AI, telemetry, or cross-platform support claim is part of v0.1.

## ADR-002: Forge 8 with a locally constructed scaffold

Initial `npx create-electron-app@8.0.1` scaffolding failed because Windows App Control blocked the `oxfmt` native binding. The selected recovery is to construct the project from the official Forge template structure and use JavaScript-based ESLint tooling. Windows security policy is not disabled or bypassed.

Forge 8.0.1 release notes promote the Vite plugin to stable and state that it targets Vite 8. The website's template page still contains an older Forge 7.5 experimental warning. Use the release notes when describing Forge 8, and do not mistake the stale warning for current behavior. [Forge release](https://github.com/electron/forge/releases/tag/v8.0.1), [template](https://www.electronforge.io/templates/vite-%2B-typescript).

Use Vite 8.3.8 with `@vitejs/plugin-react` 6.3.0, aligned with Forge 8's target. Vite 8 imported successfully on the development host. Vitest 5.1.1, ESLint 10.15.0, and jest-dom 8 complete the selected tooling. The generator failure was specific to its formatting dependency; it does not justify claiming that all native build tooling is blocked. Real packaging remains a separate verification gate.

## ADR-003: Pinned runtime versions

Bootstrap versions: Node 24.21.0 LTS, npm 11.19.0, Git 2.55.0, Electron 45.4.1, and `better-sqlite3` 13.2.0. `package-lock.json` is the reproducibility source. Version selection is not evidence of ABI compatibility: tests must load SQLite in the packaged Electron runtime.

## ADR-004: Native SQLite and unsigned ZIP

Keep `better-sqlite3` for transactional local metadata. Use ASAR plus Forge's native unpack support and rebuild the binding for Electron. Validate persistence after packaging and after restarting. The first artifact is a Windows x64 ZIP, without code signing or auto-update. No public release is created automatically. [Native unpack documentation](https://www.electronforge.io/config/plugins/auto-unpack-natives).

The initial package build succeeded, but launching its actual executable failed because `better-sqlite3` was omitted by Forge Vite's package ignore behavior. The packaging policy explicitly retains `.vite`, `node_modules`, and `package.json`, with development dependencies pruned. The corrected hardened executable passed startup with no external Node on PATH, SQLite appearance persistence across restart, and a separate native import/run/stop workflow. Build success alone was not used as acceptance evidence.

## ADR-005: Git inspection without automatic hooks or index writes

Use only fixed readonly commands with structured arguments. Supply `--no-optional-locks` and disable `core.fsmonitor` per invocation. This avoids Git's optional index refresh write and repository-configured fsmonitor hook execution. Do not change global configuration, bypass `safe.directory`, or inspect remote URLs. Test clean, modified, renamed, unborn, detached, Unicode, and hostile-hook fixtures. [Git status](https://git-scm.com/docs/git-status), [Git configuration](https://git-scm.com/docs/git-config).

## ADR-006: Explicit process execution

Configurations select a Windows executable and separate arguments. Save and Start validate the executable and canonical working directory. No shell command field or automatic execution exists. `.cmd` and `.bat` remain unsupported because they require a shell on Windows. A selected executable remains fully trusted user code, not sandboxed code. [Node process documentation](https://nodejs.org/api/child_process.html).

Stop controls only an in-memory process belonging to the current instance. Descendant termination is not promised. Confirm Stop and application close with active tasks; never accept arbitrary PID input or reclaim old PIDs after a crash.

## ADR-007: Honest diagnostics and bounded logs

Report unchecked or unavailable tools as such. An unsafe npm version fallback is worse than **Not checked**, so do not introduce a generic shell for diagnostics. Port scope describes local bind addresses, not Internet reachability. Logs remain bounded, memory-only, sanitized text; truncation is visible.

## ADR-008: Verification and privacy

Tests use synthetic temporary projects. A passing service test does not imply the same UI action or packaged workflow passed. Maintain a separate acceptance matrix with PASS, FAIL, and NOT RUN. Screenshots must depict the actual application without personal or business data. Use [Playwright's Electron API](https://playwright.dev/docs/api/class-electron) where compatible and retain evidence of a hardened package launch separately.

The Vite development document needs inline React Refresh initialization, so its development-only CSP permits inline scripts. Production has a separate restrictive CSP without this allowance. Packaged observation uses Chromium CDP rather than turning on Node inspector fuses. Native-dialog stubs in the compiled-app test are documented explicitly; they do not verify real confirmation interaction.

The 0.1.0 code is delivered as a functional preview. Real native dialogs and process/port interactions were exercised on an earlier local artifact, with synthetic screenshots. Baseline Windows CI at `ed3b5db` passed both desktop tests. The later local rebuild was blocked by the host's Smart App Control signing policy; earlier runtime evidence does not establish acceptance of that local binary or a subsequent rebuild. No policy was bypassed. Trusted signing/distribution and another local launch check remain necessary. Fault, full accessibility, actual scaling, and full offline cases remain open; no complete P0 or universal support claim is made.

## ADR-009: Private repository and licensing

The owner explicitly authorized creating and pushing to `Tyago03/DevStation` as a private repository on 2026-11-21. This supersedes the earlier briefing's instruction to wait for remote authorization. It does not authorize public publication.

Original implementation is MIT licensed. No source from unrelated personal or work projects is imported. Dependency notices and license review remain a separate release requirement.

## ADR-010: Incremental bounded output with timely partial display

Decode each stdout/stderr stream incrementally with its own UTF-8 decoder and ANSI state, so byte and escape-sequence boundaries do not corrupt text. A fixed-capacity ring retains bounded recent output. Emit long output in segments of at most 16,384 UTF-16 code units, avoiding surrogate-pair splits. Flush pending text at a 200 ms first-pending deadline and on stream end; a debounce could otherwise hide continuously arriving output without newlines. Stream end cancels timers and finalizes only once.

This favors timely, bounded display over preserving arbitrary source-line boundaries. A long or slowly emitted line can appear as multiple timestamped segments. Logs remain memory-only, and retention truncation remains visible. Current unit and real-process integration tests cover fragmented Unicode/ANSI, malformed escapes, segment bounds, timer cleanup, and live newline-free output. They do not establish sustained renderer responsiveness under load; T30 remains open.

## ADR-011: Revalidate identity and distinguish failure from emptiness

Reconfirm the canonical Git working-tree root before inspection. If a registered nested repository loses its `.git` marker, reject inspection instead of accepting Git's upward search into an ancestor repository. The regression uses only a temporary nested fixture and checks that its catalog entry remains intact.

Catalog, run, and configuration loading failures must have explicit error/retry presentation rather than empty successful states. Unknown process status must remain Unknown. Dialog validation associates errors with the relevant inputs; initial focus is set after opening the modal and restored on cleanup. Current React tests cover these behaviors, and the expanded compiled Electron workflow passes after it exposed a focus regression. Its keyboard checks cover the configuration form, not every native dialog or application route.

## ADR-012: Continue the existing specification and separate evidence layers

The newly supplied briefing archive is exactly equivalent to the earlier manual after line-ending and outer-whitespace normalization; all six numbered documents appear verbatim in that manual. Preserve the existing private repository and authorization instead of bootstrapping again. Record the briefing hash separately from executable hashes in [ROADMAP.md](ROADMAP.md).

The current compiled Electron security test exercises production CSP, denied geolocation, navigation/popups, strict IPC schemas, unauthorized-window rejection, and the help URL allowlist. It stubs only the final OS URL opener for that link check. Chromium offline Settings navigation/reload is useful bounded evidence, not proof of a physically disconnected full workflow. Current [Windows CI run 44960251660](https://github.com/Tyago03/DevStation/actions/runs/44960251660) passes 53 automated tests and 3 desktop checks on `96e6c45`, including hardened packaged startup/persistence; lint, types, build, checksums and private artifact upload also pass. The final local rebuild remains blocked by Smart App Control, as recorded in [QA.md](QA.md). The CI artifact-container digest and local application ZIP digest identify distinct objects. Historical CI and artifact results must never be promoted to a new source revision or new binary without their own execution evidence.
