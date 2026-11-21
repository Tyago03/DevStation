# DevStation

Windows desktop P0. Electron Forge, React, strict TypeScript, SQLite. UI and README in English.
Keep main, preload, renderer and shared modules separate. Renderer cannot access Node APIs.
Validate every IPC payload and the sending top-level frame. No generic IPC or shell execution.
Git inspection only; disable fsmonitor hooks and optional locks per invocation. Never read project secrets.
Run configurations select an existing .exe, argv array and canonical cwd inside an imported project.
Start/stop require explicit user actions. Stop only session-owned processes. Never accept arbitrary PIDs.
Logs bounded and memory-only. No auto-run, telemetry, cloud or dependency installation inside the product.
Use synthetic fixtures for tests and screenshots; do not touch other user projects.
Keep QA evidence truthful. Verify the packaged Windows app, not just the dev server.
The user authorized creation and push to the private Tyago03/DevStation repository in this session.
