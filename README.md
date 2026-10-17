# Qadam Business

**Выпуск PR47/49/52 — каталог, площадка и магазин:** [состав, проверки и фактическое состояние публикации](docs/ABZAL_PUBLIC_RELEASE.md). InquiryForm/recovery/API0.6.2 сохранены.

**Следующий web-выпуск — форма заявки:** [review, одна живая учебная заявка, версии и ограничения](docs/INQUIRY_RELEASE_REVIEW.md), [передача компонента](docs/handoffs/public-inquiry.md). Recovery PR41/42 сохранён. [Регистрация PR43](docs/REGISTRATION_43_CONTRACT_REVIEW.md) остаётся отдельно; [APK0.2.2+5](docs/MOBILE_022_ARTIFACT_REVIEW.md) проверен как файл, физический Android ещё ожидается.

**Совместный выпуск PR42 Customer Recovery + PR41 полировка:** [приёмка, учебная запись и deployment](docs/RECOVERY_POLISH_RELEASE.md). API остаётся0.6.2; backend/GLB сохранены. PR43 отдельно: [контракт callback](packages/contracts/REGISTRATION_CALLBACK.md), без включения до живой email-приёмки.

## Общая база команды — 17 октября 2026

Актуальная интеграция объединяет production web/API из `8be10b3` (включая модели PR36 и диагностику `e699158`) и исходники Flutter PR25 `421b2fb`. [Состав, проверки и ограничения выпуска](docs/MAIN_RELEASE_20261017.md). После публикации этой интеграции начинайте новые задачи от свежего `origin/main`.

Постоянные адреса: [сайт](https://qadamx-taraz.vercel.app), API `https://qadamx-taraz.onrender.com/api/v1`. API 0.6.2; общая Supabase 0006. Не запускать seed/очищающие тесты на общей БД. Recovery UI `9a3c868` и незавершённый signup/callback PR31 не включены. Backend recovery уже присутствует.

Flutter находится в `apps/mobile`; это исходники, не новый APK. Нужен SDK автора Flutter 3.47.7 / Dart 3.13.5 и отдельная сборка с постоянными URL. Физический Android ещё не принят. Нижние записи сохранены как история и не заменяют эту сводку.

**Опубликованные хостинги:** [web](https://qadamx-taraz.vercel.app), API_BASE_URL `https://qadamx-taraz.onrender.com/api/v1`, OpenAPI0.6.2 / Supabase0006. [Новая живая Auth/AI-приёмка, точные границы доказательств и открытые пункты](docs/HOSTING_AI_ACCEPTANCE.md), [передача команде и Flutter](docs/HOSTING_TEAM_HANDOFF.md). Капитан переключил Render на OpenAI вручную; локальный резервный API и туннели сохранены. Старые указания ниже — исторические этапы. Полная приёмка хостинга и конкретной recording.webm ещё не объявляется завершённой.

**Отдельный кандидат интеграции:** `integration/unified-web-062`, проверенный код **b899902** — дизайн PR24/26/27/29, Auth c2a9402 и AI-уточнения PR32 поверх работающего backend4e983b4. [Состав, тесты, блокеры recovery/регистрации и предложение preview](docs/UNIFIED_WEB_062_REVIEW.md). Это ещё не код общего HTTPS preview. Recovery fd21874 исключён после воспроизведения нового ключа между двумя формами; поздняя незавершённая регистрация PR31 10d9bba не включена.

**Текущая общая среда:** API **0.6.2**, код **4e983b4**, Supabase **0006_customer_requests**. [Rollout, адреса и новая живая приёмка](docs/CUSTOMER_RECOVERY_LIVE_ACCEPTANCE.md). Voice frontend7f511dd и оба туннеля сохранены, команда может продолжать работу. Recovery UI подключает Бекзат. Ниже — история подготовки: старые URL и ожидания rollout больше не являются текущими указаниями.

## История подготовки и интеграции

**PR22 готовится к согласованию rollout, не развёрнут:** [review и фактический backup/restore0006](docs/CUSTOMER_RECOVERY_ROLLOUT.md). Работающие API0.6.1, voice preview и туннели сохранены; актуальные адреса — в [опубликованной инструкции восстановления](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/0737439/docs/VOICE_HTTPS_RESTORED.md). Сведения о прежних адресах ниже относятся к прошлым запускам.

**Ветка customer recovery (API 0.6.2):** [контракт и JSON](packages/contracts/CUSTOMER_RECOVERY_API.md), [локальный запуск и обязательная0006](apps/api/README.md). Основа — PR18/1324885. Работающие HTTPS preview/API остаются на прежних сборках, API0.6.1/Supabase0005; новый recovery ещё не включён в общей среде. Сохранены Analytics, market/minimum и старые POST customers.

**Восстановлено 2026-10-16,18:40:** [HTTPS frontend с voice PR23](https://negotiations-exist-newman-ohio.trycloudflare.com/login), API_BASE_URL `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1`. Проверенная сборка7f511dd, backend4f67e2c/API0.6.1, Supabase0005. [Точные commits, все проверки, условия доступности и подключение](docs/VOICE_HTTPS_RESTORED.md). Playback/cancel прошли синтетические браузерные проверки; физический микрофон ещё не проверен. Локальный5191 теперь показывает эту сборку.

**Далее — история предыдущих запусков. Старые HTTPS-адреса недоступны; текущие адреса указаны выше.**

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
