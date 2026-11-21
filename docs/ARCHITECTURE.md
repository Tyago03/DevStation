# Architecture

The implementation targets Windows x64 first. This document describes the intended v0.1 structure; test outcomes belong in [QA.md](QA.md).

## Boundaries

```text
React renderer
  └─ window.devstation: specific typed operations
       └─ isolated preload / contextBridge
            └─ main-process IPC validation
                 ├─ projects and canonical paths
                 ├─ Git inspection
                 ├─ managed processes and bounded logs
                 ├─ local tool diagnostics
                 ├─ TCP listener inspection
                 └─ SQLite repositories / migrations
```

The renderer displays data and submits user actions. It has no Node, filesystem, SQLite, or child-process access. The preload exposes named operations, not a generic channel or command API. Main-process handlers validate the sending top-level frame and parse every input before invoking services. Results use a serializable `{ ok, data }` or `{ ok: false, error }` shape.

The application loads bundled local renderer assets. Unexpected navigation and new windows are denied. External help links are explicit user actions with a fixed HTTPS destination allowlist.

## Persistence

SQLite stores projects, saved configurations, settings, and schema migration metadata under `app.getPath('userData')`. Imported repositories receive no DevStation files. Project identity is based on a canonical absolute path with Windows-aware duplicate handling. Removing a registration never deletes repository files.

Use parameterized SQL, foreign keys, transactions, and a backup before a schema migration. A database error must preserve existing data and give recovery guidance. A failed migration must not silently replace the database. Runtime handles and output buffers are memory-only; a restart must not claim ownership of old PIDs.

## Git and system tools

Git uses an absolute discovered executable and structured arguments with `shell: false`. Inspection resolves the working-tree root, handles unborn and detached HEAD states, and parses NUL-delimited porcelain status. Disable optional index writes and fsmonitor hooks for these invocations. No network Git commands or mutable operations belong in P0.

Diagnostics run fixed version queries with timeouts. `npm.cmd` cannot be treated as an ordinary executable on Windows; a diagnostic without a safe verified implementation should report **Not checked**. TCP inspection runs Windows `netstat.exe` with literal arguments and parses listening endpoints. It does not probe the network or change firewall settings.

## Runs

A configuration contains a label, selected `.exe`, `args: string[]`, and a canonical existing directory inside the registered project. Validate both when saving and immediately before starting. Saving a configuration never starts it.

Start and Stop are explicit confirmed actions. Child processes use `shell: false`, hidden console windows, separate stdout/stderr streams, and a controlled environment. Each run has a random internal ID and an in-memory process handle. Stop never accepts an arbitrary PID. A main-process exit is not proof that every descendant exited.

Logs are text, not HTML. ANSI/control sequences are sanitized and storage is bounded. The frontend receives only serialized log entries; subscriptions must be disposed when their view closes. Concurrency limits protect against accidental process storms. Closing with active runs requires a decision that explains the limits of termination.

## Build and validation

Electron Forge builds main, preload, and renderer with Vite and makes an unsigned Windows ZIP. `better-sqlite3` is rebuilt for Electron and unpacked from ASAR as needed. Native-module success in Node tests does not establish success in the packaged Electron application.

Unit tests cover pure parsers and validation. Integration tests use temporary Git repositories, a real SQLite database, and controlled local processes. React tests cover user-facing states. Playwright Electron tests and packaged execution establish that the runtime boundary and native modules work together. CI runs on Windows with read-only repository permissions and retains only synthetic artifacts.
