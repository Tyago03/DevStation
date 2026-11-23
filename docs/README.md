# Documentation

Use the application's **Documentation** page for searchable offline help and the optional tour. This directory holds contributor guidance, implementation details and evidence.

Current target: **v0.2.1 pre-release candidate**. Twelve compiled desktop checks pass locally; the unsigned packaged EXE is blocked by local Windows signing policy. Main-branch CI, the confidential-reporting configuration and publication are pending. The [intended release page](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) is not yet claimed as published.

## Use and troubleshoot

- [Project overview, requirements and installation](../README.md)
- [Troubleshooting and local-data recovery](TROUBLESHOOTING.md)
- [Release and artifact identities](RELEASE.md)
- [Security reporting](../SECURITY.md)

## Understand and contribute

- [Contributing](../CONTRIBUTING.md)
- [Architecture](ARCHITECTURE.md)
- [Security boundaries](SECURITY.md)
- [Implementation decisions](DECISIONS.md)
- [Interface design](DESIGN.md)
- [Roadmap and briefing provenance](ROADMAP.md)
- [Changelog](../CHANGELOG.md)
- [Dependency licenses](THIRD_PARTY.md) and [full notices](THIRD_PARTY_NOTICES.txt)

## Check the evidence

- [Current QA](QA.md): executed scopes, limitations and remaining checks.
- [Build record](RELEASE.md): source, package hash, signing status and launch environment.
- [Publication checklist](PUBLICATION_CHECKLIST.md): source/privacy and release review.
- [Signing research](SIGNING_OPTIONS.md): researched options; no provider selected.
- [Human usability protocol](USABILITY_STUDY.md): participant records remain unfilled.
- [Evidence directory](evidence/): dated, bounded machine-readable results. File/source identities matter; historical results do not automatically apply to a new build.
- v0.2.1 captures: [workspace](screenshots/v0.2.1-welcome.png), [task outcomes](screenshots/v0.2.1-runs.png), [offline help](screenshots/v0.2.1-help.png) and [example workspace](screenshots/v0.2.1-demo.png). These are real compiled application captures with synthetic data, not packaged-launch evidence; provenance belongs in QA/evidence.

## Historical records

- [v0.1 archive](history/v0.1/README.md): original QA, release and roadmap records.
- [v0.2.0 QA](history/v0.2/QA.md) and [release record](history/v0.2/RELEASE.md): private guided-workspace milestone.

Historical policy blocks and pending checks are not current-release claims. Evidence and image files retain their existing locations so their identities remain traceable.
