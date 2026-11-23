# Changelog

Changes are grouped by version. Historical preview milestones are not retroactively presented as public releases.

## 0.2.1 — Pre-release, 2026-11-23

[v0.2.1](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) is published from tested main merge commit `57e30026e3da69d90c022d586b8eeb0328c0ecfc`, following [PR #1](https://github.com/Tyago03/DevStation/pull/1). The repository is public and GitHub Private Vulnerability Reporting is enabled and verified. [RELEASE](docs/RELEASE.md) records exact source and artifact identities.

### Changed

- Changed guided scripts can be reviewed and explicitly authorized without repeating the entire setup. The current UTF-8 file is shown; the previous source is not stored, so this is not a historical diff.
- Review authorization is short-lived, configuration-specific and single-use. Main-process path, file identity, content and setup checks are repeated before saving. Authorization never starts a task.
- Confirmed task exits distinguish user stop, successful completion, nonzero error exit and genuinely unknown outcome. Unconfirmed termination remains active/Unknown.
- Repository presentation now includes a concise README, a documentation index, contribution guidance, real v0.2.1 screenshots with synthetic data and preserved historical records.

### Fixed

- Pre-publication inspection found development caches and generated SQLite gyp/MSBuild files carrying build-machine paths inside preliminary application archives. Packaging now excludes development caches and removes non-runtime native build intermediates from Forge's staged copy while retaining `.node` bindings. The exact published ZIP passed application-archive and external-file privacy/notices checks and packaged execution in CI; the affected preliminary archives were not published.

### Validation and release status

[Main CI](https://github.com/Tyago03/DevStation/actions/runs/45248171830) passed 50 unit, 48 integration and 45 UI tests (143 total), plus 13 desktop checks on Windows Server 2025. Packaged checks extracted and launched the exact ZIP attached to the release. Locally on Windows 11, 12 compiled desktop checks passed and a separately built unsigned candidate was blocked by signing policy; that failure is not attributed to different release bytes. The release is marked Pre-release and includes the ZIP, BUILD.txt and SHA256SUMS.txt. [QA](docs/QA.md) and [RELEASE](docs/RELEASE.md) preserve exact identities and remaining limitations.

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
