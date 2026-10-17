# Текущее состояние Qadam Business

## 2026-10-17 — совместная версия recovery и полировки

PR42/2058b91 и PR41/7d84cb6 объединены от main9845b91. Полный319-тестовый набор и браузерные регрессии прошли; настоящая приёмка одного учебного клиента с потерей ответа/recovery/replay и A/B завершена без дубля. API0.6.2/диагностикаe699158/GLB сохранены. [Проверки и выпуск](RECOVERY_POLISH_RELEASE.md). PR43 исключён до email-сценария, [контракт callback](../packages/contracts/REGISTRATION_CALLBACK.md) готов. Нижние статусы — история.

## 2026-10-17 — объединение main и deploy

По поручению капитана подготовлена общая база: production web/API `8be10b3` плюс Flutter PR25 `421b2fb`. Модели PR36 и диагностика Render `e699158` сохранены. Recovery UI `9a3c868` исключён из-за воспроизведённого позднего удаления чужого pending intent; signup PR31 исключён до callback/email-приёмки. Подробности: [MAIN_RELEASE_20261017](MAIN_RELEASE_20261017.md).

Web/API код совпадает с принятой production-сборкой; интеграция не требует миграций. Render не требуется перезапускать: `apps/api` побайтово совпадает с e699158. Mobile-код включается отдельно от обещаний об APK: SDK этого ПК старее SDK автора, Android не проверен. Текущие адреса — Vercel/Render, а не исторические trycloudflare ниже.

## 2026-10-16 — опубликованы Vercel/Render, ограниченная AI-приёмка

Web `https://qadamx-taraz.vercel.app`, API `https://qadamx-taraz.onrender.com/api/v1`, OpenAPI0.6.2 и общая Supabase0006 проверены. Капитан переключил Environment на OpenAI; новый STT-log и шесть успешных hosted pipelines подтвердили работу текста/аудио/уточнения. Настоящий browser AuthA/B/analytics/isolation/public3D PASS; деньги не подтверждались. [Полный отчёт](HOSTING_AI_ACCEPTANCE.md), [передача команде](HOSTING_TEAM_HANDOFF.md). Конкретная recording.webm ещё не диагностирована до точного text-validation outcome; patch c6e0411 подготовлен, не развернут. Actual deployment SHA/active extraction model/SSL, финансовая и фото-приёмка Render, cold start и физические устройства ещё требуют завершения. Остаток защитного бюджета AI$0.20; paid retries остановлены. Туннели сохранены. Далее исторические этапы.

## 2026-10-16 — API0.6.2 запущен

После разрешения «окно открыто»: свежий backup восстановлен на отдельной PostgreSQL, применена0006, данные сохранены, общий сервер переключён на **4e983b4**. Внешний HTTP recovery/legacy/ledger/analytics/livestock/Storage и настоящий браузерный AuthA/B PASS. [Адреса, учебные записи и ограничения](CUSTOMER_RECOVERY_LIVE_ACCEPTANCE.md). Gemini сохранён, OpenAI fallback выключен. Телефон/Flutter не проверялись этим прогоном, frontend recovery требуется подключить. Main/merge/постоянный deploy не менялись. Далее — исторические этапы.

**Восстановлено 2026-10-16,18:40:** [HTTPS frontend с voice PR23](https://negotiations-exist-newman-ohio.trycloudflare.com/login), API_BASE_URL `https://thorough-readings-riverside-suggesting.trycloudflare.com/api/v1`. Проверенная сборка7f511dd, backend4f67e2c/API0.6.1, Supabase0005. [Точные commits, все проверки, условия доступности и подключение](VOICE_HTTPS_RESTORED.md). Playback/cancel прошли синтетические браузерные проверки; физический микрофон ещё не проверен. Локальный5191 теперь показывает эту сборку.

**Далее — история предыдущих запусков. Старые HTTPS-адреса недоступны; текущие адреса указаны выше.**

## 2026-10-16 — Seller Analytics объединён с API0.6.1

`integration/seller-analytics-061`, проверенный merge94e2b7a: PR17ca51bbf + PR16ce68f01. Общий backend/OpenAPI/generated/Flutter-инструкция сохранены. Настоящий browser loginA/B→/me→Analytics7/30→смена точки/reload/logout и foreign404 PASS, без API writes.207 unit,23 standard+Analytics и21 QA E2E PASS (8 пересечений). API8018,web5188 и действующий HTTPS не перезапускались;0005 только прочитана, setup/seed не выполнялись. [Точный состав и запуск](ANALYTICS_061_INTEGRATION.md). Новая ветка публикуется отдельным Draft поверхPR17; merge/deploy нет. Далее — исторические состояния прежних этапов, включая прежние ожидания UI и ревизии0003/0004.

## 2026-10-16 — API0.6.1 и временный внешний HTTPS

Общая qadam-demo переведена на0005 после разрешения капитана: backup qadam восстановлен локально и сопоставлен, прежние данные сохранены. API0.6.1 доступен через временный HTTPS с реальными JWT/Storage, внешние проверки с ПК капитана PASS. [Адрес/конфиг/ограничения Flutter](FLUTTER_CONNECTION.md). PR15 a2c0aab совместим как старый клиент, UI рынка/минимума и физический Android ещё нужны. Аналитика сохранена, новых денежных операций нет. Постоянный деплой только спланирован, не выполнен.

## Текущее дополнение: Supabase/HTTP и аналитика — 2026-10-16

Общая qadam-demo уже `0004_livestock`, private `livestock-photos` подключён. Настоящий HTTP на 8018 проверен с реальными JWT и Storage. API 0.6.0 добавляет аналитику 7/30 дней; контракт опубликован первым commit `2089e44`, UI ожидается от frontend. [Инструкция Flutter и временный HTTPS](FLUTTER_CONNECTION.md). Новых миграций, повторного seed, очистки общей БД и деплоя нет. Flutter опубликован отдельно в `feature/mobile-livestock-api:da6a3a0`; интеграция и проверка на устройстве ещё нужны. Следующие секции — история этапов, включая прежние ограничения 0003.

## 2026-10-16: общая версия принята локально

`integration/local-combined-check`, проверенный код `c5ecd5e`: сохранён merge 614b13e, включены опубликованные seller PR #11 и QA PR #12, устранены QA-001/002/003. Настоящие Supabase A/B, ручной журнал, заявка и полный Gemini text→draft→UI confirm→history прошли. 219 backend-тестов на отдельной PostgreSQL, 142 frontend, 15 стандартных и 21 QA E2E (8 пересекаются). [Фактические результаты и запуск](COMBINED_ACCEPTANCE.md). Не main/не деплой; общая Supabase всё ещё 0003. Flutter UI, разрешение на 0004 и живая Storage-проверка остаются следующими этапами.


## Мал базар — 2026-10-16, ещё не слит

Команда из шести человек: mobile ведёт `apps/mobile`, основной API остаётся `apps/api`. Обновление интеграции `integration/team-mobile:f240b27` основано на PR #8, с ассетами 11c4e45 и выбранными изменениями витрины 8818e8b. От него создана `backend/livestock`: API 0.5, объявления, фото-адаптер, статистика, контракты Flutter. `0004_livestock` проверена только локально; общая Supabase остаётся 0003, новые маршруты требуют отдельной подготовки среды. Реальный JWT/локальный HTTP smoke прошёл; живые загрузки Storage и Flutter UI ещё не проверены. Полные результаты — последняя секция backend handoff.

## Актуальная интеграция команды

`main:8c932dd` уже включает PR #7 со вторым backend. По решению капитана отдельная ветка `integration/team-mvp` возвращает единую архитектуру: основной apps/api, Seller Frontend #3 как каркас, адаптированные ledger/voice/summary из #7, исходники публичной витрины и модели #6. Денежные правила backend сохранены. Публичный каталог и защищённые заявки реализованы на существующих таблицах до 0003_drafts; новая миграция не нужна, общая Supabase не мигрировалась и не очищалась.

Запуск и состав: [TEAM_INTEGRATION](TEAM_INTEGRATION.md). Итоговые проверки и ограничения — последняя секция [backend handoff](handoffs/backend.md). Эта ветка ещё не слита и не задеплоена. Последующие разделы ниже описывают историю отдельных этапов, не текущую готовность объединённого приложения.

Начальная точка документации — 15 октября 2026 года: `d8989a555888ccb5165efc8adc310f3d91c38bac`, только README. Разделы стартового плана ниже сохранены как история; актуальное состояние рабочих веток и ограничения интеграции приведены в конце. Наличие кода в feature-ветке не означает merge или деплой.

## Что подготовлено

- Продуктовое ТЗ, контракт API, исследование и план двух дней.
- Задания на пять ролей.
- Начальные сценарии проверки RU/KZ и образец manifest моделей.
- Правила GitHub и AI, файлы передачи, шаблоны задач и PR.

## Что нужно сделать первым

1. Капитан: доступы AI/БД/хостинга, каркас FastAPI, схемы OpenAPI.
2. Владелец кабинета: одно React-приложение, router, общие компоненты и API-клиент.
3. Публичный frontend: сцена из простых блоков и компоненты витрины.
4. Frontend учёта: ручная форма и подтверждение по общему контракту.
5. Художник: тестовый GLB, затем объёмы трёх площадок.

На старте готовый backend, frontend, 3D-модели и опубликованная web-ссылка не были подтверждены. Наличие AI-ключа, токена Telegram и аккаунтов хостинга отдельно проверяется капитаном; значения в этот файл не записываются.

## Состояние отдельных частей

Текущее содержимое обновляет владелец своей роли: [backend](handoffs/backend.md), [публичный frontend](handoffs/public-web.md), [кабинет](handoffs/seller-web.md), [учёт](handoffs/ledger-web.md), [3D](handoffs/assets-3d.md).

Капитан обновляет эту краткую сводку после существенной интеграции. В ней фиксируются реально слитые и проверенные возможности, а не желаемая готовность по расписанию.

## Проверено в рабочей ветке, ещё не слито — 2026-10-15

`backend/ledger-auth`: реализован ручной учёт с PostgreSQL и Supabase JWT/JWKS — клиенты, продажи, погашения, история/долги, итог дня, отмены. Проверены конкурентные записи, идемпотентность и изоляция на отдельной локальной PostgreSQL; live smoke с двумя реальными Supabase-пользователями прошёл на выделенной demo-базе. В ней сохранены учебные продажа/доплата. Контракты экспортированы в `packages/contracts`. Детали и команды — в [backend handoff](handoffs/backend.md).

Ручной этап запушен, [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4) открыт в `main` без автоматического слияния. Следующая ветка `backend/ai-drafts` основана на head журнала и добавляет текстовые/аудио Gemini-черновики с TTL, автором, точкой и атомарным однократным подтверждением. После review `0003_drafts` применена на Supabase `qadam-demo`: существующие данные сохранены, доступ клиентских ролей закрыт. Полный HTTP-сценарий с настоящими Supabase JWT, Gemini, журналом/summary и повторами прошёл. В `mart-demo-food` оставлена одна явно учебная продажа. 165 тестов прошли отдельно на локальной PostgreSQL; очищающие тесты на Supabase не запускались. Раздельные результаты — в backend handoff. Публичные каталоги/заявки, браузерная frontend-интеграция и деплой остаются следующими этапами.

## Проверка подключения команды — 2026-10-15, без merge/deploy

В отдельной рабочей копии проверены опубликованные PR #3 (`9b41561`, draft), #4 (`193f6e5`) и #5 (`2d2fc56`). Код совместим; при объединении конфликтуют README/PROJECT_STATUS, frontend generated.ts нужно обновить по AI OpenAPI. Backend: 165 тестов на отдельной PostgreSQL; frontend: 71 unit/component и 8 Chromium demo E2E, typecheck/lint/build успешны. Живой API-прогон с реальными JWT через опубликованный TypeScript-клиент подтвердил /me, создание клиента, продажу/доплату, историю/summary, повторы, CORS и изоляцию. В Supabase теперь 5 явно учебных операций; очистки не было. Это не проверка браузерного входа или полного пользовательского пути.

Frontend кабинета опубликован в draft PR #3, а денежные/AI и публичные модули ожидаются от соответствующих участников. Полный браузерный сценарий отложен до готовности команды. [Инструкция подключения](BACKEND_FRONTEND_CONNECTION.md) содержит commit, запуск, Base URL, env, businessId, результаты и порядок PR. Backend #4/#5 готовы к review с учётом зависимости; PR #3 пока требует интеграционной актуализации и live acceptance. Ничего не слито и не развёрнуто.

Последующая живая проверка Seller Frontend `9b41561` прошла в Chromium: обычный Supabase login A/B/A, `/me`, создание клиента, reload с восстановлением сессии, logout и изоляция точек. Это проверка существующего кабинета; денежные/AI-экраны всё ещё ожидаются от команды. Прямой запрос с JWT B к точке A дал 404; операций в Supabase осталось 5, новый учебный клиент сохранён. Временные пароли удалены из `.env`, браузерные артефакты с данными не создавались. Документация `afbef78` опубликована в `backend/integration-readiness`; подготовлены точный generated.ts patch и [воспроизведение на своём компьютере](SELLER_LIVE_ACCEPTANCE.md). После генерации check:api/typecheck и 45 контрактных тестов прошли в отдельной копии. Ветки команды, PR и деплой не изменялись.

## 2026-10-16: six-person integration update

New branch integration/team-mobile starts from PR #8. Updated venue assets and selected storefront UI are integrated and checked; Flutter contract published early. Mobile implementation is expected from the sixth participant. Livestock backend follows on its own dependent feature branch; shared Supabase remains 0003_drafts. No merge or deployment. See latest backend handoff for actual checks.
