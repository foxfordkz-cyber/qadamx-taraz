# Qadam Business

AI-кабинет продавца для торговых точек Тараза: голосовой ввод продаж и оплат, долги клиентов, заявки и итог дня. Публичная 3D-витрина объединяет концепции MART, Кайкармета и Ауыл Береке.

## Начало работы

1. Прочитайте [инструкцию по GitHub и работе с AI](docs/START_HERE.md).
2. Изучите [продуктовое ТЗ](docs/team5/00_PRODUCT_TZ.md) и [правила разработки](CONTRIBUTING.md).
3. Выберите своё задание и стартовый запрос из [AI_PROMPTS](docs/AI_PROMPTS.md).
4. Перед кодом проверьте [текущее состояние](docs/PROJECT_STATUS.md) и файл передачи своей роли.

| Роль | Задание | Передача работы |
|---|---|---|
| Капитан, весь backend | [Backend](docs/team5/03_TEAM_BACKEND.md) | [backend](docs/handoffs/backend.md) |
| Frontend публичной витрины | [Витрина и интеграция 3D](docs/team5/04_TEAM_PUBLIC_FRONTEND.md) | [public-web](docs/handoffs/public-web.md) |
| Frontend кабинета | [Каркас, вход, заявки, клиенты](docs/team5/05_TEAM_SELLER_FRONTEND.md) | [seller-web](docs/handoffs/seller-web.md) |
| Frontend учёта | [Голос, продажи, долги, отчёты](docs/team5/06_TEAM_LEDGER_FRONTEND.md) | [ledger-web](docs/handoffs/ledger-web.md) |
| 3D-художник | [Модели трёх площадок](docs/team5/07_TEAM_3D.md) | [assets-3d](docs/handoffs/assets-3d.md) |

## Общие договорённости

- [AGENTS.md](AGENTS.md) — короткие инструкции AI для этого проекта.
- [Контракт API](docs/team5/02_ARCHITECTURE_API.md) — методы и данные для всех разработчиков.
- [Решения](docs/DECISIONS.md) — принятый стек и ограничения.
- [План двух дней и защита](docs/team5/08_PLAN_DEMO_QA.md).
- [Обзор рынка](docs/team5/01_TARAZ_MARKET.md).

Исходный commit `d8989a5` содержал только README. В этой ветке объединены frontend кабинета, опубликованный в main bootstrap и одобренный backend `193f6e5`. Отдельно принят только OpenAPI AI-backend `2d2fc56`, без его кода и миграций. Состояние частей и ограничения описаны ниже.

## Frontend кабинета (ветка feature/seller-dashboard)

В этой ветке добавлено единое приложение `apps/web`. Нужен Node.js 22.12+ или 24 и npm:

```powershell
cd apps/web
npm ci
npm run dev
```

Откройте адрес Vite, затем `/login` для Supabase-входа или «Посмотреть демо» для учебного просмотра без записи. Live bindings `/me` и GET/POST customers совместимы с одобренным backend 193f6e5 и OpenAPI 0.3.0 из 2d2fc56; для живой работы нужен настроенный и запущенный backend/PostgreSQL. Публичная конфигурация хранится только в игнорируемом `.env.local`, шаблон — `apps/web/.env.example`. Используются `VITE_API_BASE_URL` (локально `http://127.0.0.1:8000/api/v1`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. DB/AI secrets, service-role и access tokens во frontend env не помещать.

Проверки из `apps/web`: `npm run generate:api`, `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run format:check`. Перед первым browser-прогоном: `npx playwright install chromium`. Production preview: `npm run preview`. Хостинг должен перенаправлять SPA-маршруты на `index.html`.

Типы принятого OpenAPI: `npm run generate:api`, проверка актуальности — `npm run check:api`. Состояние интеграции и ограничения: [SELLER_BACKEND_INTEGRATION_PLAN](docs/SELLER_BACKEND_INTEGRATION_PLAN.md). HTTP API заявок и публичного каталога пока нет.

Merchant UI адаптирован по принципам Polaris в собственной React/CSS дизайн-системе: [дизайн и шесть Demo screenshots](docs/SELLER_DESIGN_NOTES.md). Проверки frontend: 71 unit/component и 8 Chromium E2E, включая 360/390/768/1440. Живые Supabase/DB/CORS проверки ожидают серверного окружения и тестовых паролей.

Продолжение с другого аккаунта: [handoff](docs/SELLER_FRONTEND_HANDOFF.md). Подключение общих компонентов и страниц участников 2/4: [integration guide](docs/SELLER_FRONTEND_INTEGRATION.md). Изменения не слиты в main и не опубликованы как сайт.

## Первый backend-этап (история)

Из `main` принят первый локальный этап API: health, OpenAPI, схемы и учебный seed. Запуск из `apps/api`: `uv sync --locked`, затем `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Подробные команды миграций, seed и проверок — в [README API](apps/api/README.md), схемы — в [packages/contracts](packages/contracts/README.md). В этом принятом этапе авторизация, прикладные API, AI и денежные методы ещё не реализованы. Публикация не выполнена.

## Одобренный backend 193f6e5

Из `backend/ledger-auth` принят ручной учёт: клиенты, продажи, погашения, история, отмены и итог дня с PostgreSQL и Supabase JWT. Запуск из `apps/api`: `uv sync --locked`, затем с серверным `.env` — `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Миграции, seed и привязку владельцев выполнять только на согласованной базе по [README API](apps/api/README.md). Схемы — в [packages/contracts](packages/contracts/README.md). AI и публичные методы ещё не реализованы, API не опубликован.

## AI-backend 2d2fc56 — контракт отдельно от реализации

Капитан опубликовал ручной учёт в [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4); следующий этап в `backend/ai-drafts` добавляет Gemini: RU/KK-текст или аудио → валидированный черновик → отдельное подтверждение существующим журналом. Источник этого обновления — точный commit `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`. В seller-ветку перенесён **только** `packages/contracts/openapi.json`, версия API 0.3.0, и воспроизводимо обновлён `apps/web/src/shared/api/generated.ts`. Добавлен POST `/api/v1/businesses/{id}/drafts`; существующие пути, 20 component schemas и Bearer security семантически не изменились. AI UI, запросы, код backend, миграции и денежная логика этим обновлением не подключаются.

Инструкции капитана для AI snapshot сохранены в [README API на 2d2fc56](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/apps/api/README.md), [AI integration guide](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/AI_INTEGRATION.md) и [backend handoff](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/docs/handoffs/backend.md). Порядок запуска в подготовленном капитаном AI checkout: `cd apps/api`, `uv sync --locked`, настроить игнорируемый `.env`, согласованно `uv run alembic upgrade head` и `uv run python -m app.seed --demo`, затем `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Эти команды миграций/seed в seller-сессии не выполнялись. Для уже подготовленной общей БД повторное изменение данных отдельно согласуется.

Серверные переменные: `DATABASE_URL`, `SUPABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `ALLOWED_ORIGINS`; для отдельной тестовой БД — `TEST_DATABASE_URL`; для AI snapshot — `AI_API_KEY`, `AI_MODEL`. Значения и пароли не хранить в Git. Проверки капитана выполняются в его checkout: `uv run python -m app.export_contracts --check`, ruff и pytest по инструкции API; PostgreSQL-тесты только на отдельной пустой `*_test`, не общей demo-БД.

Локальный `apps/api` здесь остаётся на 193f6e5. Его exporter не содержит нового HTTP drafts: повторная генерация OpenAPI из локального Python по старой инструкции перезапишет согласованный 0.3.0. Для этого контрактного этапа используйте `npm run generate:api` / `npm run check:api` из `apps/web`; источник OpenAPI — опубликованный snapshot капитана, а не локальный Swagger старого backend. `examples.json` и demo seed остаются прежними: схемы совместимы, дополнительных файлов/внешних `$ref` новый OpenAPI не требует. Contract README дополнен этим уточнением источника без переноса других файлов AI-ветки.

По результатам капитана на AI-ветке `0003_drafts` применена на Supabase qadam-demo, живой HTTP/JWT/Gemini/DB сценарий и 165 локальных backend-тестов прошли. В текущем задании капитан также подтвердил TypeScript-client smoke `/me`, customer create, sale, repayment, history и summary. Это **результаты капитана**, не browser-проверки seller-сессии. Здесь собственные проверки — frontend contract/component/E2E; живой браузерный вход, CORS, AI UI и HTTPS-деплой остаются неподтверждёнными.

Плановая структура кода: `apps/api` — FastAPI, `apps/web` — единое React-приложение, `packages/contracts` — общие схемы. Эти директории создают владельцы соответствующих частей. Техническое задание находится в обычных файлах `docs/team5`, доступных после клонирования без распаковки архивов.

Демо использует учебные точки и операции. Подтверждённых партнёрств с площадками пока нет.
