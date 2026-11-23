# Changelog

Changes are grouped by version. Historical preview milestones are not retroactively presented as public releases.

## 0.2.1 — Pre-release in preparation

Main-branch CI and publication are pending. The [intended v0.2.1 pre-release](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) is not yet claimed as published. [RELEASE](docs/RELEASE.md) records exact source and artifact identities.

### Changed

- Changed guided scripts can be reviewed and explicitly authorized without repeating the entire setup. The current UTF-8 file is shown; the previous source is not stored, so this is not a historical diff.
- Review authorization is short-lived, configuration-specific and single-use. Main-process path, file identity, content and setup checks are repeated before saving. Authorization never starts a task.
- Confirmed task exits distinguish user stop, successful completion, nonzero error exit and genuinely unknown outcome. Unconfirmed termination remains active/Unknown.
- Repository presentation now includes a concise README, a documentation index, contribution guidance, real v0.2.1 screenshots with synthetic data and preserved historical records.

### Fixed

- Pre-publication inspection found development caches and generated SQLite gyp/MSBuild files carrying build-machine paths inside the application archive. Packaging now excludes development caches and removes non-runtime native build intermediates from Forge's staged copy while retaining `.node` bindings. Final archive privacy checks and packaged validation remain required for the rebuilt release candidate.

### Validation and release status

Twelve compiled desktop checks pass locally. The actual unsigned packaged EXE is blocked by Windows signing policy on this machine; compiled tests and screenshots do not replace that launch check. Main-branch CI and publishing remain pending. Full counts, source/artifact identities and evidence belong to [QA](docs/QA.md) and [RELEASE](docs/RELEASE.md). Existing v0.2.0 results are not reused as proof of v0.2.1 acceptance; the intended release remains Pre-release.

## 0.2.0 — Private preview milestone, 2026-11-23

### Added

- Searchable offline help, contextual explanations and an optional persistent five-step tour.
- Guided Python/Node setups with native selection, canonical containment, exact argument previews and script fingerprints.
- An isolated Python http.server template bound to loopback with a validated port.
- A synthetic example workspace that creates no files, projects, listeners or processes.
- Schema v2 migration with backup and preservation of configurations/preferences.
- Publication/privacy tooling, signing research and an unfilled human-usability protocol.

### Fixed

- Partial/uncertain stop results keep the app open, with Retry and a second Quit anyway confirmation.
- Starts are gated while closing and immediately before process creation; confirmed exits clear stale uncertainty.
- Ports and Diagnostics distinguish not checked, failed, stale and empty success, with timestamps and retry.
- Guided-form focus recovery, keyboard navigation and minimum-window/Chromium-zoom layouts.
- Project-local Python modules cannot replace the fixed isolated web-server template.

### Recorded validation

Source `3092f81` passed 98 automated tests and 11 desktop checks locally and in Windows CI. The identified unsigned package also passed a native workflow with real dialogs, task logs/ports and restart persistence. No public release or tag was created for this milestone. Historical v0.1 policy failures remain separate observations; no Windows protection was disabled.

Human usability, Windows 10, real Windows display scaling, physical offline and broader distribution were not declared complete. See the [historical QA](docs/history/v0.2/QA.md) and [build record](docs/history/v0.2/RELEASE.md) for the observed scope.

## 0.1.0 — Private preview milestone, 2026-11-21

Added local Git registration/read-only inspection, SQLite metadata, executable configurations, confirmed process control, bounded logs, TCP inspection, diagnostics and themes. Follow-up hardening covered fragmented UTF-8/ANSI, timely partial output, Git-root revalidation, failure states and dialog focus.

Source `96e6c45` passed 53 automated tests and three desktop checks in Windows CI. Its local unsigned ZIP was blocked by host policy; earlier successful native observations referred to different bytes. See the [historical QA](docs/history/v0.1/QA.md), [build records](docs/history/v0.1/RELEASE.md) and [roadmap](docs/history/v0.1/ROADMAP.md).
