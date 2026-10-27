# Existing Vercel Preview — read-only review

PR102 HEAD a42c72d7 has a completed Vercel status bound to that commit.
[Inspector](https://vercel.com/p-it-chers/qadamx-taraz/Ctum8pC45YKss7GQqXTCUg3m4BWR).
[Existing preview](https://qadamx-taraz-git-feature-diploma-stage13-secu-0b9ac0-p-it-chers.vercel.app).

Fresh installed-Chrome context, no cookies/credentials: `/login` and
`/seller/research` both ended at `https://vercel.com/login`, title `Login – Vercel`.
HTTP200 was the Vercel login page, not Qadam success. No forms submitted. Non-GET
and non-Vercel requests blocked, including a Google sign-in iframe.
[Sanitized browser observation](runs/preview-browser.json).

| Question | Evidence / limit |
|---|---|
| Public preview? | These two URLs restricted by Vercel; not a claim about every alias or authenticated visitor |
| Exact served build? | GitHub status associated with a42c72d7; protected asset bytes not independently verified |
| Sensitive unauthenticated data? | Login gate, no tenant data obtained; Qadam Auth behind gate untested |
| Test Auth fixtures? | Outside web src/output; fresh local build contains no synthetic login/fixture markers. Hosted root/server overrides unknown |
| Browser secrets? | Local build: three synthetic server-secret canaries absent in7 text assets;0 source maps. Protected preview env/assets unverified |
| Backend target / env separation? | UNKNOWN; no dashboard access/bypass. Owner must review Preview-specific targets and scopes |
| Automatic migration? | No GitHub workflows; Render startup does not migrate/seed. Vercel dashboard overrides unknown |

No confirmed exposure within the inspected boundary; not a security certification.
If secrets, synthetic Auth routes or foreign tenant data appear later, stop
intrusive checks and notify owner without modifying deployments.

PR100–102 demonstrate automatic Vercel deployments on Git publication. Stage14
adds `vercel.json` at root and known project root `apps/web`, disabling deployment
for its exact NEW branch only. No wildcard, global disable, other branch rule,
cloud setting or protection bypass is changed. Verify remote status after push;
an unexpected build requires stopping and owner review, not a redeploy.

Official references: [Git integration](https://vercel.com/docs/git/vercel-for-github),
[deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration),
[Deployment Protection](https://vercel.com/docs/deployment-protection).
Ready/skipped status is not application acceptance.
