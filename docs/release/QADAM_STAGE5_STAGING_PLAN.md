# Stage 5 — изолированный staging и release gates

12.11.2026. Это план для утверждения владельцем. Облачные ресурсы, тарифы,
секреты, настройки Supabase/Render и hosted database не изменены. Deploy,
миграции, платные AI-вызовы и реальные денежные операции не выполнялись.

## Новая безопасная диагностика hosted

Только GET/OPTIONS, без токенов и пользовательских данных, 11:26–11:28 UTC:

| Запрос | Факт Stage 5 |
| --- | --- |
| Render `/api/v1/health`, первый | HTTP **522**, 39.594 с, без API request ID |
| `/health`, затем | Timeout после 15.515 с |
| `/openapi.json`, затем | Timeout после 15.125 с |
| `/api/v1/me`, без credentials | 401 AUTH_REQUIRED, 2.688 с |
| `/api/v1/venues` | 200, 1.984 с; проверен только count публичного ответа |
| OPTIONS `/me` с Pages origin и Authorization | 200, 0.406 с, origin разрешён |
| Повторный warm `/health` | 200, 0.594 с |
| Повторный warm `/openapi.json` | 200, 2.078 с; **0.7.2**, endpoint report отсутствует |
| Supabase `pdjjdqgoitnkpgkbqjtp` public JWKS | 200, 1.313 с, один ES256 key |

Новый backend header отсутствует; exposed headers у старого API — X-Request-ID.
Это несовместимо с новыми filtered reads/report, требующими API 0.8.0 и
`X-Qadam-API-Version: 0.8.0`. Ошибку нельзя маскировать Demo-данными.

Stage 4 ранее измерил 43.218 с → 0.385 с; новые 522/timeout не подменены этим
старым успехом. Cold start возможен: Free service засыпает после 15 минут простоя
и обычно просыпается около минуты. Но **причина 522/startup не доказана** без
логов и настроек владельца. [Render Free](https://render.com/docs/free).

`/health` проверяет процесс, а не SQL/JWKS. Успех `/venues` доказывает один public
DB-read, JWKS — доступность публичного ключа; ни один не доказывает login/refresh,
Membership, private ledger или hosted Alembic revision. Настоящей Auth-сессии
не было. Render logs недоступны текущему агенту; запросить у owner timestamps,
startup error category и request IDs без credentials/SQL-параметров.

## Что реально задано в репозитории

`render.yaml`: Free/Singapore, branch `deploy/permanent-062`, auto-deploy off,
root `apps/api`, Python 3.12.12, `uv sync --locked --no-dev`, старт через
`deploy_start.py`, health `/api/v1/health`. Это **не доказательство фактических
Dashboard settings или deployed SHA**. Ничего в этом файле Stage 5 не меняет.

`deploy_start.py` не мигрирует/не seed-ит. Он требует DATABASE_URL, точные CORS
origins, Storage key/bucket и provider key/model даже при ASSISTANT_ENABLED=false.
Без AI credentials такой entrypoint не стартует. Для financial-only staging owner
должен отдельно согласовать поддерживаемый AI-disabled startup вариант/исправление
с backend владельцем. Не подставлять фиктивный ключ, не включать провайдера и
не запускать платный тест ради прохождения этой проверки.

DB connection timeout — 5 с; JWKS timeout — 5 с. Эти ограничения не отменяют
долгий wake/startup хостинга. Проверять процесс и зависимости раздельно.

## Изоляция и параметры, которые утверждает владелец

Использовать отдельную staging PostgreSQL и отдельный тестовый Supabase Auth
project, HTTPS frontend и backend. Не переиспользовать production DSN, tenants,
Auth аккаунты или приватный Storage bucket; не копировать реальных клиентов.
Ресурсы/бюджет/region выбирает owner. В этой задаче они не создаются.

| Компонент | Конфигурация / проверка |
| --- | --- |
| Frontend | VITE_API_BASE_URL = утверждённый HTTPS API `/api/v1`; VITE_SUPABASE_URL и publishable key именно staging Auth; никаких server secrets |
| Backend | отдельный DATABASE_URL с TLS; SUPABASE_URL staging; JWT_ISSUER = этот URL + `/auth/v1`; JWT_AUDIENCE = authenticated |
| JWKS | выводится из SUPABASE_URL, принимает ES256/RS256; нельзя использовать token-supplied jku/x5u |
| CORS | ALLOWED_ORIGINS — точные HTTPS origins, без wildcard; Authorization/Idempotency-Key allowed, version/Retry-After/request ID exposed |
| Storage | если проверяется livestock: отдельный private bucket и server-only service key; проверить grant/policies с owner |
| AI | по умолчанию без внешних вызовов/fallback; активация/аккаунт/лимит/синтетические данные — отдельное разрешение |
| Frontend flags | согласовать VITE_ASSISTANT_ENABLED; build:hosted фиксирует VITE_CUSTOMER_IDS_ENABLED=true; оба должны соответствовать API |

**Registration blocker:** `auth-callback-config.ts` фиксирует production URL
`https://qadamx-taraz.pages.dev/auth/callback`; production bundle отклоняет другой
origin. Произвольный VITE callback не исправляет это — Vite подставляет константу.
На отдельном staging сначала возможен password login заранее созданных тестовых
аккаунтов; полноценная signup/email приёмка **Blocked** до отдельно reviewed
точного staging callback/allowlist решения. Не менять production URL, не добавлять
wildcard и не направлять staging email пользователя в production.

## Migration checklist (ничего не запущено на hosted)

- [ ] Owner записывает hostname/project/ref/database/user **без пароля**, точные
  application SHA и `alembic current` из выбранного staging. Проверяет, что это
  не production, и сравнивает с `alembic heads` текущего кандидата.
- [ ] Проверенный стек имеет один head `0008_canonical_markets`, новых migrations
  относительно main нет. Если staging уже 0008 — migration не нужна.
- [ ] Для новой пустой базы owner отдельно разрешает existing upgrades 0001–0008;
  сначала посмотреть полный SQL/изменения, включая canonical markets/data changes.
- [ ] Если revision расходится или в схеме есть неизвестные изменения — остановка,
  сравнение DBA, backup и новая точная заявка; не `stamp head` ради совпадения.
- [ ] После разрешённой миграции проверить revision, constraints, indexes,
  права на schema qadam и policy/private Storage. Backend Membership обязателен.
- [ ] В исходных migrations qadam закрыт для PUBLIC/anon/authenticated; browser
  не обращается к финансовым таблицам через Supabase Data API. Не выдавать это
  за доказанную текущую конфигурацию RLS hosted-проекта.
- [ ] Синтетические owners A/B привязаны к настоящим subjects staging Auth;
  создание test memberships/магазинов — только в этой базе после разрешения.

Очищающие pytest fixtures используют **третью, disposable local/CI *_test БД**,
а не persistent staging и никогда production. Они выполняют TRUNCATE/downgrade
по своему контракту; запуск на hosted запрещён. Не импортировать 0009/0010 из
других веток и не переносить реальные данные для теста.

## Backup checklist до разрешённых изменений

- [ ] DB owner определяет backup scope, timestamp, source revision и recovery point;
  сохраняет consistent logical dump/подходящий платформенный backup, роли/grants,
  schema/data и список применённых миграций. Секреты передаются приватно.
- [ ] Backup хранится зашифрованно вне Git и вне общедоступных CI artifacts;
  проверены размер, checksum, доступ владельца и срок хранения.
- [ ] Restore rehearsal — только новая disposable БД после отдельного разрешения;
  сравнить schema/revision, counts, денежные invariants и UI/API totals.
- [ ] Auth settings/users и Storage objects имеют отдельный согласованный план.
  SQL backup не восстанавливает удалённые Storage files.
- [ ] Проверить доступность backup по фактическому плану. Для Free не предполагать
  автоматические daily backups: Supabase рекомендует регулярные экспорты.
  [Официальные ограничения backup](https://supabase.com/docs/guides/platform/backups).

## Staging acceptance — пока NOT RUN

Перед первым запросом записать frontend/backend SHA, API/header, migration,
URL/origin, timezone, test business ID и нулевые стартовые totals из полного API.
Результаты: PASS/FAIL/BLOCKED, request ID, screenshot без PII, browser/device.

| Проверка | Критерий |
| --- | --- |
| Cold/warm readiness | health и DB-backed API измерены отдельно; timeout заканчивается понятным Retry, нет бесконечной загрузки |
| Auth | настоящий login/reload/logout/refresh/expired token, wrong password, новый/no-membership user; A→B→A не использует старые ответы |
| Isolation | B не читает/меняет A по известным IDs, customer/operation/cursor; неверный issuer/JWT отвергается |
| Finance | sale 3000/1000 → repayment 500 → reversal 500 → paid sale 1200; **4200/2200/2000 ₸**, четыре строки, UI/API/SQL совпадают |
| Idempotency | double click/same key same body = тот же ID; changed body = 409; потеря ответа не вызывает новый key или auto POST |
| Concurrency/rollback | только в disposable approved fixture: конкурентные доплаты не дают отрицательный долг, отказ не оставляет частичных записей |
| Business reads | customer purchase/payment/reversal history; date/customer/amount/type/payment-status/calendar-age filters; нет выдуманной просрочки |
| Reports | полные period totals/остатки, не сумма страницы; opening/closing balances; CSV formula protection, реальный print preview |
| Version gate | API 0.8.0 + exposed header; отсутствующий/старый header показывает RU/KZ ошибку, не неправильные строки |
| Failure fallback | AI disabled/provider error/429 оставляет ручной ввод; labelled server-fact fallback не объявлен живым AI |
| UI/device | RU/KZ, 360/390/768/1440; physical Safari/Chrome mic allow/deny/stop/cancel/playback, ручной ввод |
| Public regressions | витрина, inquiry, Analytics и Summary; никаких неожиданных запросов в production |

Деструктивную fault injection и concurrency fixtures выполнять только на одноразовом
локальном/CI окружении; не выключать общие Supabase/DB ради теста. Live AI —
отдельный owner consent, разрешённый ключ, synthetic-only данные, бюджет и request
count. Не считать mock, generated silence или desktop WebKit физическим тестом.

## Rollback и мониторинг

До выпуска owner сохраняет известные хорошие frontend/backend artifacts/SHA,
config-version без значений секретов, backup и доступный способ rollback.
При несовместимости остановить дальнейший rollout, сохранить request IDs,
откатить frontend к совместимому artifact, затем при необходимости backend.
Не повторять pending POST с новым ключом. Не удалять/пересчитывать ledger,
не откатывать базу поверх новых продаж. В этом стеке нет новой schema, поэтому
application rollback не требует downgrade; неизвестный schema drift — к DBA.

Наблюдать раздельно: process health; public DB read; авторизованный `/me`/read
с отдельным test account; JWKS/login health; version/header; latency/status
401/403/404/409/429/500/503/522. 401 без токена — ожидаемая защита, не outage.
В логах только request IDs, error categories и timings; без JWT, DSN, аудио/PII.
Render HTTP health success требует ответ в пределах пяти секунд; нынешний
process-only endpoint не подтверждает readiness зависимостей.
[Health semantics](https://render.com/docs/health-checks).
Не создавать keepalive для обхода Free idle policy и не менять тариф автоматически.

## Production gates и точное решение владельца

- [ ] Принять CI bootstrap/baseline-format repair, required checks и reviews.
- [ ] Отдельно разрешить каждый merge #104 → #105 → #106 → #107 с merge commits.
- [ ] Назначить изолированные staging URL/Auth/DB, approved subjects A/B и запись
  только synthetic finance; решить callback и AI-disabled startup blockers.
- [ ] После backup/revision review отдельно разрешить только необходимые
  migrations staging и deployment согласованной API/frontend пары.
- [ ] Получить фактический PASS staging, physical devices, Auth/email scope;
  принять/исправить security findings и известные warnings.
- [ ] Назначить monitoring/rollback owner и окно релиза; отдельно разрешить
  production deployment. Никакой GO на основании одного health или Vercel build.

На момент этого отчёта: **staging acceptance NO-GO / не выполнена; production NO-GO**.
CI и локальный demo не снимают перечисленные ограничения.
