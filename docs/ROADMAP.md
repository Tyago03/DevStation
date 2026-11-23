# v0.2 guided-workspace roadmap

Reviewed 2026-11-23. Continue the private repository from `f9ee2e3a08753f0c941ee75f11b16916d3567622` on `codex/v0.2-guided-workspace`. The previous record is [ROADMAP-v0.1](ROADMAP-v0.1.md).

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
| P0-01 | Safe shutdown; partial/Unknown/error retained; retry/Keep open; second Quit anyway confirmation; starts gated while closing | Runtime evidence in QA; native interactions identified separately |
| P0-02 | Private preview; source/hash/build records; historical evidence preserved | Signing and exact local launch remain separate gates |
| P0-03 | Tool-failure, log-load, crash, listener and removal regressions | Executed scopes in QA, no mock promoted to a physical test |
| P0-04 | Bundled searchable Help, local Documentation action | Physical offline test separate from Chromium emulation |
| P1-01 | Persistent optional five-step tour with Back, Skip and restart | Human first-use observation |
| P1-02 | Python/Node scripts, isolated loopback http.server, Advanced; exact argv preview and script revalidation | Windows end-to-end checks and human comprehension |
| P1-03/04 | Contextual explanations, stale/error states and timestamps | Human comprehension study |
| P1-05 | In-memory demo with no bridge calls; next action after import | Human discovery study |
| P1-06 | English UI, labels/focus/keyboard, responsive layout, reduced motion | Native display scaling and complete native-picker keyboard study |
| Public-source preparation | MIT/notices/audit/privacy scan, contribution/security docs, signing research | Historical-email decision, verified intake channel, visibility approval |
| Human study | Protocol and blank records for 3–5 actual participants | Actual recruitment/consent/sessions; no contacts or invented results |

The server template uses `-I -u` to exclude current-directory/user-site module lookup and keep output timely. Advanced configurations remain explicitly selected and confirmed; tasks are not sandboxed. [Python isolated-mode documentation](https://docs.python.org/3/using/cmdline.html#cmdoption-I).

## Completion rule

Implementation and automated validation do not establish full v0.2 acceptance. [QA](QA.md) and [RELEASE](RELEASE.md) record source, artifacts, environment and limits. Windows scaling, physical offline, usability and signing gates remain visible. This session will not disconnect the active user network or weaken host policy merely to turn a row green.

P2 remains out of scope: shell recipes, Git writes, log export, task-to-port control, diff/history, GitHub integration, AI/cloud, notifications and other platforms. Public visibility, release creation, spending and history remediation require a separate concrete review packet and decision.
