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

Исходный commit `d8989a5` содержал только README. В этой ветке объединены frontend кабинета, опубликованный в main bootstrap и одобренный backend `193f6e5`. Состояние частей и ограничения описаны ниже.

## Frontend кабинета (ветка feature/seller-dashboard)

В этой ветке добавлено единое приложение `apps/web`. Нужен Node.js 22.12+ или 24 и npm:

```powershell
cd apps/web
npm ci
npm run dev
```

Откройте адрес Vite, затем `/login` для Supabase-входа или «Посмотреть демо» для учебного просмотра без записи. Live bindings `/me` и GET/POST customers подключены к OpenAPI одобренного 193f6e5; для живой работы нужен настроенный и запущенный backend/PostgreSQL. Публичная конфигурация хранится только в игнорируемом `.env.local`, шаблон — `apps/web/.env.example`.

Проверки из `apps/web`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Браузер: `npx playwright install chromium`, затем `npm run test:e2e`. Production preview: `npm run preview`. Хостинг должен перенаправлять SPA-маршруты на `index.html`.

Типы принятого OpenAPI: `npm run generate:api`, проверка актуальности — `npm run check:api`. Состояние интеграции и ограничения: [SELLER_BACKEND_INTEGRATION_PLAN](docs/SELLER_BACKEND_INTEGRATION_PLAN.md). HTTP API заявок и публичного каталога пока нет.

Merchant UI адаптирован по принципам Polaris в собственной React/CSS дизайн-системе: [дизайн и шесть Demo screenshots](docs/SELLER_DESIGN_NOTES.md). Проверки frontend: 71 unit/component и 8 Chromium E2E, включая 360/390/768/1440. Живые Supabase/DB/CORS проверки ожидают серверного окружения и тестовых паролей.

Продолжение с другого аккаунта: [handoff](docs/SELLER_FRONTEND_HANDOFF.md). Подключение общих компонентов и страниц участников 2/4: [integration guide](docs/SELLER_FRONTEND_INTEGRATION.md). Изменения не слиты в main и не опубликованы как сайт.

## Первый backend-этап (история)

Из `main` принят первый локальный этап API: health, OpenAPI, схемы и учебный seed. Запуск из `apps/api`: `uv sync --locked`, затем `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Подробные команды миграций, seed и проверок — в [README API](apps/api/README.md), схемы — в [packages/contracts](packages/contracts/README.md). В этом принятом этапе авторизация, прикладные API, AI и денежные методы ещё не реализованы. Публикация не выполнена.

## Одобренный backend 193f6e5

Из `backend/ledger-auth` принят ручной учёт: клиенты, продажи, погашения, история, отмены и итог дня с PostgreSQL и Supabase JWT. Запуск из `apps/api`: `uv sync --locked`, затем с серверным `.env` — `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`. Миграции, seed и привязку владельцев выполнять только на согласованной базе по [README API](apps/api/README.md). Схемы — в [packages/contracts](packages/contracts/README.md). AI и публичные методы ещё не реализованы, API не опубликован.

Плановая структура кода: `apps/api` — FastAPI, `apps/web` — единое React-приложение, `packages/contracts` — общие схемы. Эти директории создают владельцы соответствующих частей. Техническое задание находится в обычных файлах `docs/team5`, доступных после клонирования без распаковки архивов.

Демо использует учебные точки и операции. Подтверждённых партнёрств с площадками пока нет.
