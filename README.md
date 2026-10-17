<p align="center">
  <img src="docs/assets/readme/banner-ru.svg" alt="Qadam Business — продажи голосом, долги под контролем" width="100%">
</p>

<p align="center"><b>Русский</b> · <a href="README.kk.md">Қазақша</a></p>

<p align="center">
  <a href="https://qadamx-taraz.vercel.app"><img src="https://img.shields.io/badge/%D0%A1%D0%B0%D0%B9%D1%82-%D0%BE%D1%82%D0%BA%D1%80%D1%8B%D1%82%D1%8C-1C4A3C?style=for-the-badge" alt="Сайт"></a>
  <a href="https://qadamx-taraz.onrender.com/api/v1/health"><img src="https://img.shields.io/badge/API-0.6.2%20production-D7F36A?style=for-the-badge" alt="API"></a>
  <a href="https://qadamx-taraz.onrender.com/docs"><img src="https://img.shields.io/badge/Swagger-docs-2F6F5A?style=for-the-badge&logo=swagger&logoColor=white" alt="Swagger"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white" alt="Flutter">
</p>

**Qadam** — голосовой учёт продаж, оплат и долгов для продавцов рынков Тараза. Продавец говорит фразу на русском или казахском, AI готовит черновик, продавец проверяет его и записывает. Покупатели находят точку через 3D-витрину площадок и оставляют заявку.

## Как это работает

<table>
  <tr>
    <td width="33%" valign="top"><b>1 · Скажите</b><br><br>«Асқарға үш мың теңгеге тауар бердім, мыңын төледі»</td>
    <td width="33%" valign="top"><b>2 · Проверьте</b><br><br>AI заполнит черновик: клиент Асқар, 3 000 ₸, получено 1 000 ₸, долг 2 000 ₸</td>
    <td width="33%" valign="top"><b>3 · Запишите</b><br><br>Сервер сохранит операцию один раз и пересчитает долг и итог дня</td>
  </tr>
</table>

> [!IMPORTANT]
> AI только предлагает черновик. Без подтверждения продавца в журнал ничего не попадает, а суммы и долги считает сервер.

## Как это выглядит

<table>
  <tr>
    <td width="50%"><img src="docs/assets/readme/sale-draft.webp" alt="Голос или текст → черновик AI → проверка"><br><sub>Голос или текст → черновик AI → проверка</sub></td>
    <td width="50%"><img src="docs/assets/readme/hero.webp" alt="Витрина площадок Тараза"><br><sub>Витрина площадок Тараза</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/assets/readme/venues-3d.webp" alt="Три площадки в 3D: Кайкармет, MART, Ауыл Береке"><br><sub>Три площадки в 3D: Кайкармет, MART, Ауыл Береке</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="docs/assets/readme/debts.webp" alt="«Мне должны»: остатки считает сервер" width="70%"><br><sub>«Мне должны»: остатки считает сервер</sub></td>
  </tr>
</table>

## Возможности

| | Что | Как |
|:---:|---|---|
| 🎙️ | **Продажа голосом или текстом** | Запись до 30 с, аудиофайл или текст. RU, KZ и смешанная речь |
| 🧾 | **Частичная оплата и долг** | Продажа 3 000 ₸, получено 1 000 ₸ → долг 2 000 ₸. Доплата не увеличивает продажи |
| 🔒 | **Надёжный учёт** | Деньги в целых тиынах. Запись атомарная и идемпотентная, повтор не создаёт дубль. Отмена сохраняет историю |
| 👥 | **Клиенты и история** | Поиск клиента, неоплаченные продажи, отмена ошибочной записи |
| 📊 | **Итог дня и аналитика** | Продажи, поступления, долг и заявки за день, 7 и 30 дней |
| 🏬 | **3D-витрина и заявки** | Три площадки в 3D и обычным списком. Заявка приходит нужному продавцу |
| ✍️ | **Ручной ввод** | Работает, если AI недоступен |
| 🐑 | **Мал базар** | Концепт и Flutter-приложение для объявлений о скоте |

> [!NOTE]
> **Учебные данные.** Площадки, точки, товары и клиенты учебные и помечены «Демо». Партнёрств с MART, Кайкарметом и Ауыл Береке нет. 3D-модели — условные схемы, а не планы реальных рынков. Кнопка «Посмотреть демо» на `/login` открывает кабинет только для чтения.

> [!CAUTION]
> **Что ещё не завершено:**
> - Физическая приёмка на iPhone и Android
> - Регистрация продавцов (#43)
> - Пользовательский тест пользы на реальных продавцах

## Стек и структура

```text
apps/api            FastAPI, миграции, AI-адаптеры, тесты
apps/web            витрина, кабинет продавца, голосовой учёт
apps/mobile         Flutter-приложение
packages/contracts  OpenAPI, примеры JSON, контракты
docs                ТЗ, решения, передачи работы, отчёты
```

## Запуск локально

API (серверный `.env` по [apps/api/README.md](apps/api/README.md)):

```bash
cd apps/api && uv sync --locked && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Web (публичный `.env.local` с переменными `VITE_`):

```bash
cd apps/web && npm ci && npm run dev -- --port 5173 --strictPort
```

**Проверки.** API: `uv run ruff check .`, `uv run python -m app.export_contracts --check`, `uv run pytest` (тесты с БД — только на отдельной PostgreSQL). Web: `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

> [!WARNING]
> Код API в `main` — 0.6.3, ему нужны миграции 0007/0008. На production Render работает 0.6.2. Не деплойте backend из `main` до rollout миграций по [TEAM_FINAL_INTEGRATION_20261017](docs/TEAM_FINAL_INTEGRATION_20261017.md). Секреты не коммитятся. Seed, миграции и очищающие тесты на общей Supabase не запускать.

## Команда и документы

<details>
<summary><b>Роли и передачи работы</b></summary>

| Роль | Задание | Передача работы |
|---|---|---|
| Капитан, backend | [Backend](docs/team5/03_TEAM_BACKEND.md) | [backend](docs/handoffs/backend.md) |
| Публичная витрина | [Витрина и 3D](docs/team5/04_TEAM_PUBLIC_FRONTEND.md) | [public-web](docs/handoffs/public-web.md) |
| Кабинет продавца | [Каркас, вход, заявки, клиенты](docs/team5/05_TEAM_SELLER_FRONTEND.md) | [seller-web](docs/handoffs/seller-web.md) |
| Учёт | [Голос, продажи, долги, отчёты](docs/team5/06_TEAM_LEDGER_FRONTEND.md) | [ledger-web](docs/handoffs/ledger-web.md) |
| 3D | [Модели площадок](docs/team5/07_TEAM_3D.md) | [assets-3d](docs/handoffs/assets-3d.md) |
| Mobile | [Flutter «Мал базар»](docs/team5/09_TEAM_MOBILE.md) | [mobile](docs/handoffs/mobile.md) |

</details>

[Продуктовое ТЗ](docs/team5/00_PRODUCT_TZ.md) · [Контракт API](docs/team5/02_ARCHITECTURE_API.md) · [Решения](docs/DECISIONS.md) · [Текущее состояние](docs/PROJECT_STATUS.md) · [История выпусков](docs/RELEASE_HISTORY.md) · [Инструкции для AI](AGENTS.md) · [Правила Git](CONTRIBUTING.md)

<p align="center"><sub>Сделано командой Qadam в Таразе · 2026</sub></p>
