# QA промпта 5 на общей версии main — 18 октября 2026

**Проверен main `2ba2c09ea2e5d154c8f9b305614d9da33c462b83`**, включая помощника
и аналитику #87 и кабинет #88. Прогон начат в 10:21 GMT+5 в отдельном worktree
`qa-assistant-release`, ветка `qa/assistant-release-main`. Проверки выполнил Codex.
Мобильные демо-цены #80 не переносились, Flutter не изменён.

**Вердикт: функциональный QA прошёл; общий выпуск по всему промпту ещё не принят.**
513 unit-тестов прошли одним запуском. Из 85 браузерных проверок прошла 81,
четыре упали на старом hero главной страницы. Кабинет с двумя AI-входами теперь
проверен. Физический Safari/Chrome и контрольный вопрос живому AI остаются открытыми.

Во время QA main обновился до **a4ce3b0** (API 0.7.1). После обычного merge
в QA-ветку дополнительно прошли **50/50 затронутых unit и 29/29 E2E**, API-типы,
typecheck, lint и build. Это повтор подмножества проверок, не ещё 79 новых сценариев.
Подробности обновления — ниже; полного повторного 513-тестового запуска на a4ce3b0
не было. Hero и денежный код этим обновлением не менялись.

## Что было сделано раньше

[QA-коммит 705fe58](https://github.com/foxfordkz-cyber/qadamx-taraz/commit/705fe58dd54c88e438a438ab2866c64e483d1f75)
создан 18 октября в 08:50 GMT+5 и уже входит в main через
[merge cfe4963](https://github.com/foxfordkz-cyber/qadamx-taraz/commit/cfe496309c32bd39c8a8fe75965456b3eacc7a2a)
в 09:06 GMT+5. `git merge-base --is-ancestor 705fe58 origin/main` вернул 0.
Git-автор этого коммита — `Aidana` из локальной конфигурации, поэтому он не виден
как коммит Гульнур. Это мой предыдущий прогон по поручению пользователя, а не
утверждение, что Гульнур лично выполнила QA. Его 509 unit / 66 E2E относились
к ветке #87 до интеграции нового кабинета; настоящий отчёт проверяет общую версию.

## Воспроизводимые результаты

Команды npm выполняются в `apps/web`. Node 22.19.0, Chromium Playwright,
один worker на набор. Сервисы Auth/API синтетические; внешний трафик блокируется.
Флаг помощника включён только в соответствующих тестовых конфигурациях.

| Команда | Результат |
|---|---|
| `npm run check:api` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --maxWorkers=1 --no-file-parallelism --hookTimeout=60000` | **513/513**, 37 файлов, один зелёный запуск, 242 с |
| `npm run build`, `VITE_ASSISTANT_ENABLED=true` | PASS; прежние предупреждения о больших chunks и пустом auth chunk без локальной конфигурации |
| `npm run test:e2e -- --config e2e/assistant-qa.playwright.config.ts` | **13/13** |
| `npm run test:e2e -- --config e2e/assistant.playwright.config.ts` | **6/6** |
| `npm run test:e2e -- --config e2e/cabinet-ai-first.playwright.config.ts` | **10/10** |
| Та же команда с `CABINET_ASSISTANT_ENABLED=false` | **1/1** |
| `npm run test:e2e -- --config e2e/voice-integration.playwright.config.ts` | **1/1** |
| `npm run test:e2e -- --config e2e/qa.playwright.config.ts` | **21/21** |
| `npm run test:e2e -- --config e2e/auth-onboarding.playwright.config.ts` | **25/25** |
| `npm run test:e2e -- --config e2e/assistant-release-surfaces.playwright.config.ts` | **4 PASS / 4 FAIL**, exit 1; все падения — hero |
| `node scripts/verify-pages.mjs` (из корня) | **9/9** HTTP/Content-Type проверок |

Для последних снимков перед release-набором установлено
`QADAM_QA_SCREENSHOT_ROOT=../../docs/qa/assistant-main-20261018`.
Файлы прошлой приёмки сохранены. [Машинная сводка и SHA-256 логов](assistant-main-20261018/results.json).
Локальные stdout: `apps/web/tmp/qa-main/*.log`; полные JSON помощника:
`apps/web/e2e/test-results/assistant-*.json`. Они не включают реальные пользовательские данные.

## Покрытие промпта 5

- Помощник: вопрос, четыре подсказки, ответ, ссылки действий, копирование точного
  текста, ожидание, 429, 503 с явным повтором, fallback, пустые факты, Demo без API.
  RU/KZ × 360/1440; аналитика и снимки дополнительно 390/1440. Unit покрывает
  timeout, 401, поздние ответы, отказ Clipboard и выключенный флаг.
- Аналитика: 7/30 дней, AI-итог, три главных суммы, дневной график, закрытые
  подробности, почасовой график после раскрытия, переход к должнику.
- Кабинет: оба AI-входа, фокус голосовой кнопки без автоматической записи,
  панель, Escape/возврат фокуса, Tab-цикл, смена языка/точки и отмена позднего
  ответа, серверный disabled, мобильная прокрутка, KZ при 200% текста.
- Деньги: продажа 3000/1000 → долг 2000 → доплата 500 → долг 1500;
  потеря ответа и повтор того же key/body, две операции в истории, reload,
  обновление аналитики и другая точка. Фикстуры подтверждают поведение клиента,
  не заменяют серверные тесты транзакций и идемпотентности.
- Изоляция, регистрация и callback: A/B, reload, отсутствие memberships,
  чужой business_id, 401, PKCE, повторная ссылка, поздняя старая сессия, Demo.

Первый запуск release-набора имел четыре ложных отказа кабинета: строгий accessible
name не учитывал подзаголовок новой кнопки, KZ-локатор ожидал прежнюю формулировку.
Исправлен только тест: допускается подзаголовок, используется фактическое
«Сатылымды айтыңыз». Проверки существования кнопок, href, открытия панели,
Escape, возврата фокуса и ширины сохранены. Повтор: все четыре проверки кабинета PASS.
Production-код в QA-ветке не менялся; `skip`/ожидаемые падения не добавлены.

## Допроверка API 0.7.1 на a4ce3b0

Изменения `0a2ac3b`/`a4ce3b0` уже находились в main: новый серверный `ai=false`
возвращает `source=facts`, явный вопрос существующего frontend передаёт `ai:true`.
Прочитаны новый контракт и backend handoff. В QA обновлены строгие ожидания тела
запроса в `assistant.spec.ts`, `assistant-qa.acceptance.ts` и `cabinet-ai-first.spec.ts`;
проверяется явный `ai:true`. Production-реализация взята из main без правок QA.

- `npm test -- src/test/assistant.test.tsx src/test/analytics-ui.test.tsx src/test/seller-navigation.test.tsx --maxWorkers=1 --no-file-parallelism` — **50/50**.
- Assistant QA — **13/13**, assistant/screenshots — **6/6**, cabinet enabled — **10/10**.
- `check:api`, `typecheck`, `lint`, `build` с `VITE_ASSISTANT_ENABLED=true` — **PASS**.

Повторные логи — `apps/web/tmp/qa-main/delta-071-*.log`; их хеши добавлены в
машинную сводку. UI автоматической сводки `ai=false` в этот QA не добавлялся.
Backend PostgreSQL-тесты из handoff не выдаются за выполненные этим прогоном.

## Непройденная проверка — REL-02, hero

URL `http://127.0.0.1:4227/`, исходники `2ba2c09`. Открыть главную, выбрать RU/KZ,
установить ширину 360 или 1440. Ожидание промпта: «Qadam — учёт продаж и долгов
голосом» / «Qadam — сату мен қарызды дауыспен есепке алу».
Фактически: «Найдите магазин на рынке Тараза» / «Тараз базарынан дүкен табыңыз».
Четыре варианта падают на проверке h1. Пункты нового hero/CTA должны быть повторены
после интеграции работы public-web; они не объявлены принятыми по существованию старых ссылок.

| Снимки | RU 360 | RU 1440 | KZ 360 | KZ 1440 |
|---|---|---|---|---|
| Кабинет, PASS | [PNG](assistant-main-20261018/cabinet-ru-360.png) | [PNG](assistant-main-20261018/cabinet-ru-1440.png) | [PNG](assistant-main-20261018/cabinet-kk-360.png) | [PNG](assistant-main-20261018/cabinet-kk-1440.png) |
| Hero, FAIL | [PNG](assistant-main-20261018/hero-ru-360.png) | [PNG](assistant-main-20261018/hero-ru-1440.png) | [PNG](assistant-main-20261018/hero-kk-360.png) | [PNG](assistant-main-20261018/hero-kk-1440.png) |

Помощник в аналитике: [RU 390](assistant-main-20261018/analytics-ru-390.png),
[RU 1440](assistant-main-20261018/analytics-ru-1440.png),
[KZ 390](assistant-main-20261018/analytics-kk-390.png),
[KZ 1440](assistant-main-20261018/analytics-kk-1440.png).
[Панель KZ, 360 px, 200% текста](assistant-main-20261018/panel-kk-360-text200.png).

## Production и оставшаяся ручная приёмка

18 октября **10:25 GMT+5**: `https://qadamx-taraz.pages.dev` отдал шесть маршрутов
`/`, `/login`, `/register`, `/auth/callback`, `/seller`, `/seller/analytics` с 200,
HTML и корнем SPA. Файлы `index-Bnzy6twA.js`, `auth-CB7MGzWB.js`,
`index-DOcOg911.css` ответили 200 с нужным Content-Type. Это read-only smoke,
не определение SHA deployment и не проверка авторизованного вопроса.

**Открыто:** настоящий контрольный вопрос AI от тестового продавца не отправлен;
данный QA выполнен на синтетических Auth/API. Ручной Safari на iPhone и Chrome
на физическом телефоне не выполнен: доступных устройств нет. Эмуляция viewport и
CSS reflow не считаются физической приёмкой. После выпуска проверить на телефонах
вход/демо, вопрос, копирование, панель, 7/30 дней и скролл, зафиксировать модель,
версию браузера, URL/SHA и снимок. Денежные записи в общей БД не выполнялись.

Следующий шаг: интегрировать новый hero, повторить четыре соответствующие проверки,
выполнить физическую приёмку и отдельный разрешённый контрольный вопрос.
