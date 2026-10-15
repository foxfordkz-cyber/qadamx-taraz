# Seller frontend — передача следующему Codex

Обновлено 2026-10-15. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz. Работать только в `feature/seller-dashboard`. Draft PR: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3. Не merge в main, не force push. Секреты и локальные `.env*` не коммить.

## Завершённые этапы и Git

- Ранее согласованный main `ced32e7` принят merge-коммитом `3b03ed3fe74188d848693891fb6132515cb29627`.
- Этап A опубликован: `246851b2d4df996f054c7b1a27b2ba2933d2b3ee` — одобренный backend и Supabase/customer bindings.
- Этап B опубликован: `e8321f0cb5c7056d284c831d4e6ae7b0293424ca` — merchant UI, поиск заявок, 6 новых screenshots. Это последний commit реализации; завершающий commit обновляет только metadata передачи. Точный текущий HEAD: `git log -1 --format=%H`.
- После A и B выполнены fetch, `pull --ff-only origin feature/seller-dashboard` (Already up to date), `push -u origin feature/seller-dashboard`; удалённый hash B совпал. Draft PR #3 обновлён и остаётся open/draft, merge не выполнялся.
- Одобрен только backend `193f6e527d716549d759d805dc4b86db1d9e059e`, PR #4. Более новые backend commits автоматически не включать. README/DECISIONS сохраняют обе стороны. Проверка из корня `git diff 193f6e5 -- apps/api packages/contracts` должна быть пустой: backend и контракты капитана не редактировались.

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
- `vite.config.ts`: отдельный auth chunk; `src/test/{bindings,errors,screens}.test.tsx`, `e2e/{seller,screenshots}.spec.ts`: проверки и screenshots.
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
