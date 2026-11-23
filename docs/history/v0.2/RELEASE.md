# v0.2 preview build record

Version: **0.2.0 private preview**, built and checked on **2026-11-23**. The unsigned Windows x64 package passes local packaged-launch and native workflow checks. No public release, tag or signing is claimed. Historical v0.1 records remain in [RELEASE-v0.1](../v0.1/RELEASE.md) and [local-build-96e6c45.json](../../evidence/local-build-96e6c45.json).

## Exact local artifact

| Field | Value |
| --- | --- |
| Application source | `3092f81a37b575296e9e7afdef8d6e990cfe49c6` |
| Branch | `codex/v0.2-guided-workspace` |
| ZIP | `out/make/zip/win32/x64/DevStation-win32-x64-0.2.0.zip` |
| Size | 175,781,625 bytes |
| SHA-256 | `2e38b79ae2e5aa59d78bdd77370cc716db67cdfb71617c4ce3f7bad013e0a882` |
| Downloads copy | `DevStation-0.2.0-3092f81-windows-x64.zip`, identical hash |
| ZIP modified UTC | 2026-11-23T18:02:23.9794879Z |
| EXE SHA-256 | `571d8dd217575915ba6312566a741c8ee94181ff69322693bd4205fe94dcfa6c` |
| Authenticode | NotSigned |
| Local environment | Windows 11 Pro 10.0.26300, unelevated |
| Local result | 98 automated tests and all 11 desktop tests PASS; real native workflow also PASS |

The EXE inside the ZIP matches the locally exercised packaged EXE byte-for-byte. The native procedure used actual Windows folder/program/script pickers and confirmation dialogs, a synthetic loopback server, actual output/port inspection, Stop and persistence across restart. [Native observations](../../evidence/v0.2-native-review.json) describe exactly what ran. Final test details and remaining gaps are in [QA](QA.md); machine-readable identity is in [local-build-3092f81.json](../../evidence/local-build-3092f81.json).

The old v0.1 SAC block remains true for that historical artifact/environment. The current v0.2 EXE opened locally without changing protections. The reason for differing acceptance was not established; this does not guarantee acceptance on another machine.

## Windows CI

[Run 45233998754](https://github.com/Tyago03/DevStation/actions/runs/45233998754), job 137900734248, passed on the same application source: locked install, types, lint, 42 unit + 28 integration + 28 UI tests, ZIP build and 11 desktop checks. The latter mix ten compiled Electron tests with one hardened packaged-executable test. Job duration: 302 seconds; desktop runner: 1.6 minutes (98-second workflow step).

Private artifact ID **14848631749**, size **175,456,916 bytes**, expires **2026-12-07T18:06:46Z**. Its **GitHub container** SHA-256 is `c74389937115d191ed1b728624c7a86df7cf31d8e08a61c0d645e47f08accedb`. This is neither the local ZIP checksum nor a verified checksum for the nested CI application ZIP. This review read metadata/logs without downloading that container. See [CI evidence](../../evidence/v0.2-ci.json).

Later documentation-only commits record these results; they do not change the application source identified above.

## Reproduce and package contents

Run locked install, types, lint, unit/integration/UI suites, then `npm run make -- --arch=x64` and `npm run test:e2e`. Keep runtime-native dependencies aligned. Extract the entire ZIP before opening DevStation.exe; Electron supplies its runtime, while project tasks need their selected installed program.

The final ZIP was opened and checked directly. It contains Electron's root LICENSE and LICENSES.chromium.html, plus resources/THIRD_PARTY_NOTICES.txt and the original DevStation MIT license at resources/LICENSE. The latter matches the repository license SHA-256 `e22cd6a6268df899c3089f6c983cb4bb3682248a5b1993b480054a26bec4c62f`. Individual entry hashes are recorded in local-build-3092f81.json.

Portable removal deletes the chosen ZIP/extracted app only. Imported repositories and separate Electron userData remain. Database deletion is a separate explicit decision; schema v2 backups support recovery, not automatic downgrade.

## Open acceptance and publication gates

[Signing options](../../SIGNING_OPTIONS.md) and the [publication/privacy checklist](../../PUBLICATION_CHECKLIST.md) prepare future decisions. Human study, Windows 10, native display scaling, physical offline, trusted signing/distribution, historical commit-email privacy and a verified confidential reporting channel remain separate. The repository stays private. No protection was disabled, paid certificate obtained, participant contacted or Git history rewritten.
