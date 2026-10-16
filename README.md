# Qadam Business

**HTTPS frontend для телефона:** [вход](https://crucial-funky-marion-barcelona.trycloudflare.com/login), сборка PR18 **5ab11b1**. [Точные commits, CORS, результаты и физическая проверка](docs/HTTPS_FRONTEND_PREVIEW.md). API HTTPS прежний; локальные5188/5191 сохранены. Record/Stop проверены только синтетическим Chromium; физический микрофон, playback/cancel не подтверждены.

**Просмотр PR18:** [интегрированная аналитика на5191](http://127.0.0.1:5191/seller/analytics), только наПК капитана;5188 остаётся прежним web. [Живая продажа/доплата, обновление Analytics и повтор без дубля — PASS](docs/ANALYTICS_LEDGER_LIVE_ACCEPTANCE.md). API8018 и временный HTTPS дляFlutter сохранены.

**Актуальная общая проверка 2026-10-16:** `integration/seller-analytics-061`, merge **94e2b7a** объединяет PR #17/API0.6.1 и Seller Analytics PR #16. [Состав, живая приёмка аналитики, проверки и отдельный запуск](docs/ANALYTICS_061_INTEGRATION.md). Backend,0005,market/minimum и Flutter-конфиг сохранены; работающие API8018/web5188/HTTPS не перезапускались. Новая ветка для Draft review, main не изменён. Указания и commits прежних этапов ниже — история; текущее состояние БД **0005_livestock_market**, UI аналитики уже включён.

**Актуальное дополнение 2026-10-16:** `integration/livestock-https`, API **0.6.1**, общая Supabase **0005_livestock_market** после проверенного восстановления backup. [Рабочий временный HTTPS и конфиг Flutter](docs/FLUTTER_CONNECTION.md), [план постоянного размещения](docs/PERMANENT_HOSTING_PLAN.md). Аналитика и денежные правила сохранены. Нижние commits/результаты относятся к предыдущему этапу общей интеграции.

**Общая проверенная версия:** `integration/local-combined-check`, backend `cd655e96ec809bb8857666ad1fffa16e56e6d02a`. [Живая приёмка, исправления review, запуск и зависимости PR](docs/COMBINED_ACCEPTANCE.md). Текущий просмотр капитана: `http://127.0.0.1:5188`, API `http://127.0.0.1:8018/api/v1` — только на его компьютере. Общая Supabase уже на `0004_livestock`, private Storage подключён и проверен через настоящий HTTP. Актуальное подключение удалённого Flutter — [FLUTTER_CONNECTION](docs/FLUTTER_CONNECTION.md). Аналитика 7/30 дней — [контракт](packages/contracts/ANALYTICS_API.md), API 0.6.0; UI делает frontend.

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
| Mobile, шестой участник | [Flutter «Мал базар»](docs/team5/09_TEAM_MOBILE.md) | apps/mobile — ожидается от участника |

Контракт мобильного модуля: [LIVESTOCK_API](packages/contracts/LIVESTOCK_API.md). Общий backend — apps/api; объявления принадлежат Supabase user и не требуют членства в магазине.

В общей интеграции API **0.6.0** сохраняет контракт Мал базара 0.5.0 и добавляет аналитику точки. `0004_livestock` и private bucket `livestock-photos` уже подключены в qadam-demo; повторная настройка не нужна. Flutter UI делает mobile-участник: опубликована отдельная `feature/mobile-livestock-api:da6a3a0`, в эту ветку автоматически не включалась. API/Storage проверены через HTTP, физическое устройство и удалённый HTTPS пока не проверены.

## Общие договорённости

- [AGENTS.md](AGENTS.md) — короткие инструкции AI для этого проекта.
- [Контракт API](docs/team5/02_ARCHITECTURE_API.md) — методы и данные для всех разработчиков.
- [Решения](docs/DECISIONS.md) — принятый стек и ограничения.
- [План двух дней и защита](docs/team5/08_PLAN_DEMO_QA.md).
- [Обзор рынка](docs/team5/01_TARAZ_MARKET.md).

## Единая интеграция

Ветка `integration/team-mvp` объединяет основной `apps/api` (FastAPI/PostgreSQL/Supabase/Gemini), Seller Frontend и ledger/voice/summary/public modules в одном `apps/web`. Второй backend и корневой frontend PR #7 удалены после переноса полезных сценариев, история сохранена.

**[Запуск, env, commits, API, тестовые точки и приёмка](docs/TEAM_INTEGRATION.md)**. Кратко: из `apps/api` — `uv sync --locked`, затем с настроенным серверным `.env` — `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`; из `apps/web` — `npm ci`, настроить публичный `.env.local`, `npm run dev -- --port 5173 --strictPort`.

Base URL `http://127.0.0.1:8000/api/v1`, Swagger `/docs`, OpenAPI `/openapi.json`. Localhost доступен только на вашем компьютере. Секреты БД и Gemini никогда не имеют префикса VITE_. Общая Supabase — `0004_livestock`: не выполнять повторный setup, seed, очищающие тесты или миграции. Каталог/заявки используют уже существующие таблицы, новая миграция не нужна.

Проверки: API — `uv run python -m app.export_contracts --check`, ruff, pytest **только с отдельной test PostgreSQL** по [README API](apps/api/README.md). Web — `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`. Реальные и stub-результаты разделены в [backend handoff](docs/handoffs/backend.md).

Учебные точки, клиенты и концептуальные 3D-модели не являются реальными партнёрами/долгами/навигацией. PR остаётся Draft до review команды; merge и деплой в этой задаче не выполняются.
