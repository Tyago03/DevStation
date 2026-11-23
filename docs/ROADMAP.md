# v0.2 guided-workspace roadmap

Reviewed 2026-11-23. **Private technical milestone validated; full v0.2 acceptance and publication remain open.** Validated source: `3092f81a37b575296e9e7afdef8d6e990cfe49c6` on `codex/v0.2-guided-workspace`, continuing the existing repository from `f9ee2e3`. The previous record is [ROADMAP-v0.1](ROADMAP-v0.1.md).

## Briefing provenance and authorization

The new manual/prompt supply product requirements. They are reference material, not independent permission to publish, spend, rewrite history, contact participants or weaken Windows protections. Earlier authorization for private development/push remains applicable. No second repository was created.

| Reference | SHA-256 |
| --- | --- |
| DevStation_Manual_v0.2_para_Codex.md | `82caefd399d630c7fa5c0e841ad761db17c6b2c97f80d9ba0ed7933ae1d15269` |
| DevStation_Manual_v0.2_para_Codex.pdf | `a6d15fe9ecce7b819f3c8acb404408706ce317f369eae16dc512d46d4bffb1e5` |
| DevStation_Prompt_v0.2_Codex.md | `49a12829736a3e5142d2b9c812691d4883eb80ea880eaf1fc949256560b7e1c9` |

The 14-page PDF was extracted/rendered; it adds no requirement beyond the Markdown. Originals and synced sources remain unchanged. Version 0.2.0 identifies a preview, not a release tag.

## Implementation and acceptance

| Item | Implemented behavior | Remaining acceptance |
| --- | --- | --- |
| P0-01 | Safe shutdown; partial/Unknown/error retained; retry/Keep open; second Quit anyway confirmation; starts gated while closing | Automated lifecycle checks PASS; native start/stop confirmations and clean close/reopen PASS. Complete native-keyboard workflow remains separate |
| P0-02 | Private preview; source/hash/build records; historical evidence preserved; current unsigned package launches locally | Exact current local launch PASS; trusted signing and broader distribution approval remain open |
| P0-03 | Tool-failure, log-load, crash, listener and removal regressions | Executed scopes in QA, no mock promoted to a physical test |
| P0-04 | Bundled searchable Help, local Documentation action | Physical offline test separate from Chromium emulation |
| P1-01 | Persistent optional five-step tour with Back, Skip and restart | Human first-use observation |
| P1-02 | Python/Node scripts, isolated loopback http.server, Advanced; exact argv preview and script revalidation | Windows automated end-to-end checks PASS; real folder/program/script selection and native start/stop subset PASS. Human comprehension remains untested |
| P1-03/04 | Contextual explanations, stale/error states and timestamps | Human comprehension study |
| P1-05 | In-memory demo with no bridge calls; next action after import | Human discovery study |
| P1-06 | English UI, labels/focus/keyboard, responsive layout, reduced motion | Native display scaling and complete native-picker keyboard study |
| Public-source preparation | MIT/notices/audit/privacy scan, contribution/security docs, signing research; final package notices and synthetic screenshots verified | Historical-email decision, final source/output scan, verified intake channel, visibility approval |
| Human study | Protocol and blank records for 3–5 actual participants | Actual recruitment/consent/sessions; no contacts or invented results |

The server template uses `-I -u` to exclude current-directory/user-site module lookup and keep output timely. Advanced configurations remain explicitly selected and confirmed; tasks are not sandboxed. [Python isolated-mode documentation](https://docs.python.org/3/using/cmdline.html#cmdoption-I).

## Validated technical snapshot

Local validation passed **98 automated tests and 11 desktop checks**. Independent [Windows CI 45233998754](https://github.com/Tyago03/DevStation/actions/runs/45233998754) also passed for source 3092f81: 42 unit, 28 integration and 28 UI tests, plus 11 desktop checks. The desktop set includes compiled Electron workflows and one hardened packaged-EXE check; these scopes remain distinct. [CI evidence](evidence/v0.2-ci.json).

The final local unsigned ZIP has SHA-256 `2e38b79ae2e5aa59d78bdd77370cc716db67cdfb71617c4ce3f7bad013e0a882`. Its actual packaged application passed native folder/program/script pickers, Save without execution, default-Cancel confirmations operated with Tab/Enter, Running/output/loopback Ports, Stop with no active task or matching listener, persistence after close/reopen and a final verified exit. Stop displayed Exited with an unknown exit code; a zero exit code is not asserted. This establishes the recorded native keyboard subset, not complete keyboard accessibility. Earlier v0.1 Smart App Control failures are historical; no protection was disabled for this package.

The package includes the original MIT notice at resources/LICENSE, byte-matched to the root license, plus Electron's LICENSE, Chromium notices and third-party notices. Three actual compiled v0.2 screenshots with synthetic data passed visual/privacy review; [screenshot evidence](evidence/v0.2-screenshots.json) records their identities and preparation. See [QA](QA.md), [RELEASE](RELEASE.md) and [publication checklist](PUBLICATION_CHECKLIST.md) for exact scope and remaining decisions.

## Completion rule

Implementation and automated validation do not establish full v0.2 acceptance. [QA](QA.md) and [RELEASE](RELEASE.md) record source, artifacts, environment and limits. Windows 10, native Windows scaling, physical offline, complete native-keyboard coverage and human usability remain NOT RUN in their full scopes. Trusted signing and public distribution require separate decisions. The active user network and host protections were preserved.

P2 remains out of scope: shell recipes, Git writes, log export, task-to-port control, diff/history, GitHub integration, AI/cloud, notifications and other platforms. Public visibility, release creation, spending and history remediation require a separate concrete review packet and decision.
