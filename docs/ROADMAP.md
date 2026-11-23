# v0.2.1 finishing and release roadmap

Reviewed 2026-11-23. **The v0.2.1 candidate passes 12 local compiled desktop checks; its unsigned packaged EXE is blocked by local Windows signing policy. Main-branch CI and publication remain pending.** Current source, results and artifacts belong to [QA](QA.md), [RELEASE](RELEASE.md) and the [project overview](../README.md). The earlier record is the [v0.1 roadmap](history/v0.1/ROADMAP.md); v0.2.0 results below are historical.

## Briefing provenance and authorization

The v0.2 manual/prompt supply product requirements. They are reference material, not independent permission to publish, spend, rewrite history, contact participants or weaken Windows protections. No second repository was created. A later explicit owner request now authorizes polishing v0.2.1, merging to main, making the repository public and publishing an unsigned Windows pre-release after satisfactory safety/privacy and final validation. It does not authorize history rewriting, signing purchases or weaker Windows protections.

| Reference | SHA-256 |
| --- | --- |
| DevStation_Manual_v0.2_para_Codex.md | `82caefd399d630c7fa5c0e841ad761db17c6b2c97f80d9ba0ed7933ae1d15269` |
| DevStation_Manual_v0.2_para_Codex.pdf | `a6d15fe9ecce7b819f3c8acb404408706ce317f369eae16dc512d46d4bffb1e5` |
| DevStation_Prompt_v0.2_Codex.md | `49a12829736a3e5142d2b9c812691d4883eb80ea880eaf1fc949256560b7e1c9` |

The 14-page PDF was extracted/rendered; it adds no requirement beyond the Markdown. Originals and synced sources remain unchanged. Version 0.2.0 was a private milestone; the later request targets the [v0.2.1 pre-release](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1), still pending publication.

## Implementation and acceptance

| Item | Implemented behavior | Remaining acceptance |
| --- | --- | --- |
| P0-01 | Safe shutdown; partial/Unknown/error retained; retry/Keep open; second Quit anyway confirmation; starts gated while closing | Compiled lifecycle checks PASS. Current packaged-native workflow is blocked locally; earlier native observations retain their historical scope |
| P0-02 | Source/hash/build records and preserved historical evidence | Current unsigned EXE BLOCKED by local Windows signing policy; main CI/package result and publication pending |
| P0-03 | Tool-failure, log-load, crash, listener and removal regressions | Executed scopes in QA, no mock promoted to a physical test |
| P0-04 | Bundled searchable Help, local Documentation action | Physical offline test separate from Chromium emulation |
| P1-01 | Persistent optional five-step tour with Back, Skip and restart | Human first-use observation |
| P1-02 | Python/Node scripts, isolated loopback http.server, Advanced; exact argv preview and script revalidation | Compiled end-to-end checks PASS, including explicit changed-script review/authorization. Native dialogs in automation use fixture responses; human comprehension remains untested |
| P1-03/04 | Contextual explanations, stale/error states and timestamps | Human comprehension study |
| P1-05 | In-memory demo with no bridge calls; next action after import | Human discovery study |
| P1-06 | English UI, labels/focus/keyboard, responsive layout, reduced motion | Native display scaling and complete native-picker keyboard study |
| Public-source preparation | MIT preserved; docs and v0.2.1 screenshots prepared; known package privacy findings addressed | Email classification resolved as already-public attribution; visibility/release conditionally authorized. Final source/archive/output scans, main CI and verified reporting route remain required |
| Human study | Protocol and blank records for 3–5 actual participants | Actual recruitment/consent/sessions; no contacts or invented results |

The server template uses `-I -u` to exclude current-directory/user-site module lookup and keep output timely. Advanced configurations remain explicitly selected and confirmed; tasks are not sandboxed. [Python isolated-mode documentation](https://docs.python.org/3/using/cmdline.html#cmdoption-I).

## Historical v0.2.0 technical snapshot

Local validation passed **98 automated tests and 11 desktop checks**. Independent [Windows CI 45233998754](https://github.com/Tyago03/DevStation/actions/runs/45233998754) also passed for source 3092f81: 42 unit, 28 integration and 28 UI tests, plus 11 desktop checks. The desktop set includes compiled Electron workflows and one hardened packaged-EXE check; these scopes remain distinct. [CI evidence](evidence/v0.2-ci.json).

The historical v0.2.0 unsigned ZIP has SHA-256 `2e38b79ae2e5aa59d78bdd77370cc716db67cdfb71617c4ce3f7bad013e0a882`. Its actual packaged application passed native folder/program/script pickers, Save without execution, default-Cancel confirmations operated with Tab/Enter, Running/output/loopback Ports, Stop with no active task or matching listener, persistence after close/reopen and a final verified exit. Stop displayed Exited with an unknown exit code; a zero exit code is not asserted. These observations do not establish current v0.2.1 packaged-launch acceptance, which is blocked locally. No protection was disabled.

The package includes the original MIT notice at resources/LICENSE, byte-matched to the root license, plus Electron's LICENSE, Chromium notices and third-party notices. Three actual compiled v0.2 screenshots with synthetic data passed visual/privacy review; [screenshot evidence](evidence/v0.2-screenshots.json) records their identities and preparation. See [QA](QA.md), [RELEASE](RELEASE.md) and [publication checklist](PUBLICATION_CHECKLIST.md) for exact scope and remaining decisions.

## Completion rule

Implementation and automated validation do not establish complete compatibility or usability. [QA](QA.md) and [RELEASE](RELEASE.md) record source, artifacts, environment and limits. Windows 10, native Windows scaling, physical offline, complete native-keyboard coverage and human usability remain NOT RUN in their full scopes. Unsigned pre-release publication is conditionally authorized; trusted signing remains outside that authorization. The active user network and host protections were preserved.

P2 remains out of scope: shell recipes, Git writes, log export, task-to-port control, diff/history, GitHub integration, AI/cloud, notifications and other platforms. Public visibility and the v0.2.1 pre-release are conditionally authorized by the owner's later request; they remain pending final source, privacy, CI, artifact and reporting-channel checks. Spending and history remediation require separate authorization.

## v0.2.1 finishing scope

The current iteration adds explicit review/authorization of a changed saved script, clearer evidence-based process outcomes, focused interface polish and public-facing documentation. Actual compiled v0.2.1 workspace, Runs, Help and demo captures use synthetic data and passed visual review. It preserves the architecture, existing MIT license and development history. Old test counts and artifacts are not reused as proof of the changed version; [current QA](QA.md), [release evidence](RELEASE.md) and the [publication checklist](PUBLICATION_CHECKLIST.md) track final results. Private Vulnerability Reporting remains planned until its configuration is verified.
