# Third-party notices and review

Original DevStation source is MIT licensed. Dependency licenses are separate and must be preserved with distribution. This document is not a substitute for the notices included by Electron and installed packages.

Review status, 2026-11-21: **locked production package notices collected; final package verification pending**. No claim of a legal or vulnerability audit is made. The inventory follows `package-lock.json` entries not marked development-only, including peer/type packages that may not appear in the final bundle.

| Component | Purpose | Required review |
| --- | --- | --- |
| Electron 45.4.1 and bundled Chromium/Node | Desktop runtime | Electron MIT; shipped LICENSE and LICENSES.chromium.html located; preserve in ZIP |
| Electron Forge 8.0.1 and Vite 8.3.8 | Build tooling | MIT package declarations and license files verified |
| React / React DOM 19.3.1 | Interface | MIT notices collected |
| Zod 4.6.7 | Runtime validation | MIT notice collected |
| better-sqlite3 13.2.0 / SQLite | Local persistence | MIT binding notice collected; vendored SQLite 3.54.1 source copyright disclaimer inspected |
| lucide-react 1.77.0 | Icons | ISC and MIT-derived Feather icon notices collected together |
| Vitest 5.1.1, Testing Library 16.3.3, ESLint 10.15.0 | Verification | MIT declarations and license files verified |
| Playwright Test 1.65.1 | Desktop verification | Apache-2.0 declaration, LICENSE and NOTICE verified |

[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) contains unmodified notice text from the nine installed production package entries. [dependency-licenses.json](dependency-licenses.json) records their names, versions, license declarations, and notice filenames. Keep this notice file with the distributed app, in addition to Electron's runtime notices.

Before broad distribution, verify the final ZIP still includes these notices and review any dependencies added after this inventory. No proprietary fonts, logos, or source from other personal or work projects should be added to the package.
