# Seller web — PR43 Cloudflare callback, 2026-10-17

Продолжена существующая ветка #43. Исходный handoff сохранён `ad30329`, затем
обычный merge `origin/main` **86ca9af15017b163a9e47335c68eee46ac2fafde**:
**4ed9fd4835900576d72e2870393a9820802f65ab**. Проверенный код/архив:
**67eb828c132d1b3e28752a9624e2c69a9a530f9c**. Без force push и второго Auth.

Один фиксированный callback `https://qadamx-taraz.pages.dev/auth/callback`,
строгий origin guard, hosted build с сохранённым ids=true, SPA callback rules.
Валидный `/me` без точек показывает email, объяснение и RU/KZ обновление доступа;
никаких owner/demo memberships. Recovery/история/финансы/дизайн сохранены.

[Полный пакет интегратора: конфигурация, SHA256, проверки, реальные ограничения
и протокол email-приёмки](../REGISTRATION_CLOUDFLARE_HANDOFF.md).
Browser synthetic: Cloudflare **6/6**, Auth **25/25**, Recovery **5/5**,
history/ids **6/6**, Seller/Auth QA **21/21**. Полный Vitest **477/477**, 34 файла.
TypeScript/lint/check:api/format/build PASS.
Настоящие публичные endpoints/CORS/email settings проверены read-only;
Redirect URLs не раскрываются этим API. Капитану передан точный URL с требованием
сохранить прежние адреса; mobile proposal отправлен `@bltangenss`, ответа пока нет.

**Живое письмо → callback → session → /me ещё NOT RUN.** Пользователь готов
проверить после публикации ZIP и подтверждения Supabase allowlist. Архив готов,
но deploy/admin-доступа в этой сессии нет. PR остаётся Draft. Отдельный password
login после письма не засчитывается. Следующие записи — сохранённая история.

---

# Historical Seller web — PR43 callback implementation, 2026-10-17

## Joint frontend release checkpoint — 2026-10-17

Local documentation checkpoint only; no new commit/push/deployment. The exact
published PR43 head remains `6ce3d29bf16d33f57b1d9dbf5c0bf1c4fcce7464`.
Main, Vercel, Render, Supabase and production environment variables were not changed.
Backend rollout belongs to the integration agent.

One consolidated handoff was posted and read back successfully in
[backend PR61](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/61#issuecomment-6234533149),
addressed to `@foxfordkz-cyber`. It contains exact published SHAs, checks, limitations,
dependencies, activation/rollback order and manual registration/iPhone procedures.

| PR | Published head, verified through GitHub API and local HEAD |
|---|---|
| 43 | `6ce3d29bf16d33f57b1d9dbf5c0bf1c4fcce7464` |
| 65 | `559b4d0e36d60e8cadda46118f8dad1f057c2cab` |
| 66 | `a964646f0ad1628f32d941e0d6e340bcfd6caff3` |
| 67 | `8da93dc48ff998230212be4f31c32944a173f53b` |

Each SHA has a successful Vercel commit status and Preview Comments check. These
are published Preview candidates, not a claim about production's runtime SHA.

**PR43 live attempt remains blocked.** The operator reported `You Need Access`:
the protected Vercel deployment requires team-owner approval even though the
operator is signed into Vercel. Qadam has not loaded in that attempt; callback,
session and authenticated `/me` therefore remain unverified. No account details
or email URLs were saved. Prior email delivery plus separate password login
does not satisfy this gate. No new real signup/email was sent by the agent.

Exact registration URL:
`https://qadamx-taraz-git-integration-seller-registrat-7d21c0-p-it-chers.vercel.app/register`.
Its callback is the same origin with `/auth/callback`. Fresh read-only checks:
both routes redirect anonymous requests to Vercel SSO; Preview OPTIONS `/me`
returns 200 with the exact Allow-Origin, anonymous GET returns 401 with that
origin. After the owner approves access, first load the Qadam form, then use a
fresh agreed test address and the latest email in that same browser/profile.
Record direct callback, one PKCE exchange, authenticated `/me`, correct empty
business state or own cabinet, reload and logout before any separate password
login. Expired/reused/other-browser links remain separate live gates.

**PR65 stays disabled.** Default flag and `.env.example` are false; administrative
production env was not inspected or changed. The live Render OpenAPI still lists
customer parameters `id/q/limit/cursor`, without `ids`. PR65 depends on PR63
`ae593c15408b05b2d32342900c3ed018739d1565`. Backend PR61 head
`735145e15d13b7b7bc7022dc79dff2700fb65116` documents application candidate
`f6b3a9a94d8bf1c982344c05e0203dcb5bc6b8b5`, not a completed rollout.
Integrator must confirm deployed SHA and live ids/isolation before a separately
enabled test build and the live names/reload/filter/business/user checks. The
build-time production flag stays off until those pass. Disable/rebuild frontend
before any rollback to a backend that ignores ids.

**PR66 physical incident remains open.** Short operator sequence is in the
consolidated handoff: identify iPhone/iOS/browser/URL/SHA; Safari then original
in-app browser; menu/close/underlying button/RU-KZ/manual text; permission denial
and explicit retry; record/stop/play/pause/delete and separate cancel; reload.
No AI submission or monetary confirmation is needed. Device-specific morning
cause and actual iPhone recording are not proven by desktop tests.

**PR67 review requested, not received at publication of this handoff.**
[Abzal @ab0ka](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/67#issuecomment-6234471380)
was asked to review the exact SHA and pinned before/after gallery.
[Bekzat @bekzatwr](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/67#issuecomment-6234472094)
received a separate date-formatting coordination request and the shared Dialog
review dependency. `shared/format.ts` was not changed; its future move does not
block the remaining fixes. Earlier PR55 approval is not PR67 approval.

Fresh targeted checks (Node22.19.0, installed dependencies; synthetic Auth/API):
- PR43 `registration-preview.playwright.config.ts`: **6/6 PASS**.
- PR65 `ledger-reading.playwright.config.ts`: **6/6 PASS**; Vitest
  `ledger-reading.test.tsx` + `customer-ids-contract.test.ts`: **32/32 PASS**.
- PR66 `ios-compatibility.playwright.config.ts --project=desktop-chromium`:
  first parallel run **2/3**, timing out before the login form; separate full
  rerun **3/3 PASS**. The timeout's cause is not established; no test or app code
  was changed to obtain the second result.
- PR67 `analytics.playwright.config.ts analytics-compact.spec.ts`: **3/3 PASS**.
All Playwright runs used `--trace off`, retries=0, local isolated servers. Initial
sandbox launches failed before tests because esbuild could not read a parent
directory; authorized execution outside that sandbox resolved startup. These
results do not replace live email, deployed ids or physical iPhone acceptance.
Full historical unit/build/lint results below were not rerun as part of this
checkpoint. Next work requires owner-approved Preview access, integrator rollout,
physical device results and the reviewers' actual replies.

---

## Registration audit after the captain's real-email attempt

The captain received the confirmation email, encountered Vercel Authentication
after following its link, signed into Vercel through Google, and subsequently
logged into Qadam separately with email/password. The supplied Preview screenshot
shows the expected empty-business cabinet. **This is not a passed email callback.**
No screenshot, email address, password, code or token is published in this change.

Read-only checks: the exact Preview `/register` and `/auth/callback` both return
302 to `vercel.com/sso-api` without an access cookie. Preview CORS was separately
rechecked after the captain's configuration update: OPTIONS `/me` is 200 with
the exact Preview Allow-Origin; anonymous GET `/me` is 401 with that Allow-Origin.
The older CORS 400 reports below are historical.

Updated the waiting-for-email instructions in RU/KZ: open the latest email in the
original browser/device. Only the approved PR43 Preview build also explains that
the browser must already have Vercel access. Production does not show that notice.
No changes to callback exchange, Auth/session guards, memberships, recovery or money.

The Preview acceptance suite now validates the actual SDK verifier against the
signup/resend SHA-256 challenge and covers a synthetic access interstitial returning
with/without the callback code plus a fresh browser without the verifier. With the
code and original browser state, callback → session → `/me: businesses=[]` succeeds;
without either, it offers recovery and does not claim successful authentication.
The interstitial is an isolated model, **not** a test of Vercel's own SSO service.
The first interstitial fixture used HTTP302, whose redirect hop bypassed the
per-page mock and failed on an unresolvable `.example.test` host; it was replaced
with intercepted browser navigation. The test browser additionally blocks external
DNS resolution so an unhandled hop cannot reach a public service.

Validation of this continuation: **413/413 Vitest**, **25/25 existing Auth E2E**
and **6/6 Preview E2E** passed. Exact SHA is recorded in the PR. TypeScript, lint,
contract, format and local production/Preview builds passed. There are still inherited
3D bundle size warnings. No real emails/accounts were created by the agent.

Synthetic Preview screenshots: [KZ at 360 px](../qa/registration-preview/confirmation-kk-360.png),
[KZ at 1440 px](../qa/registration-preview/confirmation-kk-1440.png).

Next live attempt: finish Vercel access at the exact approved branch origin first,
then use a separately agreed fresh test address and open its email in that same
browser/device. The already confirmed account is not registered again. Record
direct return, actual session and `/me`, reload/logout separately from manual login.
Do not disable deployment protection, change Site URL, or grant demo membership.

---

Previous implementation snapshot (`70a088c`):

Latest continuation: captain approved the exact PR43 Preview callback. Vite scopes
it to `VERCEL_ENV=preview` plus this exact registration branch; production keeps
its callback. Signup/resend are blocked on another deployed origin, including at
the provider boundary. RU/KZ guidance points to the agreed branch Preview.
No new Auth client, endpoints or membership provisioning.

Validation: 413 unit/component, 25 existing Auth E2E, 3 isolated Preview E2E,
typecheck/lint/contract/format/build. Preview tests cover the compiled bundle,
same-origin synthetic confirmation, SDK session, empty `/me`, reload/logout and
360/1440 layouts. They do not prove real email delivery.

Captain confirmed saved production URLs, but explicitly says Preview allowlist,
Vercel access and backend CORS are still being prepared. Our Preview OPTIONS
received 400, while production received 200. No live signup or mail was sent.
Exact setup and acceptance steps: [updated review](../REGISTRATION_CALLBACK_REVIEW.md).
Continue this same Draft PR43; main/deploy/production and Auth settings unchanged.

---

Previous implementation snapshot (`9227f6f`):

Continued the existing `integration/seller-registration-deploy-review` / Draft
[PR #43](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43), with no duplicate
branch or PR. Merged current main `ad63a00` into this branch only: merge
`36b9c72b123dec0ca6969bbfd71ea42b5a1818e3`. Both historical documentation sections
were preserved. Customers/recovery and Abzal's presentation match that main exactly.

Implemented the agreed PKCE callback in the existing AuthProvider/router: fixed
email redirect, URL cleanup, one exchange across remounts, session/generation
guards, validated `/me`, RU/KZ errors and explicit resend. A late exchange HTTP
response is rejected before the SDK saves it if a newer login/logout superseded
the attempt. No second client, membership provisioning or automatic Demo.

[Current implementation, verification and outstanding live acceptance](../REGISTRATION_CALLBACK_REVIEW.md).
Final isolated checks: **400/400** unit/component (26 files), **25/25** Auth/
Registration/Callback browser, **5/5** Recovery browser, **21/21** Seller/Auth QA. TypeScript, lint,
check:api, configured production build, formatting and diff checks PASS.
Earlier reports below describe their historical revisions, not this callback.
The agreed callback is **not** evidence that the Supabase allowlist was changed.
Captain approved training point `2c234f1c-2c79-5e3a-ab77-042e3da4dafa`; before
any future write it must still be present in A's actual `/me`. No live accounts,
customers, emails or financial records were created in this continuation.

Main, deployment branches, running services and Supabase settings were not changed.
Fresh authenticated acceptance is pending usable A/B browser access; the new email
flow also needs the captain's test mailbox and applied allowlist confirmation.

---

# Historical Seller web — Registration on deploy-062, 2026-10-17

Worktree `work/qadam-registration-deploy-review`, branch
`integration/seller-registration-deploy-review`, base deploy-062
**9845b91b64d388c54312d2a8a75000218c7774af**. Main has the same base at task start.
Selected 12 Registration source/test files from PR #31
**6f808677c067cc00fb6b6b9eb26384f68c3d1e38**, without a merge. PR #31 and Recovery
PR #42 remain independent and unchanged. No Recovery coordinator was imported.

Implemented `/register`, existing AuthProvider signUp/resend, neutral confirmation
waiting, validation, synchronous duplicate-submit protection, service quota/error
messages, RU/KZ. Credentials stay in memory; waiting marker has no identity data.
Login/logout/session persistence and the existing session-generation guards remain.
`/me` alone grants memberships; empty list shows waiting + explicit Refresh,
API failures stay errors, no automatic Demo/provisioning or foreign-point access.

New safe public URL diagnosis refuses malformed/service URLs before SDK creation,
without repairing the destination or exposing its value. New integration tests
cover wrong Project URL and missing API/network/401/403/404/500/malformed `/me`.
Existing customer, financial, Voice, Analytics/public modules and API 0.6.2 are
unchanged. No Backend, generated, package/lock, styles, Flutter or 3D edits.

[Full changed-file list, diagnosis, commands, live gates](../SELLER_REGISTRATION_DEPLOY_REVIEW.md).
The old audit and earlier snapshots below remain historical.

Own checks: npm ci/check:api/typecheck/lint/build/format:check PASS; full serial
unit/component **311/311 in 20 files**, strict microphone **35/35**.
Browser verification PASS: Auth/Registration **17/17**, Customer/Auth/Seller QA
**21/21**, financial retry/Analytics **1/1**, microphone **18/18**,
Analytics/Seller/public **24/24**. Synthetic SDK/HTTP/audio only; suites overlap.
Ignored logs: `apps/web/test-results/registration-deploy`; screenshots stay in
test result folders. Two visually reviewed 360/1440 PNGs were copied to
`docs/qa/registration-deploy` for this PR; the designer's gallery is unchanged.

Own read-only production evidence: `/login`, health and OpenAPI 200/API0.6.2;
anonymous `/me` 401 AUTH_REQUIRED; CORS preflight for the permanent origin 200
with Authorization allowed. Published entry JS contains expected team Supabase
and Render API URLs. Public Auth settings allow signup and require email
confirmation. These are not authenticated login/DB/email acceptance.

**Blocked:** exact callback route/HTTPS URL/allowlist/flow/destination, provider
email settings/quota and agreed test account/environment. Existing proposals are
not approvals. `detectSessionInUrl:false` remains; no callback/token exchange or
real emails. The user's local `otp_expired` and Dashboard failure cannot be given
a definitive cause without sanitized incident evidence. No personal Supabase is
connected to the team API. No live writes, paid AI, physical Android, manual
deployment, service restart or Supabase settings changes.

Verified code **44aaed4fd01284b1115ce8cbb680686260931746** was pushed to the own
branch and local/remote HEAD matched. All requested local gates are complete;
later commits only record verification/publication. Published
[Draft PR #43](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/43), base
`deploy-062`, head `integration/seller-registration-deploy-review`. Acceptance
report commit **8c940f3ea32b1324c7b8daf07ff45a4f1e8d8fdb** was pushed, local/remote
matched, fetch and own pull --ff-only succeeded. This following docs-only commit
records the PR link. Callback/test-environment questions are addressed to the
captain/backend in the PR; no answer is assumed. Next: captain review and separate
callback/live acceptance approval. PR #31/#42 remain unchanged. No merge occurred.
Current exact SHA: `git log -1 --format=%H`; do not merge/deploy from these instructions.

---
# Seller web — Analytics readability, 2026-10-17

Отдельная ветка `feature/seller-analytics-readability` от актуального main,
обновлённая до **6e8bd1b8bbffd8437918dfa2b461d85f49f19b5a**. Шесть KPI, сводка
по API с разделением периода/текущего долга, подписи и выбор на графиках,
переходы к истории/долгам, новая продажа из пустого периода, RU/KZ и мобильные
состояния. Backend/контракт/общий UI/финансовая логика/Customers не менялись.

[Состав, проверки, ограничения и отсутствие новых backend-зависимостей](../SELLER_ANALYTICS_READABILITY.md).
[Снимки до/после](../screenshots/analytics-readability/README.md).
Оформление передано на согласование Абзалу через капитана; ответа пока нет.
Передача — отдельный Draft PR, main/deploy не переключались.

Ниже сохранены предыдущие передачи без изменений.

# Seller web — Customer Recovery verification, 2026-10-17

Branch **fix/seller-customer-recovery-safe**, existing separate worktree
`work/qadam-customer-recovery-safe`. Saved checkpoint
**25525053b7e4ac0fe20f5280d1a9a9053dd2e57a** was clean and matched origin.
Fetch/prune and pull --ff-only succeeded. Authorized main synchronization:
**9845b91b64d388c54312d2a8a75000218c7774af** → merge
**0aa8561dffae12021339132370adaa9a54bc03f5**, no conflicts. Only two captain
Markdown files arrived; all saved Recovery application/tests remain unchanged.
Current exact HEAD: `git log -1 --format=%H`.

The late K1 callback cannot delete pending K2: the shared coordinator uses Web
Locks, key+bodyHash compare-and-clear and current mounted owner/session epoch /
user/business/API guards. Customers and CustomerPicker share the intent, while
unrelated forms retain their own inputs. Unknown/not_observed/503/409 keep the
original key. Retry is explicit with the same canonical body; reload performs
GET only. LocalStorage contains only the marker's key/hash. Unknown-origin legacy
records remain blocked without migration. Missing Web Locks/storage blocks
creation. No keyless fallback or new key bypass is implemented.

Full review covered coordinator lifecycle, gateway/bindings, RU/KZ and regression
coverage. Captain assertions are unchanged; the original RED reproduction is
recorded in the earlier checkpoint. No new code defect was found on resumption.
AuthProvider, Backend, OpenAPI/generated, Voice, financial/public modules,
Flutter, 3D, dependencies and tracked screenshots match main.

## Own resumed checks

Commands run from `apps/web` with Node 24.21.0/npm 11.19.0:

| Check | Result |
|---|---|
| npm ci | PASS; package/lock unchanged |
| npm run check:api / typecheck / lint / build / format:check | PASS |
| npm test -- --no-file-parallelism | **311/311**, 21 files |
| npx vitest run src/test/recovery-late-review.test.tsx | **1/1**, original captain case |
| npx vitest run --config vitest.microphone.config.ts | **35/35** |
| Playwright customer-recovery | **5/5** |
| Playwright qa | **21/21** |
| Playwright voice-integration | **1/1** |
| Playwright auth-onboarding | **7/7** |
| Playwright microphone | **18/18** |
| Playwright analytics (Seller/Analytics/public) | **24/24** |
| git diff --check and forbidden-path diff | PASS / empty |

All browser commands use `npx.cmd playwright test --config e2e/<suite>.playwright.config.ts --trace off`.
Analytics screenshots use `QADAM_SCREENSHOT_ROOT=./test-results/recovery-screenshots`;
tracked screenshots are preserved. Logs: `apps/web/test-results/recovery-resume`.
Suites overlap: captain case is in 311; strict microphone 27 overlap default; the
QA and Analytics configs repeat 8 Seller cases. Do not sum these as unique tests.
HTTP/SDK/audio fixtures are synthetic; native Web Locks run in real Chromium tabs.
No live Supabase/DB, paid AI, real email or physical Android acceptance is claimed.

## Scope, limits and next step

[Architecture, all 24 changed files, exact run commands, review and limits](../SELLER_CUSTOMER_RECOVERY_SAFE.md).
[Checkpoint continuation and historical evidence](../SELLER_RECOVERY_CHECKPOINT.md).
[17-step operator-ready rehearsal](../qa/SELLER_FINAL_DEMO_REHEARSAL.md).
Existing routes, customer search/selection, RU/KZ and API 0.6.2 are retained.
Three inherited dev audit findings (1 moderate/2 critical) and large 3D bundle warning
remain; no forced package upgrade. Fresh live rehearsal needs reviewed deployment,
approved training accounts/writes and separate AI/device/speaker permissions.

PR #41 (`feature/sale-debts-polish:7d84cb6`, base deploy-062) has overlapping
Customers presentation/test/docs edits. It was inspected, not merged or changed.
Preserve both presentation and recovery when captain later integrates them.
Registration [Draft PR #31](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/31)
remains separate at **6f808677c067cc00fb6b6b9eb26384f68c3d1e38**, base
`integration/voice-preview-061`, unchanged by this resumed task. Its callback URL,
Supabase allowlist, confirmation mechanism and live email acceptance remain blocked.
No main/deploy/other branch, backend configuration, migration or working service
was modified. Recovery is published as [Draft PR #42](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/42),
base `main`, head `fix/seller-customer-recovery-safe`. Verification report commit
**14f5ad8129605f47f65967603401c5c3cd17851f** was pushed successfully; local and
remote HEAD matched. This following documentation-only commit records the PR link;
the PR head and `git log -1 --format=%H` identify its current revision.
GitHub confirmed PR #42 is Draft, not merged and conflict-free against main
`9845b91b64d388c54312d2a8a75000218c7774af`. At revision
`61044473a2be3026294c2d17f3d5f26ff1f39f28`, the automatic Vercel status and
Preview Comments check both succeeded. No manual deployment or live browser
acceptance was performed; preview success is not proof of Auth/DB acceptance.
Next: captain review, integration/deployment in a separate authorized task, then
the gated live rehearsal. Do not merge old PRs again or clear pending markers.

The Registration/design/Analytics sections below are historical snapshots.

---
# Seller web — Registration readiness / Android preparation

2026-10-16. Branch `feature/seller-registration-onboarding`, separate worktree
`work/qadam-seller-registration`. User/captain approved base
`origin/integration/voice-preview-061:0737439915c17e8d8f20cddcbe9e75bebede9b46`.
No merge of PR #14/#23/#28; Backend, API 0.6.1/OpenAPI/generated, financial logic,
Voice implementation, public storefront and shared styles/components unchanged.

**Registration remains Blocked on onboarding approval.** Base approval is not
approval of signup/provisioning/callback policy. Existing Login is functional;
fixed synchronous double submit, disabled Demo while login is pending, corrected
exact RU/KZ Demo labels. Zero-membership UI now explains unavailable creation /
invitations and offers explicit GET /me refresh. No automatic access or Demo.

Source files: `apps/web/src/app/{App,pages}.tsx`, `shared/i18n/{ru,kk}.ts`.
New tests: `src/test/auth-onboarding-readiness.test.tsx`,
`e2e/auth-onboarding.{acceptance,playwright.config}.ts`; selected existing money
journey tests from own QA c1ea88a in `e2e/voice-integration.*`. Three existing
screenshot tests accept an optional output root, preserving tracked design PNGs.

[Audit, contract, captain questions, commands and limits](../SELLER_REGISTRATION_AUDIT.md).
[Physical Android checklist](../qa/ANDROID_VOICE_ACCEPTANCE.md).
Public Supabase settings confirm email signup enabled, confirmation required;
no signup/email was sent. HTTPS frontend/API health/CORS passed read-only probes.
Physical Android **Blocked** (no device), live Gemini **Not run / Blocked**.
Existing preview and shared services untouched.

Own final checks: npm ci, check:api, typecheck, lint, build, format:check and
diff --check passed. **254/254 unit/component**, strict microphone **35/35**,
Auth onboarding browser **7/7**, microphone browser **18/18**, standard
Seller/Analytics/public **24/24**, existing Auth/Customers QA **21/21**, full
synthetic money/Analytics journey **1/1**. Counts overlap across suites as noted
in the audit. These are not live Auth/DB/Gemini or physical Android results.
New mobile/desktop empty-state PNGs inspected locally; existing tracked design
screenshots unchanged. Current exact commit: `git log -1 --format=%H`.

Published verified implementation:
`54a78322495ebdf13fd339dbdbecde61bcda7f88`.
**[Open Draft PR #31](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/31)**,
base `integration/voice-preview-061`, head
`feature/seller-registration-onboarding`. Push successful and local/remote
HEAD verified equal; GitHub reports mergeable=true, merged=false. This final
documentation-only checkpoint records publication; use `git log -1 --format=%H`
for its own exact hash. Do not merge or deploy without the next task.

Captain/backend questions:
[PR #18 comment](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18#issuecomment-6217630633).
No onboarding answer received at publication. Physical Android checklist is
ready for a human operator; signup/callback/resend are intentionally unimplemented.

Next: captain answers onboarding questions, approves callback URLs/provisioning,
then implement signup/confirmation/resend through the same AuthProvider.
Do not invent membership APIs or rebase/merge other branches automatically.

The sections below describe historical Analytics/design snapshots.

# Seller web — текущая передача Analytics

2026-10-16. Новая ветка `feature/seller-analytics` от согласованной капитаном `origin/integration/local-combined-check`, актуальная база **58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76**, отдельный worktree `work/qadam-seller-analytics`. После начального2089e44 капитан опубликовал Analytics0.6/cd655e9; свои изменения сохранены, неопубликованная ветка обновлена fast-forward rebase без merge PR14. Маршрут `/seller/analytics` в том же приложении и SellerLayout. Дизайн/финансовые/public-модули сохранены.

Live GET Analytics7/30 подключён по OpenAPI0.6/generated через общий Bearer-клиент, runtime validation, AbortSignal, ручной retry и existing money invalidation prefix. Отдельный явный Demo adapter не вызывает API и не включается автоматически. Четыре KPI, дневной/почасовой графики, таблицы/keyboard, RU/KZ и ширины360/390/768/1440. Backend/контракты не редактировались. Liveклиент проверяется синтетическимиHTTP/SDK fixtures; реальная8018недоступна. Точные файлы, архитектура, команды, отличия PR #14, ограничения и итоговые проверки: [SELLER_ANALYTICS_HANDOFF](../SELLER_ANALYTICS_HANDOFF.md).

Итог:207 unit/component (полный serial-прогон),24 standard+Analytics E2E,21 existing QA E2E passed; typecheck/lint/build/check:api/format:check/diff passed.7 новых PNG просмотрены. Commits Demo484eb48, Livec6e80b5, UIca948ea; tests/docs2be68accfddf52091323d53f500f714872ecf1d4. **[Open Draft PR #16](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/16)** в integration/local-combined-check создан, push успешен, remote/local HEAD совпали; GitHub mergeable=true, merge не выполнен. Финальный docs-only commit обновляет публикацию, текущий полный hash — git log -1 --format=%H. Backend/OpenAPI/generated/финансовые/public-модули, main, PR11/12/14 сохранены.

Ниже сохранена историческая передача design PR #11; её branch/API/test результаты описывают тот snapshot, а не новую Analytics задачу.

# Seller web — передача интегрированного дизайна

2026-10-16. Рабочая ветка **feature/seller-design-integration**, отдельный worktree `../qadam-seller-design`. Base — `origin/integration/team-mvp`, точный исходный HEAD **3d009dc86c93debcab05dedda530b7d1fe62a304** (Draft PR #8). Источник готового дизайна — **a77f1a02b240dbf9e8c627937a5cb6445d92fb51**. Старую feature/seller-dashboard, ветку QA test/seller-regression и чужие PR не изменять.

## Что сделано

Ограниченным diff перенесены Manrope с локальным fallback для казахских букв, Qadam tokens/brand, зелёная палитра, карточки, кнопки, формы, dashboard и мобильное меню. До переноса проверено: затронутые production-файлы не менялись между общей seller-основой b3d0328 и интеграцией 3d009dc. Пакеты, контракты и финансовые модули старой seller-ветки не переносились.

Мобильное меню закрывается после перехода, Escape и browser Back/Forward, возвращает фокус. Поиск клиентов/заявок и локальные фильтры каталога, RU/KZ, CustomerPicker сохранены. В финансовом Demo нет записи и вымышленных итогов: для долгов/истории/summary показано явное пояснение отсутствия серверных данных. До 1100 px финансовые формы располагаются в одну колонку, серверные KPI — в две; на desktop сохраняются две/четыре колонки.

Публичная витрина получает согласованную палитру и Manrope через CSS aliases `.ex`, без изменения её файлов. В `apps/web/.gitattributes` зафиксированы LF для JS/MJS/HTML: исправлена исходная Windows-проблема format:check при core.autocrlf=true.

## Что сохранено из Team MVP

Без изменений: apps/api, OpenAPI 0.4.0 и generated.ts, API/bindings/gateway, auth/runtime/providers/router/modules.ts, queries, features/voice/ledger/summary/explore/inquiry, 3D assets, package/lock. Продажа, погашение, голос/ручной ввод, подтверждение, точное тело и Idempotency-Key при повторе, beforeunload money-pending guard, серверные балансы и итоги остаются кодом интеграции. Summary находится также на экране Sale; Dashboard не получает вымышленных KPI.

Работают все интегрированные маршруты: /login; /seller; /seller/{customers,inquiries,catalog,sale,debts,history,summary}; /; /venues/:slug; /shops/:slug. Live API требует окружения капитана; Demo не заменяет живой сервер. GET/PATCH заявок и каталог через public shop уже есть в 0.4.0 — старые утверждения об отсутствии этих API больше не актуальны.

## Проверки и ограничения

Из apps/web: npm ci; npm run check:api; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; npm run format:check. Фактические итоговые результаты фиксируются в [основном handoff](../SELLER_FRONTEND_HANDOFF.md) после завершения прогона. Чужие результаты backend/live не выдаются за собственные.

Новые настоящие screenshots запущенного приложения: [team-mvp-design](../screenshots/team-mvp-design). Seller screenshots — явно read-only Demo, публичные — явно обозначенные API test fixtures. Финансовые операции не имитировались как успешные.

Собственный live acceptance **Blocked**: на 127.0.0.1:8000 connection refused, в новой рабочей копии нет apps/api/.env, apps/web/.env.local и паролей тестовых владельцев. Публичные настройки восстановить из защищённо переданного окружения; секреты/JWT не записывать в документы/Git. Общую БД не мигрировать и не очищать. Физический Android недоступен, выполнена только Chromium browser emulation.

npm audit сообщает 3 унаследованных dev findings в Vitest/@vitest/mocker/Tinypool (1 moderate, 2 critical); audit --omit=dev — 0. Обновление тестового стека требует отдельной задачи; package/lock сохранены. Build сохраняет предупреждение о большом 3D chunk и пустом auth chunk при отсутствии публичной auth-конфигурации. Это не ошибки сборки.

## Продолжение и Git

Не делать merge в main или integration/team-mvp, не использовать force. Новый Draft PR должен иметь base integration/team-mvp, head feature/seller-design-integration, название `feat(seller): integrate merchant redesign into team MVP`. Итоговый commit/push/PR записаны в основном handoff; текущий точный HEAD — `git log -1 --format=%H`.

Следующий шаг: review нового Draft PR капитаном, затем собственная live-приёмка Supabase login, /me, разрешённые точки, customers/create/reload/logout/cache и финансовых/публичных сценариев на согласованных учебных данных. Физический Android и настоящий микрофон проверить отдельно. QA-ветку и PR второго Codex не объединять автоматически.

Полный состав файлов, команды и статус: [SELLER_FRONTEND_HANDOFF](../SELLER_FRONTEND_HANDOFF.md). Визуальные решения: [SELLER_DESIGN_NOTES](../SELLER_DESIGN_NOTES.md). История старых seller-этапов сохранена в Git (b3d0328 / a77f1a0), текущая база — Team MVP.

## Проверено в новой design integration ветке

Финальный прогон: npm ci, check:api, typecheck, lint, build, format:check — passed; **84 unit/component (8 файлов), 14 Chromium E2E**. Ширины360/390/768/1440, 20 новых PNG. История тестового WebGL stub/Windows LF исправлена без изменения production API/финансовых функций. Финальные Git refs/PR и подробные ограничения — в основном handoff. Это новые собственные результаты; live-результаты капитана не включены в эти числа.

## Опубликовано

Проверенный code commit **3faa4b23e6c973836ba1099e7695546ec427eb65**, push успешен и local/remote hash совпал; fetch/pull --ff-only своей ветки — Already up to date. Base повторно проверен:3d009dc86c93debcab05dedda530b7d1fe62a304. Новый **open Draft PR #11**: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/11, base integration/team-mvp. Эта запись отдельным docs commit дополняет проверенный код; актуальный итоговый HEAD — git log -1 --format=%H. Новому Codex продолжать только feature/seller-design-integration. Merge не выполнялся.
