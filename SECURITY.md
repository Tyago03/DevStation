# Security policy

DevStation v0.1.0 is a private functional preview. The final local unsigned binary is blocked by the host's Smart App Control policy; trusted distribution/signing and local launch verification remain open. No supported public release or full acceptance has been declared. Do not disable Windows protections to run a blocked build.

If you find a vulnerability, contact the repository owner through an existing private channel. If GitHub private vulnerability reporting is enabled for this repository, use **Security → Report a vulnerability**. Do not publish tokens, private project paths, database files, or raw task logs in an issue. A minimal synthetic reproduction, affected commit, Windows version, and expected versus observed behavior are useful.

The application can run an executable chosen by its user. That executable runs with the user's permissions; DevStation is not a sandbox for untrusted code. Do not use it to execute projects you do not trust.

Security boundaries, residual risks, and verification requirements are described in [docs/SECURITY.md](docs/SECURITY.md). The actual verification status is in [docs/QA.md](docs/QA.md).
