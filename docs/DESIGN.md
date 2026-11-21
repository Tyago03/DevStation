# Design and interaction

DevStation is a desktop utility with an English interface, a dark default appearance, and locally saved Dark, Light, or System preference. System fonts keep the package independent of downloaded fonts. Teal accents identify primary actions; state labels and icons carry meaning independently of color.

The sidebar contains Overview, Projects, Runs, Ports, Diagnostics, and Settings. Overview summarizes actual registered projects and inspected state. An unchecked count must say **Not checked** rather than implying a measured zero. Empty states offer a clear next action, while failed operations retain their error and a safe retry path.

Projects are selected through a native directory picker. The selected directory may resolve to a Git root; communicate that root to the user. A missing folder remains registered until explicitly removed. The removal confirmation explains that repository files are preserved.

Configuration forms use a native executable picker, separate argument inputs, and a working directory inside the project. Saving never starts the process. Before running, show the executable, arguments, and trust warning. Stop and close-with-active-runs confirmations explain that child processes may survive.

Runs display current-session state, PID when available, timing, exit code, and text output. Stdout and stderr have explicit labels. Output supports searching and indicates discarded older messages. Ports display bind address, TCP port, PID when available, and local scope, with a reminder that all-interface binding does not establish public reachability.

Keyboard access, visible focus, semantic labels, modal focus management, reduced-motion preference, readable contrast, and layouts at Windows scaling of 125% and 150% are acceptance checks. Target layouts are 1280×800 and 1440×900 with a functional minimum around 1050 pixels. These are design targets, not completed verification claims; see [QA.md](QA.md).

The three [screenshots](screenshots/) capture the earlier locally tested package (`677acfca…`) with synthetic Git projects and a controlled live Python task. They do not show the final local rebuild, whose startup is blocked by host signing policy. Atlas API was imported through the native picker; Workbench UI and Notes CLI had catalog metadata seeded for screenshot preparation. Git states came from real fixtures. No real work projects, credentials, or private logs appear in this evidence.
