# Source-publication preparation

Reviewed: **2026-11-23**. Repository: **Tyago03/DevStation, private**. Baseline HEAD: `f9ee2e3a08753f0c941ee75f11b16916d3567622`; v0.2 work is on `codex/v0.2-guided-workspace`. Status: **preparation in progress; publication not approved**.

This checklist prepares a future source-only milestone. It does not authorize changing visibility, publishing binaries, rewriting history, buying signing services or modifying Windows protections. A green build does not resolve privacy, usability or distribution gates.

## Current audit and reproducibility

`python scripts/audit-publication.py` scans current tracked/nonignored files and text blobs reachable from all local refs. It saves only finding categories, relative locations, commit/blob IDs and redacted values in [publication-scan.json](evidence/publication-scan.json). It does not print matched secrets or read other repositories. Rerun it on the final proposed source commit; an in-progress tree is not a permanent clearance.

The baseline scan covers **five reachable commits and 116 unique historical blobs**. No configured secret pattern matched. This is a bounded heuristic result, not proof that no secret exists. Checks include private-key markers, common provider tokens, credential assignments/URLs, suspicious filenames, email addresses and user-home paths. Binary contents require separate review; ignored outputs, unreachable objects and reflogs are outside the scan.

Remote metadata listed only `main` at the baseline HEAD at review time, and GitHub recognizes the root license as **MIT**. The three Actions runs listed by GitHub were also reviewed using redacted token-pattern scans: successful jobs `137017251900` and `137003299131`, and failed job `137002255227`. No configured secret or email pattern matched; eight home-path occurrences in the failed run were hosted-runner/public profiles after ANSI normalization. Raw logs were not copied into the repository. See [Actions scan evidence](evidence/publication-actions-review.json). Recheck new runs, branches, tags, artifacts and PR/discussion content before publication.

### Finding requiring a privacy decision

Author and committer email metadata in all five baseline commits is **not a GitHub noreply address**. Values are deliberately `[REDACTED]`; the exact commit locations appear in the scan report. This is a publication review item, not evidence of a credential leak. The owner must decide whether that existing attribution may become public or whether a separately authorized history-remediation plan is needed. No history rewrite or credential rotation has been performed. The existing copyright name in LICENSE is intentional authorship attribution and remains unchanged.

If a real secret is discovered later, first coordinate revocation/rotation and impact review. Deleting it in a new commit does not remove it from history. Any destructive history remediation and force-push require a concrete, reviewed plan and authorization.

## Checklist

PASS applies only to the described scope. NOT RUN or OPEN means the gate still needs evidence or a decision.

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Repository stays private | PASS | GitHub repository metadata on 2026-11-23; no visibility mutation performed |
| Current and historical text scan | PASS, bounded | Five commits/116 historical blobs; zero configured secret candidates; repeat on final target |
| Commit-author privacy | OPEN | Non-noreply author/committer addresses in five commits; owner decision required before exposure |
| Binary screenshots/resources | PASS, reviewed baseline | Three screenshots and icon reviewed; synthetic projects, Public Documents fixture paths, no personal username/token visible. This is visual inspection, not steganography analysis |
| v0.2 screenshots | NOT RUN | Capture actual updated application using synthetic data, record source/runtime/hash and fixture preparation |
| Root license | PASS | One root LICENSE, MIT text and existing copyright preserved; package declares MIT; GitHub metadata reports SPDX MIT |
| Dependency notice inventory | PASS, installed source scope | Nine production package entries still match the recorded names/versions/licenses; complete installed notice texts occur in THIRD_PARTY_NOTICES.txt; [review snapshot](evidence/publication-dependency-review.json) |
| New package notices | NOT RUN | Check final ZIP includes third-party notices plus Electron LICENSE/LICENSES.chromium.html; do not transfer old artifact evidence |
| Dependency vulnerabilities | PASS, database snapshot only | `npm audit --json` on 2026-11-23 returned zero advisories across all severities. This is not a guarantee against undisclosed defects |
| Ignore rules | PASS, source review | Rules cover dependency/build/test outputs, .env, SQLite/databases, logs, loose ZIP/EXE/MSI files, PFX/P12/PEM/key material, dumps and Python caches. Keep local captures inside ignored output directories; explicitly review approved documentation screenshots |
| Actions permissions | PASS, source review | `contents: read`, pinned action commits, checkout credentials not persisted; no publish job or signing secrets configured |
| Actions output/privacy | PASS, recorded run scope | All three listed historical runs scanned; no token-pattern candidates. Upload paths restricted to build ZIPs and build evidence; synthetic test fixtures. New v0.2 runs/artifacts need their own review |
| Contributor documentation | PASS, preparation | CONTRIBUTING.md describes tests, safe fixtures, reporting and scope |
| Change history | PASS, preparation | CHANGELOG.md has an Unreleased v0.2 section; no new tag or public release asserted |
| Security contact | OPEN | No verified public confidential intake is active while private. SECURITY.md states the limitation and planned GitHub private-report route; verify/enable an approved channel before publication |
| Help and public documentation | IN PROGRESS | Documentation must open bundled help; recheck current README, examples and links after implementation |
| v0.2 technical acceptance | IN PROGRESS | Baseline evidence is preserved separately; final source tests, QA matrix and exact artifacts must be recorded by this cycle |
| Human usability study | NOT RUN | Protocol and blank P01-P05 sheets in USABILITY_STUDY.md; no results invented |
| Signing/distribution | OPEN | Research in SIGNING_OPTIONS.md; current local unsigned package remains blocked by SAC; source-only publication is a separate option |
| Owner public-visibility approval | NOT GIVEN | Final review and explicit authorization required before Private becomes Public |

## Final source-only review packet

Before requesting publication approval, prepare a concrete packet: proposed commit/tag, final source diff, current CI URL, license/notices review, current/historical privacy findings with decisions, verified reporting channel, screenshots, honest README/QA/release status and results of any human study. Review all public-facing links and GitHub history/Actions/artifact exposure. Explain any remaining gates instead of calling the whole v0.2 cycle complete.

For GitHub private vulnerability reporting, current official documentation describes availability on **public repositories**. The repository metadata confirms private visibility; it does not prove an intake form is enabled. No feature was toggled. After an authorized public transition, an owner must enable and test the intended report route, or establish another verified confidential route as part of the coordinated publication plan. Do not invent an email address or promise response times. [GitHub reporting configuration](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

Do not publish a Windows download as an official ready binary unless its exact signed/distributed bytes have their own approved validation record. Keep CI archive hashes, application ZIP hashes, source commits and signing status distinct. Source publication, release tagging, binary distribution and spending are separate decisions.
