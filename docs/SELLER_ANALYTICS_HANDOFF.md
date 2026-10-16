# Seller Analytics — передача

## База и границы

Капитан согласовал `origin/integration/local-combined-check`, опубликованный Draft PR #13. Начальная база2089e44 содержала только Markdown-контракт; во время разработки капитан опубликовал Analytics API0.6.0/cd655e9. Неопубликованная frontend-ветка безопасно обновлена до актуальной базы **58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76**: свои изменения сохранены в stash4798661 и возвращены после fast-forward rebase; конфликт DECISIONS разрешён вручную с сохранением обеих секций. Analytics разрабатывается в отдельном worktree `work/qadam-seller-analytics`, исключительно в `feature/seller-analytics`. Новый Draft PR направляется в `integration/local-combined-check`; merge, force push, изменения main и чужих веток запрещены.

В базе уже находятся дизайн PR #11 и собственные исправления QA-001/003. PR #14 повторно не объединялся. Сравнение показало полезные отличия PR #14: защита завершения старого logout и дополнительная проверка identity перед getSession; общая валидация клиентского ввода с доступными RU/KZ ошибками; дополнительные тесты logout/token/Unicode. Эти изменения не переносятся в Analytics автоматически. Core epoch guards позднего 401 A→B→A и code-point parsing сохранены из combined. QA-002 уже исправлен капитаном в базе; Analytics его не меняет.

Не изменять backend, миграции, SQL/финансовые формулы, AI-протокол, OpenAPI/generated.ts, зависимости, public/ledger/voice/summary/mobile-модули или существующие screenshot assets. Общая Supabase и Storage этой задачей не затрагиваются.

## Контракт и режимы

Источник — опубликованные капитаном [ANALYTICS_API.md](../packages/contracts/ANALYTICS_API.md), [OpenAPI0.6.0](../packages/contracts/openapi.json), generated.ts и [три полных примера](../packages/contracts/analytics-examples.json). GET `/api/v1/businesses/{id}/analytics?days=7|30` требует Bearer и membership. Backend, OpenAPI и generated.ts получены из утверждённой базы, не редактировались frontend-задачей.

Live adapter использует generated schema/operation aliases, общий auth-aware API client, runtime validation, AbortSignal и ручной retry. Валидация отвергает чужую точку/период, небезопасные числа, неверные даты/размеры/порядок; проверка согласованности supplied snapshot не заменяет серверные агрегаты. UTC as_of поддерживает Z/+00:00. При отсутствии публичного API URL показано ожидание конфигурации; ошибки API не включают Demo. Только явный вход в существующий Demo включает отдельный синтетический adapter: без HTTP и записей, даты/as_of зафиксированы и подписаны как учебные. UI не создаёт фиктивные серверные ответы. HTTP fixtures используются только автоматическими тестами и не являются живой приёмкой.

Карточки показывают supplied snapshot values: действующие продажи, поступления (включая погашение прежних долгов/отрицательные отмены), средний чек/null и текущий долг/число должников по всем датам. Не рассчитывать их из operations/summary. Продажи ретроспективно исключают отменённые чеки; поступления учитывают движения дня. Это не прибыль/посещаемость/прогноз/рост.

## Архитектура

Единственный маршрут `/seller/analytics` добавлен в существующий App/SellerLayout и меню. Выбор разрешённой точки остаётся через BusinessProvider и `/me`; произвольный URL businessId не подтверждает доступ.

Новый модуль `apps/web/src/features/seller/analytics`: `model.ts` (generated aliases/runtime validation), `live.ts` (подтверждённый typed GET), `demo.ts` (явный adapter), `queries.ts` (scope/business/period/source + AbortSignal без previousData), `AnalyticsPage.tsx`, `Charts.tsx`, `analytics.css`. Общие Qadam tokens/Manrope/UI/formatKZT и RU/KZ сохранены. Существующие денежные mutations уже инвалидируют `[scope,business.id]`, поэтому обновляют и Analytics; financial source не менялся. Аналитика не подключает денежные mutations и не подменяет summary.

Графики и native tables дают точные значения по касанию/фокусу/клавиатуре. Дни включают нули; сегодня неполный. Часы 00–23 отражают регистрацию действующих продаж, не посещаемость. Даты/зона согласованы с snapshot (`Asia/Almaty`), не с часовым поясом компьютера. Поддержаны 7/30 дней, signed receipts, empty/null, loading/error/retry и reduced motion.

## Проверки и запуск

Из корня отдельного worktree:

```powershell
cd apps/web
npm ci
npm run dev -- --port 5181 --strictPort
# Открыть http://127.0.0.1:5181/login → Посмотреть демо → Аналитика.
npm run check:api
npm run typecheck
npm run lint
npm test -- --no-file-parallelism
npm run build
npm run format:check
npm run test:e2e -- --config e2e/analytics.playwright.config.ts
npm run test:e2e -- --config e2e/qa.playwright.config.ts
```

Для Live настройте только игнорируемый `apps/web/.env.local`: VITE_API_BASE_URL с `/api/v1`, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY; сервер должен разрешать точный origin в CORS. Учебный аккаунт получать через защищённый канал капитана. API клиент остаётся общим, токены не записываются в Git/документы.

Analytics E2E использует отдельный 4181 и синтетические публичные настройки, `reuseExistingServer=false`. QA regression — отдельный 4175. Живые настройки/пароли/токены не нужны и не публикуются. Старые screenshot writers запускаются проверкой; сгенерированные изменения прежних PNG не включаются в Analytics diff.

В этой Windows-среде полный unit-прогон выполняется без file parallelism: при одновременной работе двух Chromium suites и Vitest старое ожидание загрузки QA-001 (1 секунда) и длинный новый UI-сценарий (5 секунд) превышали свои таймауты. Ожидания/timeout старых regression tests не менялись. Чужие результаты live acceptance не являются проверками этой задачи.

Новые [настоящие screenshots](screenshots/seller-analytics/README.md) включают desktop/mobile 7/30 дней, empty и локальный Demo error. У мобильного графика сохраняется видимость выбранного дня/часа после смены ширины: локальный ResizeObserver меняет только scrollLeft графика, не прокручивает документ. Keyboard, table, null average, zero days/hours, negative receipts и frozen clock проверяются отдельно.

### Собственные итоговые результаты

- `npm ci --prefer-offline --no-audit --no-fund`:357 packages, lock без изменений.
- `npm test -- --no-file-parallelism`: **207/207**,14 файлов; новые48 data/contract tests и17 UI tests. Включён actual-client late Analytics401 A→B→A, fresh cache/session сохранены.
- `npm run typecheck`, `lint` (0 warnings), `build`, `check:api`, `format:check`, `git diff --check`: PASS. OpenAPI/generated побайтово соответствуют базе0.6.0. Build сохраняет прежний большой3D chunk и empty auth chunk без публичного env.
- `npm run test:e2e -- --config e2e/analytics.playwright.config.ts`: **24/24**,15 прежних +9 Analytics, retries0. Полный стандартный набор, включая screenshot writers, сохранён. Новые Live contract fixtures проверяют Bearer7/30, разрешённые точки/аккаунты,503/manual retry/no Demo fallback. Demo — ноль API/денежных writes.
- `npm run test:e2e -- --config e2e/qa.playwright.config.ts`: **21/21**, existing synthetic QA;8 seller tests пересекаются со стандартным набором, не считать45 уникальными E2E.
- 360/390/768/1440 без viewport overflow,44px chart targets, стрелки/Home/End, таблицы/headers/focus, RU/KZ, reduced motion и resize desktop→mobile: PASS. Семь новых PNG просмотрены, прежние screenshots восстановлены после writers и отсутствуют в diff.
- Сравнение protected paths с58d4eb4: backend/контракты/generated/Auth/runtime/customer/financial/public/mobile/dependencies без изменений. Read-only HTTP8018 unavailable; live DB результаты капитана не засчитаны.

### Изменённые файлы

Только apps/web/src/app/{App,layout}.tsx, features/seller/index.ts; семь новых файлов features/seller/analytics/{model,demo,live,queries}.ts, AnalyticsPage.tsx, Charts.tsx, analytics.css; shared/i18n/{ru,kk}.ts; src/test/analytics-{data,ui}.test.tsx; e2e/analytics.spec.ts и analytics.playwright.config.ts. Документация: этот файл, handoffs/seller-web.md, добавление DECISIONS, screenshots/seller-analytics/README.md и7PNG. Всего27 путей; backend, OpenAPI0.6/generated и финансовые модули не входят в Analytics diff.

### Commits

Demo/validation: **484eb487e67e9092af303b7675e339cfcde508ba**. Live adapter/query: **c6e80b50c5d8796b28cd8fd3431b719351a1a312**. UI/navigation/RU-KZ: **ca948ea1dc9b48674aa60901d7451ec1edb4df46**. Следующий отдельный commit сохраняет проверенные tests/screenshots/handoff; публикация и новый Draft PR фиксируются после успешного push. Текущий полный HEAD всегда получать `git log -1 --format=%H`.

## Ограничения и следующий шаг

- Реализация/контракт0.6 уже подключены. Для собственной живой приёмки нужен достижимый API URL, его CORS и учебный Supabase аккаунт с membership через защищённый канал. Read-only попытки health/Analytics без JWT на127.0.0.1:8018 в этой среде получили connection unavailable; настоящий HTTP/JWT/БД нами не подтверждён. Серверные env/секреты в чат/Git не нужны.
- Demo и все автоматизированные Live API/SDK ответы синтетические. Проверены реальный клиент/headers/path/validation/cache/401 callbacks, но это не доказательство живой БД/UTC-полуночи/CORS/JWKS. Отдельные результаты капитана не присваиваются frontend-сессии.
- QA-G01: у customer POST в базе нет собственного deadline; неизвестный результат нельзя безопасно автоматически повторять. Это отдельная задача, здесь не исправляется.
- Физический телефон/микрофон/аудио/performance остаются отдельной приёмкой; Chromium viewport/reduced-motion не заменяют её.
- Полные дополнительные защиты/тесты PR #14 требуют отдельного review капитана; повторный merge не выполнен.

Точный текущий commit: `git log -1 --format=%H`; ветка: `feature/seller-analytics`. Незавершённый этап нельзя считать опубликованным до успешного push и проверки remote HEAD.
