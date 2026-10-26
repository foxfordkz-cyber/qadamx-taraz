# Fresh dependency audit — 2026-10-26

Source baseline: Stage12 `55b39549bc52e767616763e0e1b5e8ab102c78e8`.
Run directory: apps/web. Raw npm advisory metadata is preserved in runs/audit-*.json.

| Package | Installed before | npm severity | Relationship | Affected installed-line range | Safe target |
|---|---|---|---|---|---|
| vitest | 3.2.7 | critical (includes dependency impact) | direct dev | redirect advisory >=2.1.0 <4.1.11; audit aggregate through 4.1.10 | 4.1.12 |
| @vitest/mocker | 3.2.7 | moderate | transitive dev through Vitest | redirect >=2.1.0 <4.1.11; manual injection >=2.1.0-beta.7 <4.1.12 | 4.1.12 |
| tinypool | 1.1.1 | critical | transitive dev through Vitest | worker gadget <=2.1.0; run-option gadget <2.1.2 | removed from Vitest4 graph; upstream standalone patch 2.1.2 |

These are three affected package nodes and four unique advisories, not three
production exploits. Standalone mocker/interceptor plugin exposure is relevant to
dev servers; this project config uses jsdom with no standalone mocker plugin.
Tinypool advisories require a prototype-pollution primitive and affected worker/run
options. No claim is made that the application's public API is directly exploitable.
Development/CI still executes dependencies, so the issues were fixed rather than
ignored. Do not expose Vite/Vitest to untrusted networks.

Primary advisories:
- [Redirect mock file read](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- [Manual mock code injection](https://github.com/advisories/GHSA-qxg6-89mg-rqv8).
- [Worker option prototype-pollution gadget](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3).
- [Run option prototype-pollution gadget](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).

| Fresh command | Before | After |
|---|---|---|
| npm audit --json | 2 critical, 1 moderate (raw metadata) | 0; exit 0 |
| npm audit --omit=dev --json | 0; exit 0 | 0; exit 0 |

Audit is a dated registry-advisory snapshot, not proof of absence of all security
issues. No exploit traffic or paid service was used.
