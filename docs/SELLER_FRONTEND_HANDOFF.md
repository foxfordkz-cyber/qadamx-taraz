# Seller frontend — передача следующему Codex

Обновлено 2026-10-16. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz. Работать только в `feature/seller-dashboard`. Draft PR: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3. Не merge в main, не force push. Секреты и локальные `.env*` не коммить.

## Этап D — дизайн публичной витрины + Polaris, 2026-10-16

Последний опубликованный seller HEAD перед этапом D: `b3d03285b5661b9652e3c5b57e5ab1ce11eae5ab`. Исходное дерево чистое; адресный fetch/pull feature-ветки — Already up to date. Общий fetch вновь задержался на чужих Git objects и был прерван; reset/force/автоматических конфликтов не было. Никакие новые main/backend/public/ledger commits не объединялись.

Визуальная основа — настоящая `feature/public-storefront` на **8818e8b73ecc2e2dd2f517f18796782b10d1872f**: Manrope, paper #F5F3EB, ink #172A26, green #164C3E/#103B31, lime #D7F36A, orange #F0A94B, white #FFFEFA, line #E1E2D8, ступенчатый знак qadam. Ветка изучена read-only. Новый запрос заменяет прежнюю красную тему B актуальной общей темой; CSS/код чужого frontend не импортированы. `shared/tokens.css` — один источник palette/radius/font/spacing с сохранёнными --bg/--text/--primary aliases. Muted затемнён до #58685F для контраста.

Реализованы зелёный Dashboard с lime CTA, desktop/mobile список клиентов, обновлённые карточки заявок/каталога. Каталог получил локальные search/availability/count/no-results/reset только по loaded items; gateway и query params не менялись. На mobile вместо верхних повторных разделов — нижняя панель и «Ещё» с Dialog всех старых маршрутов. Escape/focus restore и доступ к публичной витрине сохранены. Дубликат «Демо» в названии точки устранён; общий явный read-only Demo notice остаётся. В заявках убран повторный Demo callout, live CONTRACT_PENDING сохранён.

Локально включены Manrope variable и два официальных Noto Sans WOFF2 fallback subset для десяти отсутствующих Kazakh glyphs; все файлы неизменённые, OFL/source/hash в `apps/web/public/fonts/README.md`. Runtime Google Fonts requests не нужны. Browser проверяет загрузку Manrope и двух fallback faces для ӘҒҚҢҰ; KZ 360 screenshot проверен визуально. Для hero добавлен заметный lime keyboard outline, для sticky header — scroll-margin у skip target, touch targets nav/RU/KZ не меньше44×44.

Проверки финальной версии D: **typecheck/lint/build/check:api/format:check passed; 74 unit/component (6 файлов), 9 Chromium E2E passed**. Проверены 360/390/768/1440, прежние маршруты/Auth/cache/isolation/CustomerPicker, локальная фильтрация без повторного gateway call, RU/KZ с сохранением полей, меню и focus, отсутствие overflow. Проверки выполнены здесь, не приписаны капитану. Chromium требует разрешённого loopback в Codex sandbox. Небольшая ошибка типов в новых test options и форматирование исправлены до финального прогона.

Получены и визуально просмотрены **10 новых реальных browser screenshots**: Dashboard/Customers/Inquiries/Catalog desktop1440 и mobile390, Dashboard768 и Catalog KZ360. После визуальной проверки уплотнены mobile header/filter и product placeholder; финальный E2E повторён. Все кадры показывают Demo; живой browser login/DB/CORS ими не подтверждаются. [Источники, контраст и галерея](SELLER_DESIGN_NOTES.md).

Изменённые файлы D: app/layout/pages, features/seller/{Catalog,Customers,Inquiries}, shared/{tokens,merchant,styles}.css, shared/ui/{Brand,Icon}, shared/i18n/{ru,kk}, main import, local public/fonts, src/test/screens.test.tsx, e2e/{seller,screenshots}.spec.ts и собственная документация/screenshots. **Не менялись** apps/api, packages/contracts, shared/api, auth/runtime/query, CustomerPicker exports, чужие features/explore/inquiry/ledger/voice/summary. Supabase env остаётся игнорируемым. Backend 193f6e5 и согласованный OpenAPI 2d2fc56 остаются как в этапе C. Новых backend или AI функций нет; live acceptance и модули других участников ожидаются по прежнему плану ниже.

## Завершённые этапы и Git

- Ранее согласованный main `ced32e7` принят merge-коммитом `3b03ed3fe74188d848693891fb6132515cb29627`.
- Этап A опубликован: `246851b2d4df996f054c7b1a27b2ba2933d2b3ee` — одобренный backend и Supabase/customer bindings.
- Этап B опубликован: `e8321f0cb5c7056d284c831d4e6ae7b0293424ca` — merchant UI, поиск заявок, 6 новых screenshots. Последний опубликованный seller HEAD перед этапом C: `9b4156122e22f12839f9f69384cb79a43e90c730`. Точный текущий HEAD: `git log -1 --format=%H`.
- После A и B выполнены fetch, `pull --ff-only origin feature/seller-dashboard` (Already up to date), `push -u origin feature/seller-dashboard`; удалённый hash B совпал. Draft PR #3 обновлён и остаётся open/draft, merge не выполнялся.
- Код backend остаётся на одобренном `193f6e527d716549d759d805dc4b86db1d9e059e`, PR #4. По новому разрешению принят отдельно OpenAPI из `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`, без merge AI-ветки. Проверки из корня: `git diff 193f6e5 -- apps/api` и `git diff 2d2fc56 -- packages/contracts/openapi.json` должны быть пустыми. Examples/demo seed сохранены с 193f6e5, contract README дополнен provenance/инструкцией; код/миграции капитана не менялись.

## Этап C — обновление контракта AI-backend без активации AI

Последний проверенный commit контрактного этапа: **b9fd3b41998b2cd1ce904f15e558408e13e3f135**, опубликован в `feature/seller-dashboard`; remote hash совпал. Финальная запись передачи меняет только документацию, её HEAD: `git log -1 --format=%H`. Draft PR #3 обновлён, open/draft, merge не выполнен. Начальный полный fetch/pull прошёл; финальный общий fetch задержался на index-pack и был прерван без потери commit, адресные `git fetch origin feature/seller-dashboard` и `git pull --ff-only origin feature/seller-dashboard` прошли (Already up to date), `git push -u origin feature/seller-dashboard` успешен.

Источник проверен: `origin/backend/ai-drafts` на `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`. Blob OpenAPI `9a1ed34f189692d750161de4d4728f78159e83cd` точно совпадает с принятым файлом. API version 0.2.0 → 0.3.0; единственный добавленный path — POST `/api/v1/businesses/{id}/drafts`. Все прежние paths, 20 component schemas и HTTPBearer security семантически неизменны; перестановка CustomerCandidate/DraftResponse в JSON не является изменением схем. Все `$ref` внутренние и разрешаются. Дополнительных файлов, examples, dependencies или migration из AI-ветки не потребовалось.

Изменены `packages/contracts/openapi.json`, воспроизводимо сгенерированный `apps/web/src/shared/api/generated.ts`; объединены README и **docs/PROJECT_STATUS.md** (корневого PROJECT_STATUS.md в репозитории нет). Сохранены инструкции обеих частей, запуск, env, API, тестирование, ссылки на AI README/handoff с точным commit. Обновлены собственные handoff/integration/PR docs и запись DECISIONS. Auth, CustomerPicker, RU/KZ, UI, финансовая логика и dependencies не менялись.

AI gateway/hooks/UI/requests не добавлены. `generated.ts` отражает контракт без ручных исправлений. Известное ограничение openapi-typescript: multipart `oneOf`/`not` представлен как optional text/audio с `(unknown | unknown)`, поэтому тип не обеспечивает XOR и наличие одного источника. Перед отдельно согласованной AI-интеграцией потребуются runtime-проверки формы и работа с FormData по исходному OpenAPI. Нельзя считать наличие type готовой AI-функцией.

Локальный Python backend по-прежнему 193f6e5 и не может экспортировать новый HTTP drafts. **Не запускать его app.export_contracts поверх согласованного 0.3.0**. Для frontend: `npm run generate:api` / `npm run check:api` из apps/web. Backend export/pytest проверяет капитан в соответствующем AI checkout; его документация доступна по ссылкам README, целиком AI-ветка сюда не включена.

Капитан подтвердил live TypeScript-client smoke `/me`, customer create, sale, repayment, history и summary. Это его результат, здесь эти запросы не повторялись. Живой browser login/refresh, CORS, persistence с БД и AI UI остаются неподтверждёнными seller-сессией. Серверный env/пароли здесь не появились.

Собственные проверки C: `generate:api`, `check:api`, `typecheck`, `lint`, **71 unit/component (6 файлов)**, `build`, **8 Chromium E2E**, `format:check` — passed. Повторная генерация побайтово стабильна: SHA-256 generated.ts `910c864364104ce07942eb611d66f3a885d20ad719dd01e849597e2e4f130be1`. Browser-проверки включают 360/390/768/1440, RU/KZ, маршруты, формы, выбор клиентов и readonly Demo; исходники UI/Auth/CustomerPicker не менялись, 6 screenshots повторно получены без diff. Первый E2E запуск прерван из-за sandbox EACCES к loopback, повтор с разрешением на локальный сервер прошёл 8/8 за 25.5 s. Повторная проверка API health — ECONNREFUSED, apps/api/.env отсутствует; live-результат не заявлен.

## Что реализовано

Единый React 19 / TypeScript / Vite web, React Router, TanStack Query, Supabase AuthProvider, RU/kk, общий UI-kit. Polaris используется как UX-референс: собственный React/CSS, палитра Qadam, без дополнительных Shopify зависимостей. [Дизайн и 6 screenshots](SELLER_DESIGN_NOTES.md).

Supabase provider восстанавливает сессию SDK, получает актуальный token для запроса и очищает queries/drafts при выходе или смене identity. Runtime сравнивает `/me.id` с Supabase user. Торговые точки берутся только из `/me`, выбор проверяется по этому списку. Приватные query keys включают identity scope и business.id. Пароли/tokens не логируются и не попадают в drafts.

Активны только подтверждённые seller bindings:

| HTTP | Назначение | Проверка |
|---|---|---|
| GET `/api/v1/me` | UUID пользователя и разрешённые точки | OpenAPI fixtures, runtime validation, identity guard |
| GET `/api/v1/businesses/{businessId}/customers` | Поиск `q`, cursor, limit 50 | Mock transport, Bearer, pagination, business guard |
| POST `/api/v1/businesses/{businessId}/customers` | Создание и обновление списка | Mock transport, форма/CustomerPicker, ошибки |

`generated.ts` генерируется только из принятого `packages/contracts/openapi.json`. Runtime bindings проверяют UUID, owner role/default, nullable/default поля, лимиты строк, cursor, safe integer `balance_minor`. GET/POST отклоняют чужой business_id. Пустой контакт → null. Одинаковые имена не объединяются, UUID и заметка видны. Остаток берётся с сервера без расчётов. Membership не содержит is_demo: не выводить его из slug/name/UUID.

`canCreateCustomer` и `canUpdateInquiry` разделены; старый `canWrite` сохранён консервативным для совместимости. CustomerPicker и create form используют отдельную возможность создания. После ответа POST список инвалидируется в том же identity/business scope; успешный результат до ответа API не показывается.

Dashboard: выбранная точка, один основной CTA, четыре главных действия, дополнительные разделы. Клиенты: desktop список / mobile карточки, debounce 250 ms, note/UUID, полезное empty state. Заявки: локальный поиск по загруженным имени/контакту/тексту и статусный фильтр. Каталог: цена/отсутствие цены, наличие, явные учебные данные. Loading/error/empty, RU/KZ, focus/Escape, формы при смене языка сохранены.

## Demo и ограничения live

Demo включается только явно на `/login`, использует fixtures и запрещает writes. Ошибка live не переключает в Demo. При reload Demo заканчивается; сессия live сохраняется SDK.

HTTP API заявок и публичного каталога отсутствуют в одобренном snapshot. Bindings для них не активированы, live-запросов нет. Изменение статуса недоступно. Скриншоты и browser E2E используют Demo, не Supabase/PostgreSQL.

Публичные URL и publishable key капитана сохранены только в игнорируемом `apps/web/.env.local`. Имена совпадают с `.env.example`: VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Новому аккаунту потребуется восстановить этот локальный файл безопасным способом; ключ/пароли в Git не переносить.

Нет `apps/api/.env`, PostgreSQL credentials и паролей тестовых владельцев. Проба `http://127.0.0.1:8000/api/v1/health` дала ECONNREFUSED. Поэтому реальные login/refresh, JWT/JWKS, сохранение/перезагрузка с БД, 6/3 memberships, межпользовательский доступ и CORS остаются НЕ проверенными. Контрактные и auth test-client проверки не заменяют их. Backend handoff капитана не является результатом наших live-проверок.

## Архитектура и изменённые файлы

- `apps/web/src/app/{runtime,layout,pages}.tsx`: identity/business providers, shell, dashboard. `app/modules.ts`: точки подключения авторов public/ledger.
- `shared/api/{generated,models,bindings,gateway,client}`: wire types, frontend views, runtime readers, capabilities, transport/reauth. `shared/api/errors.ts`: безопасные коды и request_id без сырых сообщений.
- `features/seller/{Customers,Inquiries}.tsx`, queries/hooks: форма, CustomerPicker, debounce, query invalidation, локальный поиск заявок. Exports сохранены.
- `shared/merchant.css` + import в main.tsx: адаптация общей дизайн-системы; RU/kk labels в `shared/i18n`.
- `vite.config.ts`: отдельный auth chunk; `src/test/{bindings,errors}.test.ts`, `src/test/screens.test.tsx`, `e2e/{seller,screenshots}.spec.ts`: проверки и screenshots.
- `docs/screenshots/{dashboard-desktop,dashboard-mobile,customers-desktop,customers-mobile,inquiries-desktop,catalog-mobile}.png`, README, DECISIONS, integration guide, этот handoff и seller-web handoff.
- Полный состав этапов: `git show --stat 246851b`; после публикации B — `git log --oneline` и `git show --stat <hash>`.

## Маршруты

Работают `/login`, `/seller`, `/seller/customers`, `/seller/inquiries`, `/seller/catalog`; последние два показывают данные только в Demo до HTTP API. Live клиентов требует доступного API/БД.

`/seller/sale`, `/seller/debts`, `/seller/history`, `/seller/summary` ждут exports участника 4; `/`, `/venues/:slug`, `/shops/:slug` — участника 2. Сейчас честные страницы ожидания. Денежную логику/3D не дублировать. Общие интерфейсы описаны в [integration guide](SELLER_FRONTEND_INTEGRATION.md).

## Точные команды и результаты

Из корня репозитория:

```powershell
git branch --show-current
git status --short
git fetch origin
git pull --ff-only origin feature/seller-dashboard
cd apps/web
npm ci
# Создать .env.local из .env.example и внести только публичную конфигурацию
npm run dev
```

Открыть `http://127.0.0.1:5173/login`, выбрать Demo или live-вход после подготовки backend. В отдельном терминале после получения серверного окружения от капитана:

```powershell
cd apps/api
uv sync --locked
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Swagger: http://127.0.0.1:8000/docs. Не запускать миграции/seed/разрушающие проверки общей demo-БД без согласования.

Frontend-проверки из `apps/web`:

```powershell
npm run generate:api
npm run check:api
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

| Проверки | Этап A | Этап B |
|---|---|---|
| TypeScript, lint, build, check:api | passed | passed |
| Unit/component | 70, 6 файлов | 71, 6 файлов |
| Chromium E2E | 6 | 8 |
| Viewport matrix | 360/768/1440 | 360/390/768/1440 |
| Prettier | passed | passed |

Сценарии включают auth test client/session/cache boundaries, API errors, approved fixtures/runtime validation, no token, cross-business responses, search/form/selection, RU/KZ, mobile overflow, focus и read-only Demo. Визуально просмотрены все 6 новых кадров. E2E screenshot test воспроизводимо обновляет файлы в docs/screenshots: после запуска проверить git diff.

## Что осталось и известные проблемы

1. Капитан передаёт серверный env и тестовые пароли безопасным каналом; запустить API, проверить реальный Supabase login/refresh/reload и GET/POST с БД. Ничего не выдавать за live до фактического успеха.
2. Проверить account A/B, разрешённые 6/3 точки, 401 без token, 404 чужой точки/customer/cursor, cache cleanup и новый клиент после reload. Только согласованные учебные данные.
3. CORS подтвердить с origins localhost:5173 и 127.0.0.1:5173; production origin согласовать отдельно. Серверная конфигурация здесь не менялась.
4. Дождаться контрактов заявок/каталога и модулей public/ledger. Не включать неподтверждённые endpoints и новые backend commits автоматически.
5. Публичного деплоя нет. PR остаётся Draft, капитан выполняет review/merge. Локальные тесты завершены без ошибок; live-блокировка описана выше.

Незавершённого frontend-кода этапов A/B не оставлено; недоступные интеграции и live-acceptance перечислены явно. Перед продолжением прочитать AGENTS.md, актуальные API/передачи и этот файл; проверить branch/status/fetch без потери локальных изменений.
