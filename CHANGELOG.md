# Changelog

This file records observed changes and clearly separates planned work. No public binary release or version tag is implied.

## Unreleased - v0.2 cycle

The guided-workspace implementation is a private 0.2.0 preview. Validation is recorded in QA; full acceptance and public distribution remain separate.

### Added

- Bundled searchable offline help, contextual explanations and an optional persistent five-step tour.
- Guided Python/Node script setups with exact argument previews, native selection, containment and content-change checks.
- A loopback-only http.server template with isolated Python module lookup and validated port.
- An entirely synthetic in-memory example workspace with no privileged bridge calls.
- Schema v2 metadata migration with backup and preservation of existing configurations/preferences.
- Contributor guidance, publication/privacy checklist and signing-option research.
- A reproducible, redacted scan of current source and reachable local Git history.
- A usability-study protocol with unfilled records for three to five participants. No participant results are claimed.

### Fixed

- Uncertain/partial stop results keep the app open. Retry and a separate Quit anyway confirmation preserve honest process ownership.
- Starts are gated during close decisions and immediately before process creation; later verified exit clears stale uncertainty.
- Ports and Diagnostics distinguish not checked, failed, stale and empty success, with timestamps and retry.
- Guided-form focus recovery, keyboard navigation and layouts at the minimum window/Chromium zoom.
- Python server module shadowing by project-local files is prevented by the fixed isolated template.

### Release status

- Repository remains private; no v0.2 tag or public binary release has been created.
- The historical v0.1 local unsigned package is blocked by Smart App Control. A new artifact needs its own hash, environment and launch evidence.
- User study, final v0.2 validation and publication approval remain separate gates.

## 0.1.0 preview - 2026-11-21

Implemented local Git project registration/read-only inspection, SQLite metadata, explicit executable configurations, confirmed process control, bounded logs, TCP inspection, diagnostics and themes. Follow-up hardening covered fragmented UTF-8/ANSI, timely partial output, Git-root revalidation, error states and dialog focus.

Source `96e6c45` passed 53 automated tests and three desktop checks in Windows CI. The local unsigned ZIP was blocked by host policy; earlier native workflow evidence is recorded separately. See [QA](docs/QA.md) and [release evidence](docs/RELEASE.md) for exact scope and artifact identities. This is a historical preview milestone, not a claim of a published release or tag.
