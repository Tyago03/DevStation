# Source-publication preparation

Reviewed: **2026-11-23**. Repository: **Tyago03/DevStation, private**. Validated v0.2 source: `3092f81a37b575296e9e7afdef8d6e990cfe49c6` on `codex/v0.2-guided-workspace`. Status: **private technical milestone validated; full acceptance and publication remain open**.

This checklist prepares a future source-only milestone. It does not authorize changing visibility, publishing binaries, rewriting history, buying signing services or modifying Windows protections. A green build does not resolve privacy, usability or distribution gates.

## Current audit and reproducibility

`python scripts/audit-publication.py` scans current tracked/nonignored files and text blobs reachable from all local refs. It saves only finding categories, relative locations, commit/blob IDs and redacted values in [publication-scan.json](evidence/publication-scan.json). It does not print matched secrets or read other repositories. Rerun it on the final proposed source commit; an in-progress tree is not a permanent clearance.

The latest scan's source identity and coverage counts are recorded in [publication-scan.json](evidence/publication-scan.json). No configured secret pattern matched in the recorded scan. This is a bounded heuristic result, not proof that no secret exists. Checks include private-key markers, common provider tokens, credential assignments/URLs, suspicious filenames, email addresses and user-home paths. Binary contents require separate review; ignored outputs, unreachable objects and reflogs are outside the scan. Rerun after the final documentation changes and before any publication decision.

GitHub recognizes the root license as **MIT**. Three historical Actions runs were reviewed using redacted token-pattern scans: successful jobs `137017251900` and `137003299131`, and failed job `137002255227`. No configured secret or email pattern matched; eight home-path occurrences in the failed run were hosted-runner/public profiles after ANSI normalization. See [historical Actions scan evidence](evidence/publication-actions-review.json).

The current private-branch [CI run 45233998754](https://github.com/Tyago03/DevStation/actions/runs/45233998754) independently confirms the validated source, **98 unit/integration/UI tests and 11 desktop checks passed**. Its complete job log contained 40,392 characters; the configured credential, email and home-path patterns returned zero candidates. Raw logs were not copied into the repository. [Current CI evidence](evidence/v0.2-ci.json) records durations and private artifact metadata. The CI artifact digest identifies its container, not the local application ZIP. Recheck new runs, branches, tags, artifacts and PR/discussion content before publication.

### Finding requiring a privacy decision

Author and committer email metadata in the reviewed history, including the validated source commit, is **not a GitHub noreply address**. Values are deliberately `[REDACTED]`; the exact commit locations appear in the scan report. This is a publication review item, not evidence of a credential leak. The owner must decide whether that existing attribution may become public or whether a separately authorized history-remediation plan is needed. No history rewrite or credential rotation has been performed. The existing copyright name in LICENSE is intentional authorship attribution and remains unchanged.

If a real secret is discovered later, first coordinate revocation/rotation and impact review. Deleting it in a new commit does not remove it from history. Any destructive history remediation and force-push require a concrete, reviewed plan and authorization.

## Checklist

PASS applies only to the described scope. NOT RUN or OPEN means the gate still needs evidence or a decision.

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| Repository stays private | PASS | GitHub repository metadata on 2026-11-23; no visibility mutation performed |
| Current and historical text scan | PASS, bounded | Source identity, coverage and zero configured secret candidates in publication-scan.json; repeat on final target |
| Commit-author privacy | OPEN | Non-noreply author/committer addresses remain in reviewed history; owner decision required before exposure |
| Binary screenshots/resources | PASS, reviewed baseline | Three screenshots and icon reviewed; synthetic projects, Public Documents fixture paths, no personal username/token visible. This is visual inspection, not steganography analysis |
| v0.2 screenshots | PASS, visual/privacy review | Actual compiled v0.2 welcome/help/demo captures use synthetic data and were visually checked without personal data visible. [Screenshot identities and preparation](evidence/v0.2-screenshots.json). These are not packaged-EXE acceptance evidence |
| Root license | PASS | One root LICENSE, MIT text and existing copyright preserved; package declares MIT; GitHub metadata reports SPDX MIT |
| Dependency notice inventory | PASS, installed source scope | Nine production package entries still match the recorded names/versions/licenses; complete installed notice texts occur in THIRD_PARTY_NOTICES.txt; [review snapshot](evidence/publication-dependency-review.json) |
| New package notices | PASS, final local package | Original MIT resources/LICENSE matches the root LICENSE exactly; Electron LICENSE, LICENSES.chromium.html and resources/THIRD_PARTY_NOTICES.txt are present. Exact local ZIP identity is recorded in RELEASE |
| Dependency vulnerabilities | PASS, database snapshot only | `npm audit --json` on 2026-11-23 returned zero advisories across all severities. This is not a guarantee against undisclosed defects |
| Ignore rules | PASS, source review | Rules cover dependency/build/test outputs, .env, SQLite/databases, logs, loose ZIP/EXE/MSI files, PFX/P12/PEM/key material, dumps and Python caches. Keep local captures inside ignored output directories; explicitly review approved documentation screenshots |
| Actions permissions | PASS, source review | `contents: read`, pinned action commits, checkout credentials not persisted; no publish job or signing secrets configured |
| Actions output/privacy | PASS, recorded run scope | Three historical jobs plus current job 137900734248 scanned with no credential candidates. Upload paths are build ZIPs/evidence; current artifact metadata reviewed, contents not downloaded by the log reviewer. Review subsequent output separately |
| Contributor documentation | PASS, preparation | CONTRIBUTING.md describes tests, safe fixtures, reporting and scope |
| Change history | PASS, preparation | CHANGELOG.md has an Unreleased v0.2 section; no new tag or public release asserted |
| Security contact | OPEN | No verified public confidential intake is active while private. SECURITY.md states the limitation and planned GitHub private-report route; verify/enable an approved channel before publication |
| Help and public documentation | PASS behavior; final editorial review open | Bundled searchable help, optional tour and demo passed compiled desktop checks, including Chromium offline simulation. Recheck final README, examples and links before publication |
| v0.2 private technical milestone | PASS, stated scopes | Source 3092f81: local 98 tests/11 E2E and matching CI passed. Actual unsigned package passed native pickers, Save-without-start, confirmed Start/logs/loopback Ports/Stop, close/reopen persistence and final exit. Full native keyboard, Windows DPI, physical offline and usability remain separate |
| Human usability study | NOT RUN | Protocol and blank P01-P05 sheets in USABILITY_STUDY.md; no results invented |
| Signing/distribution | OPEN | Current unsigned v0.2 package launches and completes the recorded native workflow locally. Earlier SAC failures concern v0.1 only. Trusted signing, broader Windows validation and distribution approval remain open; see SIGNING_OPTIONS.md |
| Owner public-visibility approval | NOT GIVEN | Final review and explicit authorization required before Private becomes Public |

## Final source-only review packet

Before requesting publication approval, prepare a concrete packet: proposed commit/tag, final source diff, current CI URL, license/notices review, current/historical privacy findings with decisions, verified reporting channel, screenshots, honest README/QA/release status and results of any human study. Review all public-facing links and GitHub history/Actions/artifact exposure. Explain any remaining gates instead of calling the whole v0.2 cycle complete.

For GitHub private vulnerability reporting, current official documentation describes availability on **public repositories**. The repository metadata confirms private visibility; it does not prove an intake form is enabled. No feature was toggled. After an authorized public transition, an owner must enable and test the intended report route, or establish another verified confidential route as part of the coordinated publication plan. Do not invent an email address or promise response times. [GitHub reporting configuration](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

Do not publish a Windows download as an official ready binary unless its exact signed/distributed bytes have their own approved validation record. Keep CI archive hashes, application ZIP hashes, source commits and signing status distinct. Source publication, release tagging, binary distribution and spending are separate decisions.
