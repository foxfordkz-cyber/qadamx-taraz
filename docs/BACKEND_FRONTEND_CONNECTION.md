# Подключение команды к backend — 2026-10-15

**Актуальная единая ветка:** [TEAM_INTEGRATION](TEAM_INTEGRATION.md). Она включает Seller `b3d0328`, API/AI `2d2fc56`, новый каталог/заявки 0.4.0, адаптированный ledger и публичную витрину. Ниже сохранён отчёт прежней проверки отдельных PR; его утверждения об отсутствующих экранах относятся к старому snapshot. Итоговый commit и новые результаты — в последней секции backend handoff.

Проверены опубликованные снимки GitHub; ветки участников и PR не изменялись. Интеграционная копия — локальный detached worktree `tmp/integration-review-20261015`, не ветка для слияния. Живой браузерный сценарий существующего Seller Frontend прошёл; полный денежный/AI-сценарий ожидает готовности соответствующих экранов.

Документация из `afbef782893d2c973bf14d9ba7b9b3e261d21dee` опубликована в `backend/integration-readiness`. Последующее дополнение содержит результаты живого браузера, [инструкцию воспроизведения](SELLER_LIVE_ACCEPTANCE.md) и [точный patch generated.ts](../packages/contracts/FRONTEND_TYPES_UPDATE.md).

## Проверенные версии

| PR | Head commit | Base | Состояние при проверке |
|---|---|---|---|
| [#3 seller](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3) | `9b4156122e22f12839f9f69384cb79a43e90c730` | `main` | open, draft |
| [#4 журнал](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4) | `193f6e527d716549d759d805dc4b86db1d9e059e` | `main` | open, не draft |
| [#5 AI](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/5) | **`2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`** | `backend/ledger-auth` | open, не draft |

Исходный `main`: `ced32e7aa8e737a0cbc5318715ad02bdc98a89d4`. Для подключения полного backend используйте commit **`2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`**. Он содержит ручной журнал PR #4 и AI PR #5. Объединённый проверочный commit — `6c6f5090c9d5ea3e97bdbf37168e7d40ba6c768c` (только локальный). Backend и экспорт контрактов в нём побайтно совпадают с PR #5.

PR #3 обновился во время проверки с `246851b` до `9b41561`; получен новый снимок, перечитаны инструкции/передачи, frontend-проверки повторены. Auth, client/bindings/gateway, formatKZT, backend и контракты в этом обновлении не менялись, что подтверждено git diff.

Код трёх PR совместился. Конфликты только в корневом README и `docs/PROJECT_STATUS.md`: обе ветки меняют описание готовности. В проверочной копии сохранены обе части; это не готовая редакция документации для main. При реальном обновлении ветки владелец должен объединить актуальное описание frontend и backend, убрать исторические утверждения «не реализовано».

## Запуск backend и адреса

В копии с указанным backend commit, при уже настроенном игнорируемом `apps/api/.env`:

```powershell
cd apps/api
uv sync --locked
uv run alembic current
# Для существующего qadam-demo ожидается 0003_drafts (head).
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Supabase `qadam-demo` проверен на `0003_drafts`. Для подключения команды **не нужны** повторный seed, пересоздание базы, downgrade или очистка. Не заменяйте готовый `.env` шаблоном. Настройка новой отдельной БД описана в [README API](../apps/api/README.md).

| Назначение | Адрес |
|---|---|
| Origin backend | `http://127.0.0.1:8000` |
| **Base URL frontend, включая префикс** | **`http://127.0.0.1:8000/api/v1`** |
| Health процесса | `http://127.0.0.1:8000/health` |
| Swagger | `http://127.0.0.1:8000/docs` |
| OpenAPI сервера | `http://127.0.0.1:8000/openapi.json` |

Health не подтверждает доступ к БД/Auth. `127.0.0.1` доступен только на компьютере, где запущен API; на компьютере друга это его собственный localhost. Общий HTTPS backend пока не опубликован. Проверка с другого устройства потребует отдельно согласованного адреса сервера и CORS origin; деплой в этом шаге не выполнялся.

- [OpenAPI точного commit](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/openapi.json)
- [JSON-примеры точного commit](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/examples.json)
- [AI: multipart, уточнение и подтверждение](../packages/contracts/AI_INTEGRATION.md)

## Публичная конфигурация frontend

В игнорируемом `apps/web/.env.local`, не в Git:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_SUPABASE_URL=https://pdjjdqgoitnkpgkbqjtp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<публичный publishable key этого проекта>
```

Это точные имена из опубликованного PR #3. Ключ берётся из настроек проекта безопасным каналом; его значение здесь не публикуется. В `VITE_*` запрещены DB URL/пароль, пользовательский JWT, service_role/secret key и Gemini key. Пользователь входит через Supabase; SDK передаёт текущий access token API через общий клиент. Тестовые аккаунты/пароли передаются отдельно, не в документации.

Node.js 22.12+ или 24; из `apps/web`:

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

Открыть `http://127.0.0.1:5173/login`. После изменения Vite env перезапустить dev server; production bundle собирается заново. На backend согласованный `ALLOWED_ORIGINS`:

```dotenv
ALLOWED_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

CORS preflight с Authorization, Content-Type и Idempotency-Key на оба origin вернул 200; посторонний origin — 400 без разрешающего заголовка. Порт 4173 в существующих Playwright demo-тестах не обращается к API. Для live preview на 4173 потребуется отдельное разрешение точного origin; wildcard не нужен.

## Учебные точки

В текущем qadam-demo реальные владельцы A/B привязаны к следующим учебным точкам. Это не логины и не партнёрские магазины. UI всегда выбирает точки из `/me`, не из таблицы или произвольного URL.

| Владелец | Slug | businessId |
|---|---|---|
| A | mart-demo-clothes | `ad6203bc-7320-5b36-982b-135504c5af68` |
| A | mart-demo-food | `d96e604f-930b-59b5-a239-820d0ae1b02e` |
| B | mart-demo-home | `07691851-9886-5ce4-bb82-a3ed33630fe1` |
| A | kaikarmet-demo-clothes | `99e2db7e-ba5f-5baa-a4e8-1a0882a3864a` |
| A | kaikarmet-demo-food | `2c234f1c-2c79-5e3a-ab77-042e3da4dafa` |
| B | kaikarmet-demo-home | `048ae1c7-d583-501e-a84b-6654d83f8bb0` |
| A | auyl-bereke-demo-clothes | `6bd09bf9-ee33-57b3-96d4-f069f742cf1b` |
| A | auyl-bereke-demo-food | `a979445d-2261-5313-8fd2-16fc76e9279f` |
| B | auyl-bereke-demo-home | `2b3b3d90-8226-540c-b74e-3d4f2f4f093f` |

Источник UUID — `packages/contracts/demo-seed.json`; живой `/me` проверил 6/3 memberships. База уже содержит учебные записи: не считать начальный summary нулевым, проверять изменение сумм. В этом прогоне сохранены один явно учебный клиент и две операции (продажа/доплата); общее число операций выросло с 3 до 5, ничего не удалялось.

## Совместимость и задачи команды

| Участок | Фактическое состояние |
|---|---|
| Supabase login, `/me`, выбор точки | Реальный вход A/B через форму, `/me`, reload и смена аккаунтов прошли в Chromium. Автообновление после естественного истечения JWT отдельно не проверялось |
| Поиск и создание клиента | Реальные bindings PR #3 совместимы с PR #5; проверены на живом API и через форму браузера, клиент сохраняется после reload |
| Ручная продажа, погашение, история, summary | Backend работает. Страницы и парсер денежного ввода **ожидаются от команды ledger-web** |
| AI-текст/аудио, уточнение, подтверждение | Backend работает. UI **ожидается от команды ledger-web** |
| Подключение экспортов страниц | `src/app/modules.ts` содержит пустые `seller` и `public`; подключает seller-web после передачи модулей |
| Витрина/3D | **Ожидается от команды public-web/assets-3d** |
| Заявки и публичный каталог | Seller UI показывает предусмотренные ограничения. HTTP API ещё не реализованы — следующая задача backend, не блокер ручного журнала |

`/me`, CustomerCreate/CustomerResponse, SaleCreate/RepaymentCreate, OperationResponse, SummaryResponse и соответствующие ручные маршруты не изменились между PR #4 и #5. Формы списков — `{items,next_cursor}`; `contact` — string/null; остаток клиента приходит с сервера. Создание клиента возвращает 201, операции и их повторы — 200. 404 скрывает чужую точку/сущность; отсутствие/истечение JWT — 401.

В опубликованном frontend `generated.ts` точно соответствует OpenAPI PR #4. Без обновления в объединённой копии **`npm run check:api` падает**: PR #5 добавил AI-маршрут. В отдельной копии выполнена штатная генерация: **check:api/typecheck PASS, 45 затронутых тестов PASS**. Подготовлен [точный patch и разбор изменений](../packages/contracts/FRONTEND_TYPES_UPDATE.md). Владелец seller-web применяет обновление при принятии #5; его ветка и runtime-код не менялись. Обновлённая `SELLER_FRONTEND_INTEGRATION.md` корректно описывает подключённые bindings; при принятии #5 останется обновить ссылку на принятый backend snapshot.

Для ledger-web: использовать существующий `useRuntime().api`, текущий `useBusiness().business.id`, общий CustomerPicker и QueryClient. 3000 ₸ → `300000`, 1000 ₸ → `100000`, 500 ₸ → `50000`; JSON-целые `_minor`, валюта KZT. `formatKZT(300000)` проверен как `3 000 ₸`. Денежный парсер формы пока отсутствует. Подтверждение — отдельное действие; ключ и точное тело денежного запроса сохраняются при сетевом повторе. После успеха обновлять клиентов, историю, открытые продажи и summary. Погашение не увеличивает продажи; остатки вычисляет backend. Текущий долг summary не ограничен выбранной датой.

## Фактически выполненные проверки

| Категория | Результат |
|---|---|
| Backend на отдельной PostgreSQL 17.11 | **165 passed**, без skipped; одна прежняя Starlette/httpx deprecation. JWT тестовые, Gemini — заглушка; проверены конкуренция, откат, идемпотентность, TTL и изоляция |
| Backend lint/формат/контракты | Ruff check, 37 файлов format check, `app.export_contracts --check` — PASS |
| Frontend статические/сборка | `npm ci`, typecheck, lint, build — PASS; сборка без публичной env-конфигурации, не подтверждает login. Format check прошёл после локальной нормализации CRLF → LF в трёх файлах, без изменений Git-содержимого |
| Frontend unit/component | **71 passed** на `9b41561` (ранее 70 на `246851b`), тестовые auth/gateway/ответы |
| Chromium E2E опубликованной оболочки | **8 passed** на `9b41561` (ранее 6 на `246851b`), demo-режим без API-трафика и записи. Первоначально отсутствовал нужный Chromium; установлен требуемый headless shell. Screenshot-тест перезаписал только кадры отдельной проверочной копии |
| Живой браузерный Seller-сценарий | **PASS**, один сценарий с 10 контрольными точками: реальные login A/B/A, `/me`, создание клиента, reload, выход, изоляция точек. Денежные/AI-страницы пока ожидаются |
| Живой HTTP + Supabase | Версия `0003_drafts`, реальные JWT/JWKS, `/me`, клиент, продажа, доплата, история, summary, CORS, 401/404, повторы и 409 — PASS |
| AI в этом прогоне | HTTP `smoke_draft_flow.py --demo` — **PASS replay-only**, без нового вызова Gemini: тот же ответ/операция, новый ключ → 409 DRAFT_USED |
| Живой Gemini ранее | RU → draft → отдельное подтверждение → Supabase проверен на том же backend; отдельно 11 RU/KZ/mixed текстов и синтетическое RU-аудио. Не выдаётся за новый прогон или браузерную проверку |

Живой ручной прогон вызвал неизменённые опубликованные `createApiClient`, `createLiveGateway`, `backendBindings` и `formatKZT` из PR #3 под Node, используя локальный Uvicorn из проверочной копии. Это **API-интеграция TypeScript-клиента**, без React/браузера и без Supabase password login. Токены обновлены пользователем через обычный вход, секреты не выведены. Получено: долг новой продажи `200000`, после доплаты `150000`; два повтора идентичны, другое тело с прежним ключом → 409, владелец B не читает и не пишет точку A → 404. В mart-demo-clothes итог с учётом прежних записей: sales `600000`, receipts `300000`, outstanding `300000`; новый клиент должен `150000`.

Команды из `apps/api` проверочной копии (ENV_FILE — абсолютный путь только к отдельной локальной конфигурации тестовой БД):

```powershell
python scripts/with_env.py ENV_FILE -m pytest -q --tb=short
python -m ruff check app tests scripts migrations
python -m ruff format --check app tests scripts migrations
python -m app.export_contracts --check
```

Использовался готовый Python 3.12 venv исходной копии с locked зависимостями. На Supabase не выполнялись pytest, migration upgrade/downgrade, seed, truncate/delete. Временный HTTP-прогон сохранён локально в игнорируемом `tmp/run_integration_api.py` / `tmp/frontend_live_bridge.ts`; секреты передаются только окружением. Повтор AI — штатный `scripts/smoke_draft_flow.py --demo`, возвращает ранее сохранённую операцию.

Последующий браузерный прогон выполнен без mocks через Playwright Chromium, настоящую форму и Supabase password grant; использованы локальный Vite на 5173 и Uvicorn на свободном loopback-порту. Создан один клиент «Демо браузер PR3 2026-10-15», contact=null, balance_minor=0. После reload и возврата B → A виден тот же UUID без повторного создания. B не видит точек/клиента A, query business_id не подменяет выбранную точку. Отдельный fetch из браузера с JWT B к клиентам A вернул 404 — это API-проверка, а не UI-действие. Денежных записей не было: operations 5 → 5, схема остаётся `0003_drafts`.

Первый браузерный запуск остановился после успешного входа A из-за неоднозначного тестового локатора двух кнопок «Новый клиент»; исправлен только локальный тест, повтор прошёл полностью. Trace/HAR/video/screenshots не записывались, учётные данные не выводились. После каждого запуска из `.env` удалены только `DEMO_OWNER_A_PASSWORD`/`DEMO_OWNER_B_PASSWORD`; остальные значения проверены на сохранность. [Повторение на компьютере разработчика](SELLER_LIVE_ACCEPTANCE.md) не требует доступа к чужому localhost.

## Предлагаемый порядок слияния, без выполнения

1. **PR #4 готов к review/ручному слиянию** по проверенному backend-сценарию. Предпочтителен обычный merge commit: PR #3 и #5 уже основаны на его истории.
2. После принятия #4 перевести **base PR #5 в `main`**, сверить diff и актуальные проверки. **PR #5 готов как зависимый backend-этап**; сейчас он направлен в ещё не слитую ветку. Не сливать его в старую ledger-ветку после закрытия #4 и не считать это попаданием в main.
3. Владелец PR #3 обновляет свою ветку после backend, объединяет README/PROJECT_STATUS, обновляет generated API types/ссылку на принятый snapshot и повторяет проверки. **PR #3 остаётся draft**: интеграционные правки ещё не опубликованы в его ветке. Живой login/клиенты текущего снимка уже подтверждены. Отсутствующие страницы ledger-web не нужно реализовывать владельцу seller-web; это отдельная зависимость полного продукта.
4. После готовности модулей команды — общий браузерный сценарий login → точка → клиент → продажа → доплата → история/summary и AI → уточнение → подтверждение, включая RU/KZ, повтор и ручной fallback.

Блокеры полной интеграции: ожидаемые ledger/AI UI, применение проверенного обновления generated.ts владельцем frontend, конфликты README/PROJECT_STATUS и отсутствие общего опубликованного API URL. Браузерный login/reload/смена аккаунтов подтверждены; естественное истечение JWT и refresh остаются отдельной проверкой. Ни один PR не слит, автослияние не включено, деплой не выполнялся.
