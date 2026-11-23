# v0.2 preview build record

Version: **0.2.0 private preview**. Format: unsigned Windows x64 ZIP. **Final artifact validation is in progress; no release/tag or public distribution is claimed.** The old record is preserved in [RELEASE-v0.1](RELEASE-v0.1.md) and [local-build-96e6c45.json](evidence/local-build-96e6c45.json).

## Identity rules

Source commit, application ZIP hash, CI artifact-container digest, signing status and launch environment are distinct. A passing compiled Electron test does not establish that an unsigned EXE is allowed by a particular Windows policy. A CI package pass does not resolve a local SAC block.

The final commit/hash/checksums and Windows CI URL will be recorded here after validation. Do not distribute the preliminary ZIP as an official release. No protection was disabled, paid certificate obtained or history rewritten.

## Reproduce

Run locked install, types, lint, unit/integration/UI suites, then `npm run make -- --arch=x64` and `npm run test:e2e`. Keep runtime-native dependencies aligned. The ZIP lives under `out/make/zip/win32/x64/`; extract all contents, not only the EXE.

Verify LICENSE, LICENSES.chromium.html and resources/THIRD_PARTY_NOTICES.txt in the final package. Record the exact ZIP SHA-256, executable signature, OS/privileges, source commit and test result. A blocked launch remains FAIL for that artifact/environment.

Portable removal deletes the chosen ZIP/extracted app only. Imported repositories and separate Electron userData remain. Database deletion is a separate explicit user decision; schema v2 backups support recovery, not automatic downgrade.

## Publication gates

[Signing options](SIGNING_OPTIONS.md) and the [publication/privacy checklist](PUBLICATION_CHECKLIST.md) prepare future decisions. Human study, native display scaling, physical offline, historical commit-email privacy and a verified confidential reporting channel remain separate. Keep this repository private until the owner reviews a concrete publication packet.
