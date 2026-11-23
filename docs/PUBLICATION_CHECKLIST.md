# Publication and pre-release checklist

Reviewed: **2026-11-23**. Target: **v0.2.1 pre-release**, Windows x64 ZIP and open-source repository. The owner explicitly authorized merging to main, changing visibility to Public and publishing this release **after satisfactory security/privacy and final validation**. No additional general publication approval is missing. History rewriting, signing purchases and changes to Windows protections are not authorized.

Current status: **12 local compiled desktop checks PASS; actual packaged EXE blocked by local Windows signing policy; main CI and publication pending**. The v0.2.0 private milestone remains historical evidence. The [intended v0.2.1 pre-release](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) is not claimed as published. [Current QA](QA.md) · [Release record](RELEASE.md) · [Documentation index](README.md)

## Initial privacy and security review

The read-only scan at source `706fc9b` covered eight reachable commits, 208 unique historical blobs and 127 tracked/nonignored current files. It found **zero configured secret-pattern candidates**. Eight content-email occurrences are synthetic test addresses; the shared Public fixture path in `v0.2-native-review.json` appears in current/history scope. No tracked EXE, ZIP, database, private log or key file was found. This is bounded pattern review, not a guarantee that no secret exists.

The one non-noreply address used by author/committer metadata was compared in memory with anonymously accessible GitHub commit metadata. An exact existing public match was confirmed; the address itself is not copied into evidence. It is already-public authorship attribution, not an unresolved exclusively private fact or credential. The prior email review gate is therefore resolved without rewriting history. [Redacted audit and public comparison source](evidence/v0.2.1-publication-audit.json).

At the initial audit, eight historical binary blobs corresponded to two icon files and six screenshots. Those captures and the PNG logo were inspected; PNG text/EXIF metadata chunks and trailing data were absent. Four newer v0.2.1 captures—workspace, Runs, Help and demo—were also visually reviewed: synthetic data and no visible personal path or credential. They show the compiled application, not a successful packaged-EXE launch. This is not steganography analysis.

Subsequent inspection of generated packages found development-cache and SQLite gyp/MSBuild files containing build-machine paths. Packaging fixes exclude the caches and strip non-runtime intermediates from the staged copy. The earlier zero-candidate source/log scans did not cover that generated content. Final exact-archive clearance is a separate gate recorded in [QA](QA.md), [RELEASE](RELEASE.md) and the audit evidence; no older CI archive is assumed clean from its log scan alone.

The root MIT license remains unchanged. Nine production dependency entries match the recorded inventory. `npm audit --json` returned zero known advisories across all severities on this review date; the final package must still include and verify its own original MIT, Electron, Chromium and dependency notices.

Initial Electron/privileged-source inspection confirmed isolation, sandbox/CSP, narrow typed IPC with sender/schema checks, native-selection authority, path/fingerprint validation, explicit confirmations, session ownership, hardened production fuses and read-only CI permissions. Independent read-only review of the new v0.2.1 review/outcome flow found no actionable blocker. The 12 local compiled desktop checks pass; exact automated-suite counts and remaining package/CI results belong to QA. Neither inspection nor an audit database certifies absence of defects.

## Release gates

PASS is limited to the stated scope. PENDING means final evidence or the actual operation is still required.

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Owner authorization | GIVEN, conditional | Explicit request covers public visibility, main integration and v0.2.1 pre-release after satisfactory checks |
| Initial current/history privacy scan | PASS, bounded | Source 706fc9b, eight commits/208 blobs/127 files; zero secret candidates; generated-package findings are recorded separately |
| Author/committer email classification | RESOLVED | Exact address already appears in public GitHub commit metadata; retain attribution and history |
| Final current/history scan | PENDING | Run `python scripts/audit-publication.py` after final source/docs changes and classify every candidate without exposing values |
| Existing screenshots/icons | PASS, reviewed scope | Synthetic screenshots; no personal data visible; PNG metadata review recorded |
| v0.2.1 screenshots | PASS, visual scope | Four actual compiled captures with synthetic data reviewed; source/runtime/hash belong to the screenshot evidence. Not packaged-launch proof |
| Root license | PASS | Original MIT text/name preserved; one root LICENSE |
| Dependency inventory/audit | PASS, review snapshot | Recorded names/versions/licenses unchanged; zero known npm advisories at review; recheck dependency changes |
| Final package notices | PENDING | Verify original MIT resources/LICENSE matches root; retain Electron LICENSE, Chromium and third-party notices in exact ZIP |
| Privileged changes and regressions | PASS reviewed/compiled scope | Independent source review found no actionable blocker; compiled workflows verify separate authorization/Start and evidence-based outcomes. Full test evidence belongs to QA |
| Local compiled desktop checks | PASS | 12 checks; actual static/unit/integration/UI counts are recorded separately in QA |
| Exact packaged native workflow | BLOCKED LOCALLY | Current unsigned EXE is rejected by Windows signing policy; compiled tests/screenshots do not override this result |
| Final archive privacy and package checks | PENDING final record | Verify exact rebuilt ZIP/ASAR after the cache/intermediate fixes, including packaged runtime/notices; source/log scans alone are insufficient |
| Main integration and CI | PENDING | Preserve development commits, preferably merge by PR, and verify CI for final main |
| CI permissions and output | PASS existing design; final output pending | contents:read, pinned actions, checkout credentials not persisted; scan new logs and inspect intended uploads |
| Confidential reporting | PENDING | Enable and verify GitHub Private Vulnerability Reporting as part of the authorized public transition; update SECURITY.md only after confirmation |
| Public visibility | AUTHORIZED; NOT YET VERIFIED | Change only after final checks are satisfactory; record actual repository state |
| GitHub pre-release and assets | AUTHORIZED; NOT YET VERIFIED | Tag/version/source, unsigned Windows ZIP, SHA-256 manifest, requirements and limits must match tested bytes |
| Human usability / Windows 10 / display scaling / physical offline | NOT RUN in complete scopes | Disclose in QA and pre-release limits; do not imply agent/Chromium checks replace these observations |
| Trusted code signing | NOT PERFORMED | Keep unsigned status explicit; no paid enrollment or policy bypass |

## Final review packet

Retain the final source/main commit, CI URL, exact local and uploaded artifact hashes, license/notices checks, redacted privacy classifications, screenshot provenance, confidential-reporting verification and release URL. Review intended public Actions/artifact exposure. A CI artifact-container digest is not the application ZIP checksum.

The intended release will be marked **Pre-release**, not stable or fully validated for every environment. The current local package is blocked by signing policy; successful compiled checks or another machine's launch cannot erase that observation. Keep source/runtime evidence, simulated conditions and native observations distinct.

If a new confidential finding appears, stop only publication, explain the affected file/commit without revealing its value, and propose a concrete remedy. Do not silently rewrite history, force-push, rotate credentials or weaken protections. Already-public authorship metadata does not by itself require destructive remediation.

GitHub documents Private Vulnerability Reporting for public repositories. Root will verify the configured state during the coordinated public transition before claiming availability in SECURITY.md. Do not invent a security email or response-time promise. [Official configuration guidance](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
