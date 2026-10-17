# Seller web — Registration on deploy-062, 2026-10-17

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

# Historical Seller web — Registration readiness / Android preparation

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
