# Guided-workspace usability study

Prepared: 2026-11-23. Status: **NOT RUN**. This is a protocol and blank recording form, not evidence of tested usability. Automated tests and an agent's walkthrough cannot replace human participants.

## Participants and consent

Recruit at least three people, preferably five, who can use Windows and have some development familiarity but have not used DevStation. The owner arranges participation; no invitations or messages have been sent. Assign anonymous IDs P01-P05. Do not record names, contact details, employer, personal repositories or unnecessary demographic details in this repository.

Explain the purpose, voluntary participation and the ability to stop at any time. Obtain explicit permission before recording audio/video, screens or quotations. Default to written, anonymous observations. Keep any raw recordings outside Git in an owner-approved private location, with an agreed deletion date. Only synthetic-data screenshots and consented, non-identifying quotes may enter a published report. Consent to participate is not consent to public disclosure.

## Controlled setup

- Record exact source commit, app version, artifact SHA-256 if packaged, runtime type (compiled development runtime or genuine package), Windows build, display scale, window size, theme and accessibility aids.
- Use fresh test-owned userData and a disposable synthetic Git repository, with Git and explicitly selected Python/Node already installed. Never use participants' projects or credentials.
- Prepare a harmless Python fixture that prints `server ready` and listens only on loopback; select a free local port and record it. Keep a clearly named synthetic untracked file for the Git task.
- Use the participant's own explicit actions for import, Save, Start and Stop. Do not preconfigure away the task being measured. Prepare a reset plan between participants.
- Use an environment where the exact runtime is allowed by policy. If Smart App Control blocks the package, record that limitation and stop the packaged session; do not disable it. A compiled-runtime study must be labeled accordingly.
- Do not disconnect the host network without an agreed isolated test environment. Help discoverability can be measured separately from the full physical-offline acceptance case.

Before each session, verify consent, an empty catalog, functioning tools and fixture cleanup/ownership. Record setup problems separately from product failures; do not silently exclude them.

## Observer script

Say: "We are testing the application, not you. Please describe what you expect and what you are looking for. You may stop at any point. I will observe without teaching the steps."

Allow 30 seconds on the initial screen, then ask what the application does. Read tasks one at a time without naming buttons or supplying navigation paths. If the participant asks for help, record the question and delay; ask what they would try next. If they are stuck, record the task as assisted/unfinished before offering assistance. Never mark an assisted task as unassisted success.

## Tasks, in order

| ID | Participant instruction | Observe |
| --- | --- | --- |
| U01 | Explain what this application is for after looking at the first screen | Purpose understood after 30 seconds; confusing terminology |
| U02 | Add the supplied test project | Finds import, understands folder/root and unchanged files |
| U03 | Tell us whether its Git files changed and what Untracked means | Correct interpretation; use of contextual help |
| U04 | Prepare a Python task using the supplied script; save it without running | Finds guide, selects interpreter/script, reviews exact launch details; no process on Save |
| U05 | Run that task and find `server ready` | Consent before execution, successful launch, output discoverability |
| U06 | Find the local port used by the task | Correct port/scope; no assumption that all interfaces means public Internet |
| U07 | Stop the task and explain its resulting state | Confirmation understood; distinguishes Exited from Unknown and child-process caveat |
| U08 | Find explanations of Process ID and the folder used when running, without web search | Bundled help discoverable; explanation understood |
| U09 | Remove the project's registration and check the folder still exists | Does not interpret removal as deleting Git files |
| U10 | Add the fixture again, start a task, then close the application | Understands active-task warning; can cancel closing or stop safely |

For U10, record task re-creation time separately from the first-use metric. A real failure or Unknown should be observed if it occurs; do not claim a simulated failure happened naturally.

## Measures and proposed targets

Primary timed sequence: start the clock when U02 is read; stop when U05 reaches the visible `server ready` message. Also record individual task times, clicks, wrong turns, hesitations, questions, observer interventions and failures. Do not subtract unsuccessful attempts from elapsed time. Record any external setup delay separately.

The proposed target is four of five participants completing import, setup and confirmed Start within five minutes in the prepared environment. Other goals: zero unconfirmed runs; each participant finds offline help; nobody interprets removal as folder deletion after reading the confirmation. These are targets, not measured results. With three participants, report individual outcomes instead of generalizing percentages. No result proves usability for all users.

## Participant session sheets

Each participant row links to the task log below; duplicate the blank log for a real session. P04/P05 remain optional if only three people participate.

| Participant | Status | Consent recorded privately | Prior development familiarity (broad) | Commit/runtime/hash | U02-U05 total | Unassisted result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | NOT RUN | Not recorded | Not recorded | Not recorded | Not measured | Not measured | No participant recruited |
| P02 | NOT RUN | Not recorded | Not recorded | Not recorded | Not measured | Not measured | No participant recruited |
| P03 | NOT RUN | Not recorded | Not recorded | Not recorded | Not measured | Not measured | No participant recruited |
| P04 | NOT RUN, optional | Not recorded | Not recorded | Not recorded | Not measured | Not measured | No participant recruited |
| P05 | NOT RUN, optional | Not recorded | Not recorded | Not recorded | Not measured | Not measured | No participant recruited |

Session ID: **unassigned**. Date: **not recorded**. Windows/scale/window/theme: **not recorded**. Fixture ID and allowed port: **not recorded**. Runtime limitations: **not recorded**. Observer: **anonymous role only**.

| Task | Start/end or duration | Success / assisted / unfinished | Clicks / wrong turns | Hesitation or question | Observer intervention | Anonymous evidence |
| --- | --- | --- | --- | --- | --- | --- |
| U01 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U02 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U03 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U04 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U05 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U06 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U07 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U08 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U09 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |
| U10 | Not measured | NOT RUN | Not measured | Not recorded | None recorded | None |

Post-session questions: What felt unclear? What did you expect Remove and Stop to do? Where would you look for help? What would you change first? Record answers only with permission and no identifying context.

## Analysis and completion

Report each participant's outcomes, actual sample size, assistance and setup limitations. Group repeated problems into actionable issues with severity, affected flow and evidence; fix the most consequential problems and retest them with clearly identified sessions. Preserve failed attempts in the report. Before finishing, stop only fixture-owned processes and verify the synthetic project remains intact after registration removal.

Current conclusion: **no participants tested; usability targets unmeasured**. Recruitment, consent, observation and analysis remain human dependencies. No v0.2 completion or publication claim follows from this prepared protocol.
