# Publication and pre-release checklist

Reviewed: **2026-11-23**. Target: **v0.2.1 pre-release**, Windows x64 ZIP and open-source repository. The owner explicitly authorized merging to main, changing visibility to Public and publishing this release **after satisfactory security/privacy and final validation**. No additional general publication approval is missing. History rewriting, signing purchases and changes to Windows protections are not authorized.

Current status: **repository public, v0.2.1 Pre-release published, Private Vulnerability Reporting enabled and verified**. [Main CI](https://github.com/Tyago03/DevStation/actions/runs/45248171830) passes 143 automated and 13 desktop checks on Windows Server 2025, including the exact release ZIP. Windows 11 has 12 passing compiled checks and a policy-blocked separate local candidate. [Published release](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) · [QA](QA.md) · [Build record](RELEASE.md)

## Initial privacy and security review

The read-only scan at source `706fc9b` covered eight reachable commits, 208 unique historical blobs and 127 tracked/nonignored current files. It found **zero configured secret-pattern candidates**. Eight content-email occurrences are synthetic test addresses; the shared Public fixture path in `v0.2-native-review.json` appears in current/history scope. No tracked EXE, ZIP, database, private log or key file was found. This is bounded pattern review, not a guarantee that no secret exists.

The one non-noreply address used by author/committer metadata was compared in memory with anonymously accessible GitHub commit metadata. An exact existing public match was confirmed; the address itself is not copied into evidence. It is already-public authorship attribution, not an unresolved exclusively private fact or credential. The prior email review gate is therefore resolved without rewriting history. [Redacted audit and public comparison source](evidence/v0.2.1-publication-audit.json).

At the initial audit, eight historical binary blobs corresponded to two icon files and six screenshots. Those captures and the PNG logo were inspected; PNG text/EXIF metadata chunks and trailing data were absent. Four newer v0.2.1 captures—workspace, Runs, Help and demo—were also visually reviewed: synthetic data and no visible personal path or credential. They show the compiled application, not a successful packaged-EXE launch. This is not steganography analysis.

Subsequent inspection of preliminary generated packages found development-cache and SQLite gyp/MSBuild files containing build-machine paths. Packaging fixes exclude the caches and strip non-runtime intermediates from the staged copy. The exact published ZIP passed both [application-archive audit](evidence/v0.2.1-release-application-audit.json) and [external-file audit](evidence/v0.2.1-release-external-audit.json). One generic upstream Unix reference was classified as non-private. Earlier zero-candidate source/log scans did not cover generated content; no older CI archive is assumed clean from its log scan alone.

The root MIT license remains unchanged. Nine production dependency entries match the recorded inventory. `npm audit --json` returned zero known advisories across all severities on this review date. The exact published ZIP includes verified original MIT, Electron, Chromium and dependency notices.

Initial Electron/privileged-source inspection confirmed isolation, sandbox/CSP, narrow typed IPC with sender/schema checks, native-selection authority, path/fingerprint validation, explicit confirmations, session ownership, hardened production fuses and read-only CI permissions. Independent read-only review of the new v0.2.1 review/outcome flow found no actionable blocker. The 12 local compiled desktop checks pass; main CI passes 143 automated tests and 13 desktop checks, including the exact release ZIP. QA records the separate environments and artifacts. Neither inspection nor an audit database certifies absence of defects.

## Release gates

PASS is limited to the stated source, artifact and environment. Historical failures and NOT RUN conditions remain explicit.

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Owner authorization | GIVEN, conditional | Explicit request covers public visibility, main integration and v0.2.1 pre-release after satisfactory checks |
| Initial current/history privacy scan | PASS, bounded | Source 706fc9b, eight commits/208 blobs/127 files; zero secret candidates; generated-package findings are recorded separately |
| Author/committer email classification | RESOLVED | Exact address already appears in public GitHub commit metadata; retain attribution and history |
| Current/history scan and classifications | PASS, bounded | Recorded scans and review found no unresolved publication blocker; re-scan later source/docs changes without exposing matched values |
| Existing screenshots/icons | PASS, reviewed scope | Synthetic screenshots; no personal data visible; PNG metadata review recorded |
| v0.2.1 screenshots | PASS, visual scope | Four actual compiled captures with synthetic data reviewed; source/runtime/hash belong to the screenshot evidence. Not packaged-launch proof |
| Root license | PASS | Original MIT text/name preserved; one root LICENSE |
| Dependency inventory/audit | PASS, review snapshot | Recorded names/versions/licenses unchanged; zero known npm advisories at review; recheck dependency changes |
| Final package notices | PASS, exact released ZIP | Original MIT resources/LICENSE verified against root; Electron LICENSE, Chromium and third-party notices retained and audited |
| Privileged changes and regressions | PASS reviewed/compiled scope | Independent source review found no actionable blocker; compiled workflows verify separate authorization/Start and evidence-based outcomes. Full test evidence belongs to QA |
| Local compiled desktop checks | PASS | 12 checks on Windows 11; no claim that this overrides a signing-policy block |
| Separately built local candidate | BLOCKED LOCALLY | Windows signing policy rejected these local bytes; this is not a failure observation about the different CI release ZIP |
| Exact released ZIP packaged checks | PASS, Windows Server 2025 CI | CI extracted and launched the actual ZIP later attached to the release; general Windows 11 binary compatibility remains unvalidated |
| Final archive privacy | PASS, exact released ZIP | Inner application and outer archive files audited after cache/intermediate fixes; audit reports linked above |
| Main integration and CI | PASS | PR #1 merged with history preserved; commit/tag `57e30026e3da69d90c022d586b8eeb0328c0ecfc`; CI 45248171830: 50 unit + 48 integration + 45 UI = 143, plus 13 desktop checks PASS |
| CI permissions and output | PASS recorded scope | contents:read, pinned actions, checkout credentials not persisted; release artifact audit and upload identities recorded |
| Confidential reporting | ENABLED / VERIFIED | GitHub API confirms Private Vulnerability Reporting enabled; SECURITY.md links the private report route |
| Public visibility | PUBLIC / VERIFIED | GitHub API confirms the repository is public |
| GitHub pre-release and assets | PUBLISHED / VERIFIED | Release 455903375, draft=false, prerelease=true; exact ZIP, BUILD.txt and SHA256SUMS.txt uploaded with matching server digests |
| Human usability / Windows 10 / display scaling / physical offline | NOT RUN in complete scopes | Disclose in QA and pre-release limits; do not imply agent/Chromium checks replace these observations |
| Trusted code signing | NOT PERFORMED | Keep unsigned status explicit; no paid enrollment or policy bypass |

## Final review packet

Retain the final source/main commit, CI URL, exact local and uploaded artifact hashes, license/notices checks, redacted privacy classifications, screenshot provenance, confidential-reporting verification and release URL. Review intended public Actions/artifact exposure. A CI artifact-container digest is not the application ZIP checksum.

The published release is marked **Pre-release**, not stable or fully validated for every environment. Its tag points to tested main merge commit `57e30026e3da69d90c022d586b8eeb0328c0ecfc`. The ZIP `DevStation-0.2.1-windows-x64.zip` is 175,439,941 bytes, SHA-256 `b826d48a45b32516466f95398806a029567ea6520f6088eb8621e48199bbe618`; the uploaded server digest matches. A separate local candidate remains policy-blocked. Keep each artifact/environment result distinct.

If a new confidential finding appears, stop only publication, explain the affected file/commit without revealing its value, and propose a concrete remedy. Do not silently rewrite history, force-push, rotate credentials or weaken protections. Already-public authorship metadata does not by itself require destructive remediation.

GitHub Private Vulnerability Reporting was enabled and verified during the public transition. [SECURITY.md](../SECURITY.md) links the confidential report form without inventing an email address or response-time promise. [Official configuration guidance](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
