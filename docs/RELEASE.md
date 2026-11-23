# v0.2.1 pre-release record

Published **2026-11-23**: [DevStation v0.2.1 — Guided Workspace Preview](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1). The repository is Public and GitHub Private Vulnerability Reporting is enabled. This is an **unsigned development pre-release**.

## Source and build

- Tag/source: `v0.2.1` → `57e30026e3da69d90c022d586b8eeb0328c0ecfc`.
- [PR #1](https://github.com/Tyago03/DevStation/pull/1) merged the development branch without rewriting or deleting its commits.
- [Main CI 45248171830](https://github.com/Tyago03/DevStation/actions/runs/45248171830), job 137950375012: PASS. Windows Server 2025, Node 24.21.0, npm 11.19.0.
- TypeScript/ESLint, 50 unit + 48 integration + 45 UI tests, and 13 desktop cases passed. The actual application ZIP was extracted and launched; packaged SQLite persistence passed with external Node/Git absent from PATH.
- Publication documentation and a test-only ZIP-extraction time-budget adjustment followed the tagged build on main. The tagged application/runtime source and release assets are unchanged. [QA](QA.md) records the follow-up extraction failure and verification scope; later main checks remain visible in GitHub Actions.

## Published files

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| [DevStation-0.2.1-windows-x64.zip](https://github.com/Tyago03/DevStation/releases/download/v0.2.1/DevStation-0.2.1-windows-x64.zip) | 175,439,941 | `b826d48a45b32516466f95398806a029567ea6520f6088eb8621e48199bbe618` |
| [SHA256SUMS.txt](https://github.com/Tyago03/DevStation/releases/download/v0.2.1/SHA256SUMS.txt) | 100 | `803efd4ac4ecd3b79a3381758f86de446584539d93506244690af0487973a992` |
| [BUILD.txt](https://github.com/Tyago03/DevStation/releases/download/v0.2.1/BUILD.txt) | 1,735 | `96427e7ebc69d41094934cde34e6bf794931705c3ec7b0846d69a9200a7aa673` |

The application archive was renamed from `DevStation-win32-x64-0.2.1.zip` without changing its bytes. Its checksum matches the CI manifest and GitHub's uploaded-asset digest. The ZIP includes the original MIT notice at `resources/LICENSE`, project dependency notices, Electron LICENSE and Chromium notices. Source comparisons explicitly normalize Windows line endings.

The GitHub Actions **container** has a different identity: artifact 14855790588, 175,255,049 bytes, SHA-256 `95f4f99cb2e4585212402ae2c24c7cf0bd5c68aae3a9ab6af0370e2f06d518cb`. This is not the application checksum. Both were verified after download. [Machine-readable CI identity](evidence/v0.2.1-ci.json) and [anonymous publication verification](evidence/v0.2.1-publication.json).

## Install and verify

Download the ZIP and manifest from the release, compare SHA-256, extract the entire ZIP, then open `DevStation.exe`. Electron is included. Git inspection and project tasks need their respective installed programs. Keep Windows protections enabled and follow your machine's software policy. A checksum establishes integrity, not publisher identity.

The EXE is **NotSigned**, SHA-256 `da5d37e6ae7125968261f597ddb163d11f9055ae5423fa10bca9b492b24a37fd`. The release targets Windows 11 x64, but the exact shipped ZIP's packaged acceptance was established on the stated CI Windows Server image. Windows 10, native display scaling, physical offline and human usability remain unverified in their full scopes.

## Separate local candidate

Before the CI build, local source `98fe037` produced a different ZIP: 175,439,794 bytes, SHA-256 `e9285ed17e81aba3c44acd140c1f648633aaeae90a053d03d91297ef1e3405f6`. Its content audit passed, but Windows signing-level policy blocked its packaged EXE (Code Integrity 3033/3077). The local desktop run was 12 PASS / 1 FAIL. That ZIP is **not** the release attachment; no protection or trust exception was changed. CI success does not erase this observation.

[Current QA](QA.md), [local candidate identity](evidence/local-build.json), [local content audit](evidence/v0.2.1-package-audit.json), [final application audit](evidence/v0.2.1-release-application-audit.json), [final external audit](evidence/v0.2.1-release-external-audit.json) and [source/privacy audit](evidence/v0.2.1-publication-audit.json) preserve their individual scopes. Historical records remain in [v0.2.0](history/v0.2/RELEASE.md) and [v0.1](history/v0.1/RELEASE.md).
