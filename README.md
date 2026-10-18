<p align="center">
  <img src="docs/assets/readme/banner-ru.svg" alt="Qadam Business — продажи голосом, долги под контролем" width="100%">
</p>

<p align="center"><b>Русский</b> · <a href="README.kk.md">Қазақша</a></p>

<p align="center">
  <a href="https://qadamx-taraz.pages.dev"><img src="https://img.shields.io/badge/%D0%A1%D0%B0%D0%B9%D1%82-qadamx--taraz.pages.dev-164C3E?style=for-the-badge" alt="Сайт"></a>
  <a href="https://qadamx-taraz.onrender.com/api/v1/health"><img src="https://img.shields.io/badge/API-0.6.3-D7F36A?style=for-the-badge" alt="API"></a>
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
  <img src="https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render">
</p>

**Qadam Business** — голосовой учёт продаж, оплат и долгов для продавцов рынков и небольших магазинов Тараза. Продавец говорит о продаже на русском или казахском, Qadam готовит черновик записи, а продавец проверяет его и сохраняет.

## Ссылки

- **Сайт:** [qadamx-taraz.pages.dev](https://qadamx-taraz.pages.dev) — витрина и кабинет продавца (`/login`)
- **API:** [https://qadamx-taraz.onrender.com/api/v1](https://qadamx-taraz.onrender.com/api/v1/health), документация [Swagger](https://qadamx-taraz.onrender.com/docs). Бесплатный сервер может просыпаться до минуты
- **Android:** Тестовый [APK 0.5.2](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.2-review68.1/qadam-0.5.2-79a29b9-internal.apk) (pre-release, SHA-256 скачанного файла проверен), все сборки — в [GitHub Releases](https://github.com/foxfordkz-cyber/qadamx-taraz/releases). Установка и приёмка на телефоне не подтверждены
- **Видео:** [демо на 2 минуты с AI-помощником](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/qadam-hackathon-demo-20261017/Qadam-Business-Demo-RU-with-assistant.mp4) — без звука, с русскими субтитрами, монтаж учебных экранов; помощник показан в демо-режиме

## Кому и чем помогает

Продавцу, который сам принимает деньги и отпускает товар в долг. Вместо тетради или заметок он говорит одну фразу, проверяет суммы и сразу видит, кто и сколько ему должен. Покупатель находит его точку на витрине площадок и отправляет заявку.

<sub>Это гипотеза команды: интервью и исследований пока не было, проверим её в пилоте.</sub>

## Основной сценарий

<table>
  <tr>
    <td width="33%" valign="top"><b>1 · Скажите</b><br><br>«Асқарға үш мың теңгеге тауар бердім, мыңын төледі»</td>
    <td width="33%" valign="top"><b>2 · Проверьте</b><br><br>Черновик: клиент Асқар, продажа 3 000 ₸, получено 1 000 ₸, долг 2 000 ₸. Неясное Qadam уточняет вопросом</td>
    <td width="33%" valign="top"><b>3 · Запишите</b><br><br>Запись появляется только после подтверждения. Доплата 500 ₸ → долг 1 500 ₸, продажи остаются 3 000 ₸</td>
  </tr>
</table>

> [!IMPORTANT]
> AI только предлагает черновик и не записывает деньги. Балансы считает сервер, суммы хранятся в целых тиынах. Если AI недоступен, тот же экран работает как ручной ввод.

## Что работает и что ещё не принято

| Направление | Статус | Что есть |
|---|---|---|
| Вход и свои точки | ✅ Работает | Supabase Auth, продавец видит только свои точки, чужая отвечает 404 |
| Голосовой и текстовый черновик | ✅ Работает | Запись до 30 с, файл или текст, RU/KZ, уточняющие вопросы |
| Ручной ввод | ✅ Работает | Та же форма без AI |
| Продажи, оплаты, долги | ✅ Работает | Полная, частичная и нулевая оплата, доплата, отмена с историей |
| Клиенты, история, итог дня, аналитика | ✅ Работает | Поиск клиента, фильтры, 7 и 30 дней |
| Защита от повторов | ✅ Работает | Идемпотентная атомарная запись, восстановление части незавершённых запросов |
| Витрина и заявки | ✅ Работает | Площадки в 3D и обычным списком, каталог, заявка продавцу |
| Интерфейс RU/KZ | ✅ Работает | Основной путь и ошибки. Учебные данные переведены не все |
| Flutter-приложение | 🟡 Тестовые APK | Площадки, магазины, CRM. Физическая приёмка открыта |
| Мал базар | 🟡 Концепт | Контракт рынков готов, справочник пуст, реальных цен нет |
| Регистрация продавцов | ✅ Проверено на сайте | Настоящее письмо, новый аккаунт, reload и повторный обычный вход; доступ к точкам назначается отдельно. [Приёмка](docs/REGISTRATION_PAGES_LIVE_20261017.md) |
| Сайт в Safari | ✅ Проверено командой | Основные функции сайта проверены вручную в Safari |
| Flutter на физических Android и iPhone | ⏳ Не принято | APK проверен на эмуляторе, установка на телефоны не завершена |
| Замер пользы | ⏳ Не проведён | Сравнение ручного ввода и голоса — следующий шаг |

## Скриншоты

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

<sub>Снимки сделаны на синтетических учебных данных.</sub>

## Архитектура и стек

```mermaid
flowchart LR
  Web["Сайт · React, TypeScript, Vite, Three.js"] --> API
  App["Flutter-приложение"] --> API
  API["FastAPI · проверка пользователя и точки"] --> Auth["Supabase Auth"]
  API --> DB[("PostgreSQL · журнал в тиынах")]
  API --> AI["OpenAI · речь → черновик"]
  AI -. "черновик" .-> API
  API -. "запись только после подтверждения" .-> DB
```

Ключи AI и базы есть только на сервере. Аудио обрабатывается в памяти и на нашем сервере не сохраняется. Сайт размещён на Cloudflare Pages, API — на Render.

```text
apps/api            FastAPI, миграции Alembic, AI-адаптеры, тесты
apps/web            витрина, кабинет продавца, голосовой учёт
apps/mobile         Flutter-приложение
packages/contracts  OpenAPI, примеры JSON, контракты
docs                ТЗ, решения, передачи работы, отчёты, материалы защиты
```

## Локальный запуск

### Что нужно

| Инструмент | Версия | Зачем |
|---|---|---|
| Python | 3.12 (`apps/api/.python-version`) | API |
| [uv](https://docs.astral.sh/uv/) | любая актуальная | зависимости API по `uv.lock` |
| Node.js и npm | 20.19+ или 22.12+ (проверялось на Node 24) | сайт |
| PostgreSQL | своя локальная база, не общая Supabase | данные API |
| Проект Supabase | свой или тестовый | вход продавцов (JWT) |
| Ключ OpenAI или Gemini | необязательно | голосовые и текстовые черновики. Без ключа работает ручной ввод |
| Flutter | 3.47.7 / Dart 3.13.5 | только для `apps/mobile` |

### 1. База данных

Нужна отдельная PostgreSQL. Пример через Docker:

```bash
docker run -d --name qadam-db -e POSTGRES_PASSWORD=qadam -e POSTGRES_DB=qadam -p 5432:5432 postgres:16
```

`DATABASE_URL` принимает схемы `postgresql://` и `postgresql+psycopg://`, например `postgresql://postgres:qadam@127.0.0.1:5432/qadam`. Для pytest нужна вторая пустая база в `TEST_DATABASE_URL`: тесты её очищают.

### 2. API

```bash
cd apps/api
uv sync --locked
cp .env.example .env              # PowerShell: Copy-Item .env.example .env
# заполните .env: DATABASE_URL, SUPABASE_URL, JWT_ISSUER, ALLOWED_ORIGINS=["http://127.0.0.1:5173"]
uv run alembic upgrade head       # миграции 0001–0008
uv run python -m app.seed --demo  # 3 площадки, 9 учебных точек, товары и клиенты
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Проверка: http://127.0.0.1:8000/api/v1/health, Swagger — http://127.0.0.1:8000/docs. Чтобы учебные точки появились в кабинете ваших тестовых пользователей, выполните `uv run python -m app.seed --demo --bind-owners` с заполненными `DEMO_OWNER_*` (подробно — в [apps/api/README.md](apps/api/README.md)). Для AI укажите `AI_PROVIDER=openai` и `OPENAI_*` либо `AI_PROVIDER=gemini` и `AI_API_KEY`/`AI_MODEL`.

### 3. Сайт

```bash
cd apps/web
npm ci
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
# заполните .env.local: VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev -- --port 5173 --strictPort
```

Откройте http://127.0.0.1:5173. Витрина работает с одним API. Кнопка «Посмотреть демо» на `/login` открывает кабинет на встроенных учебных данных даже без Supabase. Регистрация в production-сборке привязана к адресу `https://qadamx-taraz.pages.dev/auth/callback`, локально используйте вход существующими тестовыми пользователями.

### 4. Мобильное приложение (необязательно)

```bash
cd apps/mobile
cp config/public.example.json config/public.local.json   # заполните публичные адреса API и Supabase
flutter pub get
flutter run --dart-define-from-file=config/public.local.json
```

Подробнее — в [apps/mobile/README.md](apps/mobile/README.md).

### Переменные окружения

Значения не коммитятся, в репозитории только шаблоны `.env.example`. Префикс `VITE_` — только у публичных значений, которые попадают в браузер.

| Где | Переменные |
|---|---|
| API, обязательные | `DATABASE_URL`, `SUPABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `ALLOWED_ORIGINS` |
| API, AI | `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `AI_FALLBACK_OPENAI`, `AI_PRIMARY_TIMEOUT_SECONDS` |
| API, фото Мал базара | `STORAGE_SERVICE_KEY`, `STORAGE_BUCKET`, `LIVESTOCK_DEMO_MODE` |
| API, тесты и учебные владельцы | `TEST_DATABASE_URL`, `DEMO_OWNER_A_SUB`, `DEMO_OWNER_B_SUB`, `DEMO_OWNER_A_TOKEN`, `DEMO_OWNER_B_TOKEN` |
| Сайт | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CUSTOMER_IDS_ENABLED` |

## Как устроен деплой

```mermaid
flowchart LR
  Dev["main → deploy/permanent-062"] --> Pages["Cloudflare Pages · сайт"]
  Dev --> Render["Render · API"]
  Render --> Supa["Supabase · Auth и PostgreSQL"]
  Render --> OAI["OpenAI · черновики"]
```

| Часть | Где | Как выпускается |
|---|---|---|
| Сайт | [Cloudflare Pages](https://qadamx-taraz.pages.dev) | `npm run build:hosted` в `apps/web` собирает `dist` с публичными настройками, затем Direct Upload в Pages. Push в Git сайт сам не обновляет. Маршруты SPA, включая `/auth/callback`, обрабатывает Pages |
| API | [Render](https://qadamx-taraz.onrender.com/api/v1/health), бесплатный план, Сингапур | Описан в [`render.yaml`](render.yaml): ветка `deploy/permanent-062`, автодеплой выключен, выпуск вручную. Старт через `deploy_start.py`: проверяет настройки, миграции и seed не запускает. Секреты хранятся только в Environment Render |
| База и вход | Supabase, схема 0008 | Миграции на общей базе — только отдельным rollout с backup и проверкой восстановления |
| AI | OpenAI через серверный адаптер | Ключ только на Render. Провайдер выбирается переменной `AI_PROVIDER` |
| Android | [GitHub Releases](https://github.com/foxfordkz-cyber/qadamx-taraz/releases) | APK собирается отдельно из `apps/mobile` и публикуется как pre-release |

Бесплатный Render засыпает после простоя, первый запрос может идти до минуты. Старый адрес `qadamx-taraz.vercel.app` больше не основной: он не обновляется из-за лимита сборок, используйте Pages.

## Проверки и границы доказательств

API: `uv run ruff check .`, `uv run python -m app.export_contracts --check`, `uv run pytest` (тесты с БД — только на отдельной PostgreSQL). Web: `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

- Выпуск `8fa0029` на Pages и Render: миграции 0007/0008 после backup и проверки восстановления, вход A/B, изоляция точек, история, аналитика. [Отчёт rollout](docs/PUBLIC_DATA_MARKETS_PRODUCTION_20261017.md)
- Автотесты объединённого кода по отчёту выпуска: 357 backend, 395 web unit/component, E2E заявки, голоса и recovery
- Один контрольный текстовый AI-запрос на production: HTTP 200, 4,719 с, 300000/100000 тиын, без денежной записи. Это один прогон, не средняя задержка
- Автотесты не заменяют проверку на телефоне. `main` может быть впереди опубликованной сборки
- `health.stage=manual-ledger` — прежняя служебная метка: она не означает отсутствие AI и не требует нового deployment

## Учебные данные и безопасность

> [!NOTE]
> Площадки, точки, товары и клиенты учебные и помечены «Демо». Партнёрств с MART, Кайкарметом и Ауыл Береке нет, 3D-модели — условные схемы. Кнопка «Посмотреть демо» на `/login` открывает кабинет только для чтения. Секреты, `.env`, настоящие долги клиентов и аудиозаписи не коммитятся. Seed, миграции и очищающие тесты на общей Supabase не запускать.

## Команда

| Участник | Роль |
|---|---|
| Дамир ([foxfordkz-cyber](https://github.com/foxfordkz-cyber)) | Капитан и интегратор, backend, выпуск |
| Абзал (Abzal Sabit) | Визуал и 3D, визуальная приёмка |
| Bekzat | Кабинет продавца: каркас, клиенты, восстановление запросов |
| Aidana | Голосовой ввод и аналитика |
| Tanirberdi Bolat | Flutter-приложение |
| gulnur0505 | Надёжность кабинета и тесты |

<sub>Роли указаны по истории коммитов и передачам работы.</sub>

Документы: [Продуктовое ТЗ](docs/team5/00_PRODUCT_TZ.md) · [Контракт API](docs/team5/02_ARCHITECTURE_API.md) · [Решения](docs/DECISIONS.md) · [Текущее состояние](docs/PROJECT_STATUS.md) · [Материалы защиты](docs/pitch/PITCH.md) · [Чек-лист сдачи](docs/submission/DEFENSE_CHECKLIST.md) · [История выпусков](docs/RELEASE_HISTORY.md) · [Инструкции для AI](AGENTS.md) · [Правила Git](CONTRIBUTING.md)

<p align="center"><sub>Zhambyl Hub · трек AI · AI for SME & Local Business · 2026</sub></p>
