# v0.2.1 pre-release record

The intended release is **v0.2.1**, an unsigned portable Windows x64 ZIP. Publication and final-main validation are in progress. No stable release is claimed.

## Current local candidate

| Field | Value |
| --- | --- |
| Packaged source | `98fe037b174cd6cf7b255ee451a38404b4be58ed` |
| ZIP | `DevStation-win32-x64-0.2.1.zip` |
| Size | 175,439,794 bytes |
| SHA-256 | `e9285ed17e81aba3c44acd140c1f648633aaeae90a053d03d91297ef1e3405f6` |
| Signature | NotSigned |
| Content audit | PASS; caches/private build metadata absent; MIT and dependency notices verified |
| Local EXE startup | FAIL; Windows signing-level policy blocked execution |
| Compiled desktop suite | 12 PASS; genuine packaged case failed locally |
| Windows CI / main | Pending final verification |

This candidate is not automatically the release attachment. The final release must identify its exact source, ZIP bytes, SHA-256, build environment and packaged test result. CI artifact-container hashes and nested application ZIP hashes are different.

[QA](QA.md), [package audit](evidence/v0.2.1-package-audit.json) and [source/privacy audit](evidence/v0.2.1-publication-audit.json) describe the executed scopes. Historical records remain in [v0.2.0](history/v0.2/RELEASE.md) and [v0.1](history/v0.1/RELEASE.md).

## Release procedure

1. Merge the reviewed branch without rewriting its commits; verify CI on main.
2. Audit the exact Windows artifact, including original MIT at resources/LICENSE, Electron LICENSE, Chromium notices and resources/THIRD_PARTY_NOTICES.txt.
3. Record the source, build and SHA-256 in the release and an accompanying manifest.
4. Confirm public visibility and confidential vulnerability reporting after the privacy checks.
5. Publish the verified ZIP as **Pre-release**, describing unsigned status and the observed local block. Do not claim universal Windows acceptance.

Extract the entire application ZIP, then open DevStation.exe. Electron is included; Git inspection and project tasks need their respective installed programs. Keep Windows protections enabled.

## Limits

The local block is real even if a GitHub Windows runner accepts another build. No paid signing, trust exception or policy change has been performed. Windows 10, real display scaling, physical offline and human usability remain unverified. These limits are compatible with an explicitly labeled development pre-release, not a claim of stable general distribution.
