# Интеграция главной и QA — 18 октября 2026

Проверочная база `a4ce3b046f917ff18d9d6ce6009a5bc2c0ba9f64`.
Проверенный код этапа тестовых исправлений: `8f0fa49`.
Работа выполнена в отдельной копии, ветка `integration/ordered-home-qa-20261018`.

## Порядок и состав

| Шаг | Принятый head | Merge | Собственные проверки |
|---|---|---|---|
| #89, главная сайта | `e919817083e69b64b0bc2311c571f9ccf5b8519e` | `3ca155b` | npm ci, check:api, typecheck, lint, 517 unit/component, build; public-design 1/1 |
| #91, QA-тесты и docs | `22dd3887762973b82646a04640b31b87a36e8475` | `d312530` | typecheck/lint/517 unit; assistant 6/6, assistant-qa 13/13, cabinet 10/10, release-surfaces 8/8 |
| #90, только отчёт и доказательства | `aa0ce33c970277ea525616a202773a6582604d87` | `7911953` | typecheck/lint/517 unit; QA 21/21 |
| Оставшиеся тестовые исправления | `a6f08ac`, `57b1187`, `8f0fa49` | обычные commits | typecheck/lint/517 unit; все конфигурации ниже |

Четыре ранее падавших hero-проверки #91 (RU/KZ × 360/1440) проходят после #89.
В #89 также есть связанные тесты, handoff и снимки, не только features/explore.
#91 меняет четыре E2E-файла и docs; production-кода в его diff нет.
#90 действительно меняет только docs. Его add/add конфликт с QA-handoff #91
разрешён сохранением обоих полных независимых отчётов. Их исторические результаты
не переписаны под текущую сборку. Файлы E2E из #91 интегратор не переписывал.

## Чистый main и первоначальные сбои

На неизменённом **a4ce3b0** самостоятельно воспроизведены:

- **5/5 FAIL customer-recovery**: финальный unexpected-assert видел новые GET
  summary и operations с outstanding_only=true. Проверки восстановления,
  одинаковых ключа/тела и числа POST до этого assertion проходили.
- **1/1 FAIL mobile-menu**: «Мне должны» искали внутри «Ещё».
- **3/3 FAIL ledger IDs в default**: тест ожидал ids, но конфиг не включал флаг
  и отправлял прежний q/limit. Это дополнительные существующие падения, не часть шести из #90.

Исправления ограничены тестами: узкий allowlist GET своей синтетической точки,
проверка истории в «Ещё» и долгов в основной навигации, IDs-флаг в default и
analytics-конфигах. Assertions ключа, тела, числа POST и запрета неожиданных
запросов сохранены. Меню по-прежнему проверяет Escape, историю браузера, фокус,
шрифты и размер всех touch targets не менее 44 px.

В промежуточном прогоне выявлены и устранены ошибки проверки, не приложения:

- мой новый assert ожидал is-active у основной ссылки; заменён на aria-current=page;
- прежний assert считал 7 touch targets; после переноса долгов их 8;
- WebKit отсутствовал: 5 Chromium PASS / 5 WebKit не запущены. Установлен
  требуемый Playwright webkit-2370, повтор всей конфигурации **10/10 PASS**;
- один QA-тест завершился ENOENT trace при параллельных наборах с вложенными
  outputDir. Последовательный повтор всей QA-конфигурации **21/21 PASS**.

Промежуточный прогон до уточнения порядка #91 остановлен; успехом не считается.
Никакой production-код ради зелёных регрессий не изменялся.

## Все существующие E2E-конфигурации

Последние результаты после исправлений. Наборы пересекаются, **их числа не складываются**.
Все работают с синтетическими API/Auth. Во всех строках 0 skipped, 0 retries.

| Конфигурация в apps/web | PASS |
|---|---:|
| playwright.config.ts | 38/38 |
| e2e/analytics.playwright.config.ts | 38/38 |
| e2e/assistant-qa.playwright.config.ts | 13/13 |
| e2e/assistant-release-surfaces.playwright.config.ts | 8/8 |
| e2e/assistant.playwright.config.ts | 6/6 |
| e2e/auth-onboarding.playwright.config.ts | 25/25 |
| e2e/cabinet-ai-first.playwright.config.ts | 10/10 |
| e2e/customer-recovery.playwright.config.ts | 5/5 |
| e2e/inquiry-accessibility.playwright.config.ts | 9/9 |
| e2e/ios-compatibility.playwright.config.ts | 10/10 |
| e2e/ledger-reading.playwright.config.ts | 6/6 |
| e2e/microphone.playwright.config.ts | 18/18 |
| e2e/qa.playwright.config.ts | 21/21 |
| e2e/registration-preview.playwright.config.ts | 6/6 |
| e2e/voice-integration.playwright.config.ts | 1/1 |

Воспроизведение из apps/web: `npm ci`, `npm run check:api`, `npm run typecheck`,
`npm run lint`, `npm test`, `npm run build`; затем **последовательно**
`node node_modules/playwright/cli.js test -c <конфигурация> --retries=0`.
Для desktop-WebKit предварительно `node node_modules/playwright/cli.js install webkit`.
Не запускать конфигурации одновременно в одной копии: default outputDir содержит
подкаталоги других наборов. Исходные локальные логи: tmp/home-demo-results.

## Границы результата

Backend и packages/contracts идентичны a4ce3b0. Render, Supabase, Environment,
миграции и memberships не менялись. Никаких живых AI-вопросов и денежных записей.
Микрофон — синтетическое устройство Chromium; WebKit на Windows — не физический
iPhone. Настоящий email callback и Android этим прогоном не принимались.
Существующие npm audit findings (1 moderate, 2 critical) и предупреждения о размере
bundle остаются отдельной задачей; зависимости не обновлялись.

Наличие этих commits в main не означает публикацию Pages. До отдельного ручного
upload остаётся прежний deployment `f89a486c-72e6-4188-bea8-9db5d8e15813`,
source `2ba2c09`. Render — последний подтверждённый в backend handoff source
`0a2ac3b`, API 0.7.1; в этой задаче сервер не переключался.
## Небольшой PR демо-кабинета

От опубликованного main `ab473f1` подготовлена `codex/demo-cabinet-overview`.
Отдельный [PR #93](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/93),
проверенный код `9f32f4123444ed28614794bca6d664c9ac58ca59`, включён следующим
обычным merge после тестовых исправлений. Полный SHA результата — commit этого отчёта.
Dashboard использует последний день существующего демо-снимка аналитики:
**12 000 ₸ продаж, 9 000 ₸ поступлений, 35 000 ₸ общего долга**.
Показаны «Демо», дата 2026-10-16 и «За учебный день», чтобы фиксированный пример
не выдавался за сегодняшний серверный итог. В этот же fixture-модуль добавлены
три примера открытых долгов для существующих demo-клиентов (1 500 / 9 000 / 7 000 ₸).
Это preview, а не полный перечень восьми должников аналитики. Вторая точка — нули
и пустой список. Live summary/ledger и запреты Demo-записи сохранены.

- Итоговые check:api, typecheck, lint, **520/520 unit/component (39 файлов)**, build — PASS.
- Новый dashboard-demo: **6/6**, RU/KZ × 360/390/1440, имена и суммы,
  смена точки, нулевой API-трафик, отсутствие console/page errors, запись денег отключена.
- После изменения Dashboard повторены cabinet **10/10**, assistant **6/6**,
  assistant-qa **13/13**, release-surfaces **8/8**. Это повтор части общей регрессии.
- Снимки RU 360 и KZ 1440 осмотрены; горизонтального overflow в шести сценариях нет.
  Это Chromium на Windows, не телефон. Снимки и stdout остались локально в tmp.
- При разработке исправлены ожидание готовности Auth и неверная опция тестового
  getByRole. Один ранний полный unit-прогон дал timeout beforeAll импорта Three.js
  при параллельной нагрузке (4 теста не стартовали). После завершения browser-прогонов
  весь набор прошёл последовательно; таймауты приложения/тестов не увеличены.

Следующий этап: review опубликованного analytics-redesign, hosted ZIP и ручной
Pages upload по согласованной части B. Новый Pages deployment не выполнялся.
