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

## Единая интеграция

Ветка `integration/team-mvp` объединяет основной `apps/api` (FastAPI/PostgreSQL/Supabase/Gemini), Seller Frontend и ledger/voice/summary/public modules в одном `apps/web`. Второй backend и корневой frontend PR #7 удалены после переноса полезных сценариев, история сохранена.

**[Запуск, env, commits, API, тестовые точки и приёмка](docs/TEAM_INTEGRATION.md)**. Кратко: из `apps/api` — `uv sync --locked`, затем с настроенным серверным `.env` — `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`; из `apps/web` — `npm ci`, настроить публичный `.env.local`, `npm run dev -- --port 5173 --strictPort`.

Base URL `http://127.0.0.1:8000/api/v1`, Swagger `/docs`, OpenAPI `/openapi.json`. Localhost доступен только на вашем компьютере. Секреты БД и Gemini никогда не имеют префикса VITE_. Общая Supabase — `0003_drafts`: не выполнять там seed, очищающие тесты или миграции. Каталог/заявки используют уже существующие таблицы, новая миграция не нужна.

Проверки: API — `uv run python -m app.export_contracts --check`, ruff, pytest **только с отдельной test PostgreSQL** по [README API](apps/api/README.md). Web — `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Реальные и stub-результаты разделены в [backend handoff](docs/handoffs/backend.md).

Учебные точки, клиенты и концептуальные 3D-модели не являются реальными партнёрами/долгами/навигацией. PR остаётся Draft до review команды; merge и деплой в этой задаче не выполняются.
