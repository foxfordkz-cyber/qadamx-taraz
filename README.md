# Qadam Business

Голосовой учёт продаж, оплат и долгов для продавцов рынков Тараза. Продавец говорит фразу на русском или казахском, AI готовит черновик, продавец проверяет его и записывает. Суммы и долги считает сервер. Покупатели находят точки через 3D-витрину площадок и оставляют заявки.

- **Сайт:** https://qadamx-taraz.vercel.app (копия на Cloudflare Pages: https://qadamx-taraz.pages.dev)
- **API:** https://qadamx-taraz.onrender.com/api/v1, Swagger: `/docs`
- **Кабинет продавца:** `/login`. Кнопка «Посмотреть демо» открывает кабинет только для чтения: деньги и AI в демо не записываются.

## Что работает

| Сценарий | Как |
|---|---|
| Продажа голосом или текстом | Запись до 30 с, загрузка файла или текст на RU/KZ → черновик AI → проверка → запись |
| Частичная оплата и долг | Продажа 3 000 ₸, получено 1 000 ₸ → долг 2 000 ₸. Доплата уменьшает долг и не увеличивает продажи |
| Надёжность учёта | Деньги в целых тиынах. Запись атомарная и идемпотентная: повторное нажатие не создаёт дубль. Отмена сохраняет историю |
| Клиенты, история, итог дня, аналитика | Поиск клиента, неоплаченные продажи, отмена ошибочной записи, итоги за день, 7 и 30 дней |
| Витрина и заявки | Три площадки в 3D и обычным списком, карточка точки, заявка приходит нужному продавцу |
| Ручной ввод | Работает, если AI недоступен |
| Мал базар | Концепт и мобильное приложение Flutter (`apps/mobile`) для объявлений о скоте |

## Что учебное

- Площадки, точки, товары и клиенты учебные и помечены «Демо». Партнёрств с MART, Кайкарметом и Ауыл Береке нет.
- 3D-модели — условные схемы по внешним референсам, а не планы реальных рынков.
- Физическая приёмка на iPhone и Android, регистрация продавцов (#43) и пользовательский тест пользы не завершены.

## Стек

FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL (Supabase), Supabase Auth, OpenAI или Gemini через серверный адаптер · React, TypeScript, Vite, React Three Fiber · Flutter.

```
apps/api        backend, миграции, AI-адаптеры, тесты
apps/web        сайт: витрина, кабинет продавца, голосовой учёт
apps/mobile     Flutter-приложение
packages/contracts  OpenAPI, примеры JSON, контракты
docs            ТЗ, решения, передачи работы, отчёты приёмки
```

## Запуск локально

API (нужен серверный `.env` по [apps/api/README.md](apps/api/README.md)):

```bash
cd apps/api && uv sync --locked && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Web (публичный `.env.local` с `VITE_` переменными):

```bash
cd apps/web && npm ci && npm run dev -- --port 5173 --strictPort
```

Проверки: API — `uv run ruff check .`, `uv run python -m app.export_contracts --check`, `uv run pytest` (тесты с БД — только на отдельной PostgreSQL). Web — `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

Секреты не коммитятся. Не запускайте seed, миграции и очищающие тесты на общей Supabase.

> **Deployment.** Код API в `main` — 0.6.3, ему нужны миграции 0007/0008. На production Render работает 0.6.2. Не деплойте backend из `main`, пока не проведён rollout миграций по [TEAM_FINAL_INTEGRATION_20261017](docs/TEAM_FINAL_INTEGRATION_20261017.md).

## Команда и документы

| Роль | Задание | Передача работы |
|---|---|---|
| Капитан, backend | [Backend](docs/team5/03_TEAM_BACKEND.md) | [backend](docs/handoffs/backend.md) |
| Публичная витрина | [Витрина и 3D](docs/team5/04_TEAM_PUBLIC_FRONTEND.md) | [public-web](docs/handoffs/public-web.md) |
| Кабинет продавца | [Каркас, вход, заявки, клиенты](docs/team5/05_TEAM_SELLER_FRONTEND.md) | [seller-web](docs/handoffs/seller-web.md) |
| Учёт | [Голос, продажи, долги, отчёты](docs/team5/06_TEAM_LEDGER_FRONTEND.md) | [ledger-web](docs/handoffs/ledger-web.md) |
| 3D | [Модели площадок](docs/team5/07_TEAM_3D.md) | [assets-3d](docs/handoffs/assets-3d.md) |
| Mobile | [Flutter «Мал базар»](docs/team5/09_TEAM_MOBILE.md) | [mobile](docs/handoffs/mobile.md) |

- [Продуктовое ТЗ](docs/team5/00_PRODUCT_TZ.md), [контракт API](docs/team5/02_ARCHITECTURE_API.md), [решения](docs/DECISIONS.md)
- [Текущее состояние](docs/PROJECT_STATUS.md), [история выпусков](docs/RELEASE_HISTORY.md)
- [Инструкции для AI](AGENTS.md), [правила работы с Git](CONTRIBUTING.md), [с чего начать](docs/START_HERE.md)
