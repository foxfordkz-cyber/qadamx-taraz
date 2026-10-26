<p align="center">
  <img src="docs/assets/readme/banner-ru.svg" alt="Qadam Business — продажи голосом, долги под контролем" width="100%">
</p>

<p align="center"><b>Русский</b> · <a href="README.kk.md">Қазақша</a></p>

<p align="center">
  <a href="https://qadamx-taraz.pages.dev"><img src="https://img.shields.io/badge/%D0%A1%D0%B0%D0%B9%D1%82-qadamx--taraz.pages.dev-164C3E?style=for-the-badge" alt="Сайт"></a>
  <a href="https://qadamx-taraz.onrender.com/api/v1/health"><img src="https://img.shields.io/badge/API-0.7.2-D7F36A?style=for-the-badge" alt="API"></a>
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

<table>
  <tr>
    <td width="25%" valign="top">🎙️ <b>Говорите</b><br><sub>Фраза на русском или казахском → черновик продажи с клиентом, суммой и долгом</sub></td>
    <td width="25%" valign="top">🤖 <b>Спросите Qadam</b><br><sub>«Кто мне должен?», «Как прошла неделя?» — ответ по данным вашей точки</sub></td>
    <td width="25%" valign="top">📊 <b>Деньги видно</b><br><sub>Сколько собрано за период и какие долги висят дольше 30 дней</sub></td>
    <td width="25%" valign="top">💬 <b>WhatsApp</b><br><sub>Вежливое напоминание и итог дня готовым текстом, в одно касание</sub></td>
  </tr>
</table>

## Ссылки

- **Сайт:** [qadamx-taraz.pages.dev](https://qadamx-taraz.pages.dev) — витрина и кабинет продавца (`/login`)
- **API:** [https://qadamx-taraz.onrender.com/api/v1](https://qadamx-taraz.onrender.com/api/v1/health), документация [Swagger](https://qadamx-taraz.onrender.com/docs). Бесплатный сервер может просыпаться до минуты
- **Android:** Тестовый [APK 0.5.2](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/mobile-v0.5.2-review68.1/qadam-0.5.2-79a29b9-internal.apk) (pre-release, SHA-256 скачанного файла проверен), все сборки — в [GitHub Releases](https://github.com/foxfordkz-cyber/qadamx-taraz/releases). Установка и приёмка на телефоне не подтверждены
- **Видео:** [демо на 2 минуты с AI-помощником](https://github.com/foxfordkz-cyber/qadamx-taraz/releases/download/qadam-hackathon-demo-20261017/Qadam-Business-Demo-RU-with-assistant.mp4) — без звука, с русскими субтитрами, монтаж учебных экранов; помощник показан в демо-режиме
- **Слайды:** [презентация защиты на казахском, PDF](docs/pitch/Qadam-Business-slides-KZ.pdf)

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

## Где работает AI

AI берёт на себя рутину продавца, но не распоряжается деньгами.

| Задача | Что делает AI | Что гарантирует сервер |
|---|---|---|
| Голос → запись | Распознаёт речь RU/KZ и разбирает фразу: клиент, сумма, сколько получено | Черновик ничего не записывает. Продажа появляется только после подтверждения продавца; проверяется `0 ≤ получено ≤ сумма`, при долге нужен клиент |
| Неясная фраза | Задаёт уточняющий вопрос: «Сколько заплатили?» | Без ответа черновик не сохранить. При сбое AI тот же экран работает как ручной ввод |
| «Спросите Qadam» | Отвечает на вопрос продавца простым языком и предлагает следующий шаг | Ответ строится на фактах сервера: продажи, поступления, долги, главные должники. Если в ответе есть число или клиент не из фактов, вместо ответа модели показывается сводка из фактов |
| Аналитика | Объясняет итог периода по кнопке «Объяснить с AI» | Цифры на карточках сервер считает одним снимком; при открытии страницы сводка строится без вызова модели |
| Напоминание | Пишет черновик вежливого напоминания должнику | Отправляет только сам продавец, из своего WhatsApp |

Ключи AI хранятся только на сервере, у помощника есть дневной лимит запросов.

## День продавца с Qadam

| Когда | Что делает продавец | Где в Qadam |
|---|---|---|
| Днём | Говорит «Асқарға үш мың теңгеге тауар бердім, мыңын төледі» и подтверждает черновик | Кабинет → «Скажите о продаже» |
| Покупатель вернулся | Принимает доплату: долг уменьшается, продажи не растут | «Мне должны» → «Принять оплату» |
| Вечером | Отправляет итог дня себе, партнёру или хозяину точки | «Итог дня» → «Отправить итог в WhatsApp» |
| Раз в неделю | Видит, какая доля продаж уже собрана и у кого долг старше 30 дней, и напоминает | «Аналитика» → «Возраст долгов» → «Напомнить в WhatsApp» |

## Что работает и что ещё не принято

| Направление | Статус | Что есть |
|---|---|---|
| Вход и свои точки | ✅ Работает | Supabase Auth, продавец видит только свои точки, чужая отвечает 404 |
| Голосовой и текстовый черновик | ✅ Работает | Запись до 30 с, файл или текст, RU/KZ, уточняющие вопросы |
| Ручной ввод | ✅ Работает | Та же форма без AI |
| Продажи, оплаты, долги | ✅ Работает | Полная, частичная и нулевая оплата, доплата, отмена с историей |
| Клиенты, история, итог дня, аналитика | ✅ Работает | Поиск клиента, фильтры, 7 и 30 дней. Итог периода от сервера сразу при открытии, «Кому напомнить», объяснение с AI по кнопке. Собираемость за период (оплачено сразу, доплатили позже, ещё в долгу) и возраст долгов: до 7, 8–30 и больше 30 дней |
| AI-помощник «Спросите Qadam» | ✅ Работает | Отвечает по данным своей точки: кто должен, как прошла неделя, черновик напоминания для копирования. Числа сверяются с данными сервера, AI ничего не записывает |
| Напоминание в WhatsApp | ✅ Работает | Кнопка в списке долгов и в черновике помощника открывает WhatsApp с готовым текстом на RU/KZ: остаток и название точки. Отправляет продавец сам. Номер подставляется, только если у клиента указан один телефон +7/8. На физическом телефоне ещё не проверено |
| Итог дня в WhatsApp | ✅ Работает | Продажи, получено и общий долг за выбранный день одним сообщением: WhatsApp, копирование или меню «Поделиться» телефона |
| Защита от повторов | ✅ Работает | Идемпотентная атомарная запись, восстановление части незавершённых запросов |
| Витрина и заявки | ✅ Работает | Площадки в 3D и обычным списком, каталог, заявка продавцу |
| Интерфейс RU/KZ | ✅ Работает | Основной путь и ошибки. Учебные данные переведены не все |
| Flutter-приложение | 🟡 Тестовый APK 0.5.2 | Площадки, магазины, CRM. Голос → черновик на Android проверен вручную. Полная приёмка установленного приложения не завершена |
| Мал базар | 🟡 Концепт | Контракт рынков готов, справочник пуст, реальных цен нет |
| Регистрация продавцов | ✅ Проверено на сайте | Настоящее письмо, новый аккаунт, reload и повторный обычный вход; доступ к точкам назначается отдельно. [Приёмка](docs/REGISTRATION_PAGES_LIVE_20261017.md) |
| Голос на настоящих устройствах | ✅ Проверено вручную 18.10 | Ноутбук (Chrome), iPhone (Safari), Android (APK): фраза голосом → расшифровка → черновик AI. [Скриншоты](docs/qa/evidence/voice-20261018/) |

## Скриншоты

<table>
  <tr>
    <td colspan="2"><img src="docs/assets/readme/home-v2.webp" alt="Главная: учёт продаж и долгов голосом"><br><sub>Главная: цель продукта и три шага</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/readme/cabinet.webp" alt="Кабинет продавца: «Скажите о продаже» и «Спросите Qadam»"><br><sub>Кабинет: два входа с AI</sub></td>
    <td width="50%"><img src="docs/assets/readme/sale-draft.webp" alt="Голос или текст → черновик AI → проверка"><br><sub>Продажа: голос → черновик AI → проверка</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/readme/analytics.webp" alt="Аналитика: карточки, итог периода, кому напомнить"><br><sub>Аналитика: итог периода и «Кому напомнить»</sub></td>
    <td width="50%" align="center"><img src="docs/assets/readme/assistant.webp" alt="AI-помощник «Спросите Qadam»" width="80%"><br><sub>«Спросите Qadam»: ответ и черновик напоминания</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/assets/readme/collection-aging.webp" alt="Собираемость за период и возраст долгов"><br><sub>Аналитика: собираемость за период и возраст долгов</sub></td>
  </tr>
  <tr>
    <td width="50%" align="center"><img src="docs/assets/readme/whatsapp-debts.webp" alt="Долг с кнопкой «Напомнить в WhatsApp»" width="90%"><br><sub>Долги: «Напомнить в WhatsApp» с готовым текстом</sub></td>
    <td width="50%" align="center"><img src="docs/assets/readme/day-summary.webp" alt="Итог дня: отправить в WhatsApp, скопировать, поделиться" width="90%"><br><sub>Итог дня: одним сообщением в WhatsApp</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/readme/device-laptop.webp" alt="Голос на ноутбуке"><br><sub>Голос на ноутбуке: черновик 5 000 / 2 000 ₸</sub></td>
    <td width="50%" align="center"><img src="docs/assets/readme/devices-phones.webp" alt="Голос на iPhone и в Android-приложении"><br><sub>iPhone (Safari) и Android (APK): голос → черновик</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/assets/readme/venues-3d.webp" alt="Три площадки в 3D: Кайкармет, MART, Ауыл Береке"><br><sub>Витрина: три площадки в 3D и обычным списком</sub></td>
  </tr>
</table>

<sub>Экраны сайта сняты на учебных и синтетических данных; снимки устройств — ручная проверка команды 18.10.2026 на учебной точке.</sub>

## Архитектура и стек

```mermaid
flowchart LR
  Web["Сайт · React, TypeScript, Vite, Three.js"] --> API
  App["Flutter-приложение"] --> API
  API["FastAPI · проверка пользователя и точки"] --> Auth["Supabase Auth"]
  API --> DB[("PostgreSQL · журнал в тиынах")]
  API --> AI["OpenAI · речь → черновик, ответы помощника"]
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
| API, помощник | `ASSISTANT_ENABLED`, `ASSISTANT_DAILY_LIMIT` |
| Сайт | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CUSTOMER_IDS_ENABLED`, `VITE_ASSISTANT_ENABLED` |

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

Бесплатный Render засыпает после простоя, первый запрос может идти до минуты.

## Проверки и границы доказательств

API: `uv run ruff check .`, `uv run python -m app.export_contracts --check`, `uv run pytest` (тесты с БД — только на отдельной PostgreSQL). Web: `npm run check:api`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.

- Выпуск `8fa0029` на Pages и Render: миграции 0007/0008 после backup и проверки восстановления, вход A/B, изоляция точек, история, аналитика. [Отчёт rollout](docs/PUBLIC_DATA_MARKETS_PRODUCTION_20261017.md)
- Выпуск `7334485` на Cloudflare Pages 18.10: все 22 файла сайта совпадают со сборкой побайтно. На живой учебной точке проверены долги с кнопкой WhatsApp, собираемость, возраст долгов и итог дня. API 0.7.2 на Render
- Автотесты сайта на `main` после слияния PR #97–#99, 18.10: 610 unit/component тестов в 44 файлах, typecheck, lint, сборка
- Автотесты объединённого кода по отчёту выпуска: 357 backend, 395 web unit/component, E2E заявки, голоса и recovery
- Один контрольный текстовый AI-запрос на production: HTTP 200, 4,719 с, 300000/100000 тиын, без денежной записи. Это один прогон, не средняя задержка
- Голос на ноутбуке, iPhone и Android проверен вручную 18.10, автотесты эту проверку не заменяют. `main` может быть впереди опубликованной сборки
- `health.stage=manual-ledger` — прежняя служебная метка: она не означает отсутствие AI и не требует нового deployment

## Учебные данные и безопасность

> [!NOTE]
> Площадки, точки, товары и клиенты учебные и помечены «Демо». Партнёрств с MART, Кайкарметом и Ауыл Береке нет, 3D-модели — условные схемы. Кнопка «Посмотреть демо» на `/login` открывает кабинет только для чтения. Секреты, `.env`, настоящие долги клиентов и аудиозаписи не коммитятся. Seed, миграции и очищающие тесты на общей Supabase не запускать.

## Дипломное расширение: прогноз, риск и обратная связь

Ветка `feature/ml-sales-debt-research`, **не production rollout**. Новая страница
`/seller/research` в «Ещё», а также ссылки из Аналитики и Клиентов. Существующие
продажи, долги, голос, Auth, витрина и мобильное приложение сохранены.

- Прогноз 7/30 дней: ML-регрессия и два простых baseline, хронологическая проверка,
  MAE/RMSE, график и экспорт. Нужно минимум 98/144 полных дней; иначе честное
  `insufficient_data`. Учебный пример в Demo явно помечен.
- Риск долга: объяснимые правила, не обученная модель и не вероятность невозврата.
- RU/KZ-анкета с согласием, идемпотентной записью и приватным просмотром своих ответов.

[Методология и доказательства](docs/diploma-evidence/README.md) ·
[Эксперимент](docs/ml-evaluation-plan.md) · [Исследование пользователей](docs/user-research-plan.md) ·
[API 0.8.0](packages/contracts/RESEARCH_API.md) · [Локальная демонстрация](docs/diploma-evidence/capture-guide.md).

Новых зависимостей или переменных окружения нет. Для живой анкеты нужна новая
миграция `0009_research_feedback`: только на **собственной локальной БД**
из `apps/api` выполните `uv sync --locked`, `uv run alembic upgrade head`,
затем существующую команду запуска API. Общую БД не обновлять без отдельного
rollout капитана с backup/recovery. Перед реальным сбором отзывов назначить
ответственного за согласие, приватное хранение и удаление ответов.
Для Demo достаточно `npm ci` и `npm run dev` в `apps/web`.

Реальные научные выводы и интервью ещё не получены. JSON с синтетическими метриками
доказывает воспроизводимость вычислений, а не превосходство ML в реальном бизнесе.

## Дипломная интеграция — отдельный Draft

Stage 1–11 собраны в `integration/qadam-diploma-v1`; дальнейшую дипломную работу
начинаем отдельной веткой от этой базы. [Публикация, проверки и запуск локального
React/API/PostgreSQL демо](docs/diploma-evidence/stage12-publication/README.md).
Эта ветка не означает обновление сайта выше: локальное демо использует учебные
данные и offline AI. Для staging/production остаются отдельные условия допуска.

## Команда

| Участник | Команда | Роль |
|---|---|---|
| Қарабек Дамир ([foxfordkz-cyber](https://github.com/foxfordkz-cyber)) | QadamX | Капитан и интегратор, backend, выпуск |
| Болат Тәңірберген (Tanirberdi Bolat) | QadamX | Flutter-приложение, главная кабинета |
| Сәбит Абзал (Abzal Sabit) | QadamK | Визуал и 3D, главная страница, слайды |
| Жорабек Бекзат (Bekzat) | QadamK | Кабинет продавца, итог дня в WhatsApp, проверка на устройствах |
| Сәрсенбаева Айдана (Aidana) | QadamK | Голосовой ввод, аналитика и помощник |
| Махсут Гүлнур (gulnur0505) | QadamK | Надёжность кабинета, тесты, вычитка казахского |

<sub>Роли указаны по истории коммитов и передачам работы.</sub>

Документы: [Продуктовое ТЗ](docs/team5/00_PRODUCT_TZ.md) · [Контракт API](docs/team5/02_ARCHITECTURE_API.md) · [Решения](docs/DECISIONS.md) · [Текущее состояние](docs/PROJECT_STATUS.md) · [Материалы защиты](docs/pitch/PITCH.md) · [Чек-лист сдачи](docs/submission/DEFENSE_CHECKLIST.md) · [История выпусков](docs/RELEASE_HISTORY.md) · [Инструкции для AI](AGENTS.md) · [Правила Git](CONTRIBUTING.md)

<p align="center"><sub>Zhambyl Hub · трек AI · AI for SME & Local Business · 2026</sub></p>
