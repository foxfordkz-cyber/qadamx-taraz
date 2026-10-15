# SELLER FRONTEND — актуальная передача следующему Codex

Срез: 2026-10-15. Repository: https://github.com/foxfordkz-cyber/qadamx-taraz.
Ветка: **feature/seller-dashboard**. [Существующий PR #3](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3) — open/Draft; не переводить в Ready и не merge в main без согласования.

## Главное ограничение этой сессии

**НЕ выполнять merge backend/ledger-auth.** Кандидат `193f6e527d716549d759d805dc4b86db1d9e059e` изучен, но капитан ещё не подтвердил готовность; пользователь прямо запретил его интеграцию до отдельного согласования. Не считать non-Draft PR #4 разрешением на включение. Новые /me и customers не активированы.

Принят только согласованный `origin/main` **ced32e7aa8e737a0cbc5318715ad02bdc98a89d4** (bootstrap). README/DECISIONS объединены вручную с сохранением обеих частей. `git diff ced32e7 -- apps/api packages/contracts` пуст: backend капитана и экспорт не редактировались. `git merge-base --is-ancestor 193f6e5 HEAD` возвращает 1: кандидат не включён.

## Контрольные точки и Git

- `ee6d86f`: общая frontend-основа, typecheck, push успешен.
- `ec8763e`: router/layout/read-only Demo Mode, build/lint, push успешен.
- `c17efe9`: первоначальные 36 unit/component + 5 E2E, документация и screenshots, push успешен.
- `e1839de`: PR #3 и metadata, push успешен.
- `e05c1a107041113bc32d870f58c73f4b22b268d1`: фильтр заявок и debounce поиска; 41 unit/component + 6 E2E; fetch/pull --ff-only feature-ветки и push успешны.
- `3b03ed3fe74188d848693891fb6132515cb29627`: согласованный merge main ced32e7; повтор 41 unit/component + 6 E2E, typecheck/lint/build; fetch/pull/push успешны.
- `7e3d2abb08644ca9ee21f86a2dd8b02a51525bcc`: типы bootstrap, стандартные ошибки и план интеграции; 52 unit/component + 6 E2E, typecheck/lint/build/check:api прошли. Последующие fetch/pull --ff-only feature-ветки и push успешны; git ls-remote подтвердил этот hash. Последняя запись после реализации содержит только метаданные; точный HEAD — `git log -1 --format=%H` (собственный hash нельзя включить внутрь того же коммита).

Перед каждым заданием: проверить branch/status, fetch, при чистом дереве `git pull --ff-only origin feature/seller-dashboard`. После этапа: проверки, add только своих файлов, commit, fetch, pull --ff-only feature-ветки, push. Если история разошлась, не force/reset/rebase автоматически. Pull feature не принимает main или другие ветки. Последний fetch перед подготовкой этого этапа не выявил чужих новых commits в feature.

## Реализовано

Одно React 19 / TypeScript / Vite приложение, React Router, TanStack Query, Supabase AuthProvider. Кабинет с выбранной разрешённой точкой, RU/KZ, выход, sidebar и мобильная нижняя навигация. Цвета по ТЗ, действия от 44 px, focus-visible, reduced-motion, native dialog с Escape и возвратом фокуса.

UI-kit: Button, Input, Select, Card, Dialog, Alert, Spinner, EmptyState, Badge, PageHeader, ErrorState, ErrorMessage. KZT formatter принимает целые тиыны; дробные тиыны не теряются, даты Asia/Almaty.

Заявки: сортировка по новизне, карточки, контакт, дата, new/in_progress/closed, ожидание API при сохранении, refetch при возвращении на вкладку. Новый локальный фильтр по статусу сохраняется по identity/точке и при смене языка; при пагинации явно указано, что фильтруются загруженные страницы. Выдуманных status-параметров API нет.

Клиенты: список, поиск по имени, отдельные одноимённые UUID, заметки, необязательный контакт, форма, переход к долгам. Shared CustomerPicker/CreateCustomerForm/useCustomers/useCreateCustomer для участника 4. Поиск ждёт 250 ms, нормализует trim/NFC, отменяет таймер, скрывает старые результаты во время ожидания и позволяет очистить строку. `useCustomers` дополнительно возвращает isSearchPending.

Каталог: карточки с наличием/ценой/нет цены, Demo labels, loading/error/empty. CRUD без backend нет.

Auth: signInWithPassword, INITIAL_SESSION/session restore, refresh subscription, unsubscribe, local signOut. При смене identity/выходе queries отменяются, QueryClient очищается, keys содержат scope+business UUID. Старые callbacks не затрагивают нового пользователя. Несекретные черновики в памяти переживают смену языка/ошибку/переходы, удаляются при logout/смене identity. Backend остаётся источником permissions.

## Архитектура и новые файлы

```text
apps/web/src/app/              auth, query, runtime, layout, App, pages, modules
apps/web/src/shared/ui/        общий UI-kit
apps/web/src/shared/i18n/      provider, ru/kk
apps/web/src/shared/api/       client, errors, generated, gateway, bindings, models
apps/web/src/shared/demo/      отдельные read-only fixtures
apps/web/src/shared/           format, styles, useDebouncedValue
apps/web/src/features/seller/  Inquiries, Customers, Catalog, queries, exports
apps/web/src/test/             5 test-файлов + setup
apps/web/e2e/seller.spec.ts     6 browser scenarios
apps/web/scripts/generate-api.mjs
```

В продолжении изменены features/seller, API client/errors/UI, словари, CSS, тесты, package/lock, eslint, README и документы своей роли. Добавлены генератор, generated.ts, useDebouncedValue/debounce tests, errors tests и `docs/SELLER_BACKEND_INTEGRATION_PLAN.md`. Чужих frontend-модулей нет; их логика не создавалась. Backend/scripts/migrations/экспорт после принятого main не менялись.

## Маршруты и модули

- `/login`, `/seller`, `/seller/inquiries`, `/seller/customers`, `/seller/catalog` — собственные экраны.
- `/seller/sale`, `/seller/debts`, `/seller/history`, `/seller/summary` — честное ожидание участника 4.
- `/`, `/venues/:slug`, `/shops/:slug` — ожидание публичных страниц участника 2.
- Экспорты страниц подключаются в `app/modules.ts`; public вне auth guard, seller внутри BusinessProvider. Общий auth-aware client — useRuntime().api, QueryClient уже предоставлен.

## Принятый API и контракты

В принятом main реально реализованы только GET `/health` и `/api/v1/health`, Swagger/OpenAPI. Health проверяет процесс, не Supabase/БД. В этой frontend-сессии живой API не запускался и не проверялся. `/me`, GET/POST customers, inquiries и shop/catalog в принятом bootstrap отсутствуют.

`packages/contracts/openapi.json` содержит health paths и компоненты первого этапа. `npm run generate:api` создаёт `src/shared/api/generated.ts`; `npm run check:api` сравнивает экспорт и types. Типы не объявляют отсутствующие endpoints работающими. Generator использует openapi-typescript как dev-only dependency.

`shared/api/errors.ts` проверяет опубликованную ErrorResponse: code, поля с кодами ошибок и UUID request_id/header. Сырые server messages/traceback не показываются. HTTP 401/403/404/409/422/429/500 локализуются; request_id можно передать поддержке. Transport использует Bearer/AbortSignal, запрещает внешние URL и redirects с токеном. `ApiError` по-прежнему экспортирован из client.ts, дополнительно имеет metadata.

`bindings.ts` намеренно пуст. Типы models.ts — frontend views по документации, а не новый wire contract. Backend ошибки не включают demo автоматически. `/me` и customers готовить только после подтверждения кандидата/принятия схем. Подробный разбор схем кандидата, is_demo/balance_minor/contact, capabilities и тесты: [SELLER_BACKEND_INTEGRATION_PLAN.md](SELLER_BACKEND_INTEGRATION_PLAN.md).

## Demo Mode

Включается только кнопкой на /login, заметный banner на seller-экранах. Две учебные точки, одна пустая; заявки, товары, одноимённые клиенты. Только просмотр, можно проверить поля и выбор клиента; создание/статусы не сохраняются. Перезагрузка завершает demo; язык сохраняется. Учебные данные не являются живым backend или партнёрством с рынками.

## Проверки последнего этапа

Из apps/web:

- `npm run generate:api` — типы сгенерированы из принятого bootstrap.
- `npm run check:api` — types и OpenAPI совпадают.
- `npm run typecheck`, `npm run lint`, `npm run build` — успешно.
- `npm test` — **52 passed**, 5 файлов: транспорт/cache, auth, debounce, ErrorResponse, экраны. Примеры ошибок взяты из checked-in экспорта капитана; остальные ответы/сессии — явно тестовые gateways/clients.
- `npm run test:e2e` — **6 passed**, Chromium: все seller-маршруты 360/768/1440 без горизонтального overflow; фильтр и поиск RU/KZ, поля при смене языка, dialog Escape/focus, cache/logout/demo isolation. Browser script errors и backend traffic в demo отсутствуют в проверяемом сценарии.
- `git diff --check` — успешно. Backend/export сравниваются с ced32e7; кандидат 193f6e5 не включён.

Первый lint нового генератора обнаружил, что config не включает globals для .mjs; исправлен glob, полный прогон повторён. Результаты капитана о PostgreSQL/JWT/Supabase не считаются нашей проверкой. Настоящие JWT/JWKS, серверная изоляция, CORS, browser login, записи после reload в БД и денежный модуль не проверены: в этой копии нет предоставленной конфигурации/учётных записей. Backend-тесты в общей БД не запускались.

## Команды запуска и продолжения

```powershell
git clone --branch feature/seller-dashboard https://github.com/foxfordkz-cyber/qadamx-taraz.git
cd qadamx-taraz
git status
git branch --show-current
cd apps/web
npm ci
npm run dev
# /login -> Посмотреть демо; env для демо не нужен
npm run check:api
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Node 22.12+ или 24, npm. Для изменения принятого контракта после согласования: regenerate types и check. Для live-конфигурации — только игнорируемый `.env.local` из `.env.example`: `VITE_API_BASE_URL` с /api/v1, `VITE_SUPABASE_URL`, публичный `VITE_SUPABASE_PUBLISHABLE_KEY`. Серверные ключи/пароли/токены не сохранять в frontend/Git.

## Что осталось / следующий шаг

1. Получить явное подтверждение капитана готовности 193f6e5 и отдельно согласовать интеграцию. До этого не merge backend/ledger-auth и не активировать её методы.
2. После разрешения сверить HEAD, принять backend без правок, regenerate types, runtime mappings /me и customers, раздельные write capabilities. Выполнить тесты из integration plan.
3. Получить API origin, публичную Supabase-конфигурацию и тестовые аккаунты безопасным способом. Уточнить CORS: 127.0.0.1 и localhost — разные origins.
4. Дождаться реальных методов заявок/каталога и exports участников 2/4. Не дублировать денежные формы/3D.
5. Публичный deploy — отдельный шаг, сейчас ссылки на опубликованный сайт нет. Нужны SPA fallback, HTTPS и точный CORS.

PR #3 обновляется в этой же ветке. Новые PR для этапов не создавать. Последнее проверенное состояние после merge main: open, Draft, mergeable=true; review/comments и CI workflow runs отсутствовали. Финальный push/hash проверяются командой git ls-remote и сообщаются в отчёте сессии. Этот файл и integration plan достаточны для продолжения с другого аккаунта без истории чата.
