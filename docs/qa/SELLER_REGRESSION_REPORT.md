# Seller regression — независимый QA-отчёт

Дата: 2026-10-16. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz.
База: `feature/seller-dashboard` @ `a77f1a02b240dbf9e8c627937a5cb6445d92fb51`.
Рабочая ветка: `test/seller-regression`. Работа выполнена в отдельной облачной копии, не на Windows-компьютере пользователя.

**Готовность не подтверждена:** 127/130 Vitest checks passed, 3 воспроизводимых дефекта, browser/live acceptance заблокированы. Production-код не исправлялся по границам ТЗ.

## Объём и исходные данные

Все обязательные файлы найдены и прочитаны: AGENTS.md, README.md, docs/team5/02_ARCHITECTURE_API.md, SELLER_FRONTEND_HANDOFF.md, SELLER_FRONTEND_INTEGRATION.md, PROJECT_STATUS.md, DECISIONS.md, packages/contracts/openapi.json, apps/web/package.json. Также изучены CONTRIBUTING, QA/team/handoff инструкции и существующие тесты. Указания handoff о работе frontend в другой ветке не применялись к отдельной QA-задаче: использована ветка из прямого ТЗ.

Backend tree совпадает с `193f6e5`; принятый OpenAPI — с `2d2fc56`. Проверено read-only diff, чужие ветки не объединялись. OpenAPI 3.1.0, API 0.3.0.

Добавлены 56 Vitest-сценариев: Auth/изоляция 17, Customers 27, Contract 9, регрессии дефектов 3. Добавлены 13 browser-сценариев, изолированный QA-конфиг и synthetic fixtures. Исходные 74 Vitest-теста сохранены и проходят. Подробная [матрица](SELLER_TEST_MATRIX.md) отличает новые проверки от существующих.

## Фактически выполненные проверки

Окружение: Linux cloud, Git 2.51.1, Node v24.19.0, npm 11.9.0, Vitest 3.2.7, Vite 7.3.7. Зависимости из неизменённого package-lock.

| Команда из apps/web | Результат |
|---|---|
| `npm ci` | Passed, 304 packages; предупреждения npm о http-proxy и deprecated dependencies |
| Исходный `npm test` до изменений | Passed: 74 tests, 6 files |
| `npm run check:api` | Passed: regenerated output совпал с generated.ts, файл не перезаписывался |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, max-warnings 0 |
| Финальный `npm test` | **Failed: 127 passed / 3 failed, 10 files**; все failures QA-001/002/003 |
| `npm run build` | Passed; предупреждение empty auth chunk при отсутствии live env |
| `npx prettier --check src/test/qa-*.ts src/test/qa-*.tsx e2e/qa*.ts` | Passed |
| `npx playwright install chromium` | Blocked: downloaded archive invalid/truncated, `End of central directory record signature not found` |
| `npx playwright install --only-shell chromium` | Blocked: та же ошибка для headless shell |
| `npm run test:e2e -- --config e2e/qa.playwright.config.ts --list` | Passed: 21 tests = 13 новых + 8 прежних |
| `npm run test:e2e -- --config e2e/qa.playwright.config.ts --max-failures=1` | Blocked до выполнения сценария: `browserType.launch: Executable doesn't exist ... chromium_headless_shell-1248/...`; runner 1 failed, 20 did not run |

QA-config используется вместо стандартного config, чтобы запускать настоящий App с синтетическими Auth/API URL и **не запускать** `screenshots.spec.ts`, который перезаписывает docs/screenshots. Снимки первого агента не менялись. Port 4175, server reuse отключён. Fixtures перехватывают Auth/API и блокируют внешние browser requests. Это не настоящий Supabase/API.

Начальные ошибки новых тестов (неподдерживаемый RTL `exact` в role options, ожидание нулевого количества Query objects вместо отсутствия private data) исправлены в QA-коде. После 401 mounted observer законно пересоздаёт пустой disabled query: проверяется `state.data === undefined`. Это не заявлено дефектом приложения. Typecheck/lint и полный unit-прогон повторены после исправления.

## Failed: QA-001 — поздний 401 истекает новую сессию того же пользователя

Приоритет P2, владелец seller frontend/AuthProvider. Воспроизведение: `npm test -- src/test/qa-known-defects.test.tsx -t QA-001`.

1. Войти как A, в настоящей форме начать создание клиента, задержать POST-ответ. Мутация не передаёт AbortSignal и продолжает выполняться после смены сессии.
2. Получить auth event B и загрузить B; затем auth event новой A с новым token и generation/scope.
3. Вернуть 401 на первый запрос A.
4. Ожидание: новая A остаётся рабочей. Факт: `expired === true`, текущий приватный кэш сброшен, показывается reauth.

Причина по чтению production `src/app/auth.tsx`: `markExpired` сравнивает user ID, но не поколение сессии. Обычный A→B проверен отдельно и проходит. Предложение владельцу: привязать callbacks к актуальному поколению и проверять его при завершении token/request. Не менять только тест, скрывая ошибку. Разглашение данных/обход серверных прав этим тестом не доказаны; воспроизведён ошибочный сброс сессии.

## Failed: QA-002 — response cursor слабее request cursor

Приоритет P2 (contract mismatch), владелец backend/contracts совместно с frontend. Воспроизведение: `npm test -- src/test/qa-known-defects.test.tsx -t QA-002`.

Request `GET customers.cursor` — `string format:uuid | null`. `Page_CustomerResponse_.next_cursor` — `string | null` без UUID format. Reader `readCustomers` требует UUID. Поэтому значение `opaque-page-token`, допустимое опубликованной response schema, отклоняется frontend. Тест сначала подтверждает это поведение, затем требует согласованный response format и падает.

Согласовать контракт с капитаном: для принятой UUID-пагинации указать UUID в response schema и регенерировать типы у владельца. Не ослаблять reader наугад. Это несоответствие спецификации/потребителя, **не** доказанный отказ живой пагинации: нынешний backend может всегда возвращать UUID. У других Page schemas также строковый next_cursor; они пока не подключены к seller gateway.

## Failed: QA-003 — UTF-16 length отклоняет разрешённый Unicode input

Приоритет P2 (совместимость данных), владелец seller frontend/bindings. Воспроизведение: `npm test -- src/test/qa-known-defects.test.tsx -t QA-003`.

OpenAPI CustomerCreate допускает 200 символов display_name. `"😀".repeat(200)` содержит 200 Unicode code points, но JavaScript `.length` равен 400. `customerBody` выбрасывает `VALIDATION_ERROR` до отправки API. Аналогичный `.length` применяется runtime text reader. RU/KZ BMP-символы в граничных тестах проходят; проблема касается символов вне BMP.

Основание: [JSON Schema Validation 2020-12, §6.3.1](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.3.1) задаёт длину в символах JSON. Владельцу согласовать подсчёт code points на write/read и ограничения полей UI. Generated.ts/OpenAPI вручную не редактировать. Серверное принятие этой строки в настоящей БД не проверялось.

Все три проверки — обычные `it`, без skip/todo/it.fails. Они намеренно сохраняют красный regression gate до исправления соответствующими владельцами.

## Mock verified / Contract verified

Проверены настоящие App/AuthProvider/RuntimeProvider/BusinessProvider, hooks, cache и HTTP-client с синтетическими ответами. Успешны вход/restore, защищённые маршруты, отсутствие JWT, logout, A/B, поздний ответ A, business selection/revocation, scopes/drafts, GET/POST/search/pagination, duplicate names, optional contact, malformed JSON, empty/oversize fields, HTTP ошибки и отсутствие ложного успеха. POST invalidation ограничена текущим business/scope; мутации не повторяются автоматически.

Контрактные проверки подтверждают Bearer, внутренние `$ref`, запросы gateway только к существующим methods/paths, nullable/defaults, integer minor units и опубликованный error envelope. 403/429/500 проверяются как robustness responses, **не объявляются** описанными response codes в текущем customers OpenAPI. `check:api` проверяет воспроизводимость генерации без модификации generated.ts.

Demo restrictions дополнены негативными live-ветками ошибок; существующие unit/component тесты Demo повторно прошли. Новый browser сценарий отсутствия финансовых запросов остаётся Blocked.

## Blocked / Live verified

**Live verified: нет собственных результатов.** `http://127.0.0.1:8000/api/v1/health` → connection refused. `apps/api/.env` и `apps/web/.env.local` отсутствуют. Реальные пароли/JWT/БД не использовались. Миграции и seed не запускались. Результаты капитана не выдаются за наши.

- Browser: 13 новых сценариев написаны и проходят typecheck/lint/discovery, но их выполнение/стабильность ещё не подтверждены из-за отсутствия Chromium. Нужен запуск в подготовленном окружении.
- Live: JWT signature/expiry/issuer/audience/JWKS, CORS, действительные memberships/foreign IDs, persistence после reload, grants/RLS/tenant FK и финансовые транзакции требуют сервера и двух тестовых продавцов. Моки не доказывают PostgreSQL security.
- QA-G01, timeout gap: клиент не устанавливает собственный deadline; customer mutation не передаёт AbortSignal. Проверены синтетический TimeoutError и caller-provided cancellation. Они не доказывают автоматическое завершение реально зависшего POST. Согласовать timeout/retry UX у владельца, избегая повторного создания при неизвестном результате первого POST.
- Generated multipart type не обеспечивает XOR text/audio; это известное ограничение handoff, а не готовая AI-интеграция. Сам XOR сохранён в OpenAPI и проверен.

## Файлы и границы

Добавлены только:

1. `apps/web/src/test/qa-fixtures.tsx`
2. `apps/web/src/test/qa-auth-regression.test.tsx`
3. `apps/web/src/test/qa-customers-regression.test.tsx`
4. `apps/web/src/test/qa-contract-regression.test.ts`
5. `apps/web/src/test/qa-known-defects.test.tsx`
6. `apps/web/e2e/qa-fixtures.ts`
7. `apps/web/e2e/qa-seller-regression.spec.ts`
8. `apps/web/e2e/qa.playwright.config.ts`
9. `docs/qa/SELLER_TEST_MATRIX.md`
10. `docs/qa/SELLER_REGRESSION_REPORT.md`

Нет изменений production React/CSS/Auth/client/backend/OpenAPI/generated/package files/README/handoff/screenshots. Существующие тесты не редактировались. Подставные JWT/пароль в fixtures явно синтетические, реальные секреты отсутствуют.

Контрольные SHA-256 неизменённых файлов:

- OpenAPI: `3ffcc77c0d6a8a49c3382e6d4e30081c1ca19869ae42aebd4301d79dbff38e38`.
- generated.ts: `910c864364104ce07942eb611d66f3a885d20ad719dd01e849597e2e4f130be1`.

## Git и передача

Clone/fetch прошли. Удалённая QA-ветка при начале отсутствовала; локальная создана от принятой frontend-ветки. Upstream frontend снят, чтобы обычный push/pull не затронул чужую ветку.

Предварительный push dry-run заблокирован: `fatal: could not read Username for 'https://github.com': terminal prompts disabled`. Нет настроенной GitHub-аутентификации; GitHub integration предложена, подключение не подтверждено. Финальные commit/push результаты записываются ниже после выполнения.

Цель Draft PR: base `feature/seller-dashboard`, compare `test/seller-regression`, title `test(seller): auth, API and regression coverage`. Merge/force push запрещены и не выполнялись.

Первому Codex передать QA-001 и QA-003 с reproduction tests, QA-G01; капитану — QA-002 и live acceptance матрицу. До снятия блокировок и исправлений PR должен оставаться Draft, проверки не считать полностью зелёными.
