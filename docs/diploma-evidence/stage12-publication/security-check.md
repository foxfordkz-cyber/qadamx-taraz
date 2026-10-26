# Publication safety and unresolved dependency findings

Scope: outgoing Stage 11 history (objects not reachable from fetched origin refs),
then the new Stage 12 staged files. This is a bounded AI-assisted check, not an
independent security audit or proof that the whole historic repository is secret-free.

The 517 outgoing blobs were checked for private-key headers, GitHub/provider token
formats, JWT strings and credential-bearing PostgreSQL URLs. No pattern candidates
or forbidden .env/dump/trace paths were found. No outgoing blob exceeded 1 MB.
Template .env.example files are retained. Existing credential strings used by
local fixtures are explicitly synthetic, not shared account credentials.

Binary artifacts are 94 test screenshots and one blind-review ZIP. The ZIP contains
synthetic unannotated review materials, not account state or audio. Historical
fixture screenshots/evidence retain their original bytes and provenance. New
browser artifacts are generated with traces off and synthetic local accounts;
selected screenshots are visually reviewed. No real customer records, access
tokens, private browser storage, DB dumps or local dependency trees are staged.
The full Git backup is local only. Workstation paths in historical logs are
metadata, not production credentials; new logs redact the checkout root.

## Fresh npm audit: unresolved, not hidden

`npm ci` succeeded. `npm audit --json` returned exit 1 on 2026-10-26:

| Package | Severity | Dependency role | Advisory |
|---|---|---|---|
| @vitest/mocker | moderate | transitive development | [file read](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [mock registration](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| tinypool | critical | transitive development | [worker options](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [run options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) |
| vitest | critical | direct development | vulnerable dependency chain above |

These are registry findings, not a demonstrated production exploit. No test
server is exposed publicly. The proposed remediation is a Vitest 5 major upgrade,
requiring a separate compatibility/security change; no force update or lockfile
change was made during candidate publication. Raw registry metadata is preserved
in runs/npm-audit.json. It is an additional release-review item; staging/production
remain NO-GO. Draft publication is not a vulnerability waiver.

Financial confirmation, integer tiyn, idempotency, factual validation, tenant checks
and strict JSON boundaries are unchanged. Shared Supabase/PostgreSQL, deployed
configuration, GitHub ownership and PR #100 are not changed. Paid AI calls: 0.
