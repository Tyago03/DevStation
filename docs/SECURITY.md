# Security design

This is a design and review checklist, not a certification. Recorded results are in [QA.md](QA.md).

| Boundary | Required control | Residual risk / verification |
| --- | --- | --- |
| Untrusted text in renderer | React text rendering, restrictive CSP, no HTML injection | Test malicious names and output |
| Renderer → main | Isolated sandboxed renderer; narrow preload bridge; sender/frame check; Zod schemas | An allowed operation still needs service authorization |
| Project paths | Native selection, realpath identity, registered project ID, containment | Revalidate before launch; filesystem races cannot be eliminated by a UI check |
| Git inspection | Literal argv, time/output limits, optional locks off, fsmonitor disabled | Test hostile repository configuration and missing Git |
| User task | Selected `.exe`, explicit confirmation, structured argv, controlled environment | The executable can act with the user's permissions |
| Guided script | Native selection, canonical containment, bounded hash and revalidation | Only the selected file is fingerprinted; imports and simultaneous file replacement are not sandboxed |
| Script update review | Saved-script identity, bounded same-handle UTF-8 preview/hash, configuration-bound single-use token and default-Cancel native confirmation | Preview is the current file, not an old/new diff. Revalidate after confirmation; authorization must not execute the task |
| HTTP template | Fixed isolated Python module arguments and loopback binding | Files in the chosen folder are served to local software; only a trusted interpreter should be selected |
| Stop | In-memory run ownership and process handle | Windows child processes may survive; do not claim tree termination |
| Close | Stop results verified; uncertain runs retained; separate Quit anyway confirmation | Choosing to leave can intentionally leave owned tasks/children running |
| Logs | Bounded memory, text-only display, no automatic export | User programs can print sensitive values; local visibility does not redact them |
| SQLite | Parameterized queries, transactions, migration backups | Preserve corrupt/failed data for recovery; do not reset silently |
| External navigation | Fixed HTTPS help targets, unexpected navigation denied | Opening a browser is a deliberate user action |
| Distribution | Lockfile, Windows checks, artifact SHA-256, third-party notices | Unsigned binaries do not establish publisher identity |

## Electron review

Every application window must set `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`. Production renderer content must be local and must not require `unsafe-eval`. Preload must never expose `require`, `fs`, `child_process`, the raw `ipcRenderer`, or unrestricted `send`/`invoke` functions.

Validate the authorized WebContents, its top-level frame, and the expected local URL. Reject subframes and unexpected origins. Deny new windows, unrequested navigation, and unnecessary permission requests. Development's Vite URL must be matched exactly rather than accepting arbitrary localhost origins.

Production fuses must be reviewed alongside the test setup. `RunAsNode`, Node environment options, and CLI inspect arguments should not remain enabled just to accommodate a test harness. A packaged smoke test must still execute the hardened artifact.

## Process ownership

No IPC method accepts a PID to terminate. A run ID must resolve to a process created by this instance. Exited runs lose termination authority; persisted metadata must never recreate it. Closing or crashing does not grant a later session ownership of an old process.

Do not use `taskkill /F /T`, `shell: true`, generic `exec()`, or a fallback shell to make an unsupported task work. `.exe` validation does not make executable content safe. Windows termination may be abrupt and descendant handling is a documented limitation.

## Data policy

Do not inspect `.env`, credentials, SSH keys, or project source contents for features outside the requested scope. Do not print the full environment, PATH, tokens, or remote URLs. Git metadata and task logs may still contain user-provided text; keep them local and review any evidence before sharing it.

The guided-script feature reads only the explicitly selected in-project script, up to 10 MiB, to compute SHA-256. The native picker grants initial selection authority; renderer-supplied path/hash metadata alone does not authorize a new script selection.

In v0.2.1 an explicit review of an already saved script can return its current contents to the local renderer, limited to complete valid UTF-8 text of at most 256 KiB, without NUL bytes. The preview uses the same handle for reading and hashing, verifies file identity before/after the read and rechecks canonical containment. The source is neither uploaded nor stored in SQLite, and no previous source snapshot is retained. This is a change-detection and authorization flow, not a security audit of the script or its imports.

Review tokens expire after five minutes, are bound to a configuration snapshot, are single-use even on cancellation, and are held only in main-process memory. Confirmation defaults to Cancel. Path, file identity, fingerprint and configuration/arguments are checked again before saving; changed or expired reviews must be repeated. Saving the new fingerprint does not execute the task. A final filesystem race remains possible when an interpreter later opens the file.

Screenshots, tests, and CI artifacts use synthetic repositories only. Application databases, production logs, and user project files are excluded from version control. There are no analytics, cloud endpoints, automatic software installation, or automatic runs in P0.

## References

- [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Node child-process behavior](https://nodejs.org/api/child_process.html)
- [Git fsmonitor configuration](https://git-scm.com/docs/git-config)
- [Git background status refresh](https://git-scm.com/docs/git-status#_background_refresh)
