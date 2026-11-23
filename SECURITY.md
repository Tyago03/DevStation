# Security policy

DevStation is a development preview; the v0.2 cycle is in progress. No supported public binary release or complete acceptance has been declared. The recorded local unsigned v0.1 package is blocked by Smart App Control. Keep Windows protections enabled and check [QA](docs/QA.md) and [release evidence](docs/RELEASE.md) for the exact source/artifact status.

## Reporting a vulnerability

Do not disclose vulnerability details, tokens, private project paths, database files or raw task logs in public issues, pull requests or discussions.

The intended public intake is [GitHub private vulnerability reporting](https://github.com/Tyago03/DevStation/security/advisories/new), **once enabled and verified**. As of 2026-11-23 this repository remains private, and no public confidential intake or monitored security email is claimed. GitHub documents private vulnerability reporting for public repositories; the reporting channel remains an explicit [publication gate](docs/PUBLICATION_CHECKLIST.md). If the private report form is unavailable, do not post sensitive details elsewhere. The maintainer must establish and verify a confidential route as part of the publication plan. No response-time guarantee is currently offered.

When a verified private channel is available, include the affected commit/version, Windows version, expected versus observed behavior, impact and a minimal synthetic reproduction. Avoid personal or customer data. Do not run tests against unrelated projects, expose other users' data or terminate external processes to demonstrate a report. Coordinate disclosure privately before publishing technical details.

## Trust boundaries

The application can run an executable chosen by its user. That executable runs with the user's permissions; DevStation is not a sandbox for untrusted code. Do not use it to execute projects you do not trust.

Security boundaries, residual risks, and verification requirements are described in [docs/SECURITY.md](docs/SECURITY.md). The actual verification status is in [docs/QA.md](docs/QA.md).
