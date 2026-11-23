# Security policy

DevStation is pre-release desktop software. [v0.2.1](https://github.com/Tyago03/DevStation/releases/tag/v0.2.1) is publicly available as a Pre-release. Consult its [validation record](docs/QA.md) and [artifact identity](docs/RELEASE.md). No long-term support or response-time guarantee is currently offered.

## Report a vulnerability privately

Use [GitHub: Report a vulnerability](https://github.com/Tyago03/DevStation/security/advisories/new). **Private Vulnerability Reporting is enabled and its configuration was verified on 2026-11-23.** If the private form is temporarily unavailable, do not publish sensitive details in issues, pull requests or discussions.

Include:

- Affected version or commit and Windows version.
- Expected behavior, observed behavior and security impact.
- Minimal reproduction steps using synthetic files and projects.
- Any relevant mitigation, without private credentials or customer data.

Do not attach personal databases, real project contents, environment files or raw private task logs. Test only systems and fixtures you are authorized to use, and coordinate disclosure privately before publishing technical details.

## Trust model

DevStation runs programs chosen by its user with that user's Windows permissions. It is not a sandbox for untrusted code. Review projects and executables before starting a task.

Guided-script checks detect changes to the selected file and require a separate authorization before an updated version can be saved. They do not audit imports, eliminate every filesystem race or make the selected code safe. Save and authorization do not execute the script.

Stop is limited to the process owned by the current session; descendants may remain. Unknown status is not evidence of termination. Restarting the app does not restore authority over old processes.

The published Windows ZIP is unsigned. It passed packaged checks on Windows Server 2025 CI. A separately built Windows 11 candidate was blocked by local signing policy, while 12 compiled desktop checks passed there. Verify the release SHA-256 and follow your machine's software policy. Keep Windows protections enabled; neither a successful test nor a checksum establishes publisher trust or general Windows 11 binary compatibility.

See the [security design](docs/SECURITY.md) for Electron, IPC, path, process and storage boundaries. [QA](docs/QA.md) states what was actually exercised and what remains untested.
