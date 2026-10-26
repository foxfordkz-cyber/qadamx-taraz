# Remaining gates and limitations

## Fixed in Stage13

The three npm affected development-package nodes are resolved by the targeted
Vitest4.1.12 upgrade; both fresh audit modes report zero. A repeatable loopback
launcher, reserved Stage12 ports, environment isolation checks, safe staging
configuration inventory and two fresh migration/restore rehearsals are provided.
No financial/source contract or production Auth change was required.

## Hosted staging / production: NO-GO until explicit acceptance

- No approved separate hosted DB/server/origin or test Supabase project was
  provisioned. No paid cloud resources or provider calls were authorized.
- Registration callback/production-origin policy is pinned to Pages; a different
  staging origin needs an owner-approved Auth decision. Existing guard was not
  weakened. Local JWT fixtures do not certify real Supabase refresh/JWKS/callback.
- Local PostgreSQL role is elevated. Unprivileged feedback denial was tested, but
  managed application role grants, TLS, backup encryption and restore permissions
  need review in the actual staging environment.
- Research feedback retention/deletion/withdrawal ownership is not resolved by a
  passing database test. Do not collect real participant data before approval.
- Live AI/ASR model access, exact model, RU/KZ quality, latency, spend and device
  microphone acceptance remain NOT RUN. The authorized live budget here is zero.
- Independent human annotation and unseen-corpus evaluation remain outstanding.
  Existing synthetic extraction/forecast tests are not population accuracy claims.
- PR100/101 remain Draft and unmerged. Stage13 is an additional incremental review,
  not integration approval and not a second replacement integration PR.

## Verification caveat

The initial Vitest4 full run had one timeout in whatsapp-components.test.tsx
(the first RU heading wait); 638/639 passed. All six tests in that file passed
independently with no code/timeout change. A subsequent full serial run is recorded
in full-test-results.md. The first failure is retained; concurrency/resource
contention is a plausible explanation, not a proven root cause. No timeout was
increased, assertion removed, or failed test hidden. Test runtime is not a benchmark.

Warnings retained: ESLint9 and whatwg-encoding deprecations; esbuild install-script
policy notice; expected jsdom canvas warnings; Starlette/httpx deprecation; Vite
large chunk notice and terminal color warning. No new audit advisory is inferred
from those warnings. Browser evidence is automated installed Chrome with synthetic
accounts and SQL, not a physical mobile or paid-provider test.

## Next priority

Captain/backend owner to review the stacked PR sequence, then approve one isolated
staging target and exact Auth callback policy/roles. Rehearse least-privilege DB
restore and real test-account isolation there; only afterward approve the bounded
live AI/ASR protocol. Do not start new financial features or claim production-ready
status while these gates remain open.
