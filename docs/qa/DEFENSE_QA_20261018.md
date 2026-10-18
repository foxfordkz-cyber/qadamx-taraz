# Финальная QA-проверка для капитана — 18 октября 2026

Проверенный source: `origin/main` → `2ba2c09ea2e5d154c8f9b305614d9da33c462b83`.
Проверки выполнены лично QA; результаты других участников не засчитаны как собственные.
Роль после уточнения задания: только проверки и отчёт, без изменения исходников и тестов.

**Итог: обязательные три набора — 29/29 PASS; опубликованный Pages smoke — 9/9 PASS.
Полная приёмка не закрыта: физические телефоны недоступны, расширенная регрессия имеет повторные падения.**

## Источник и окружение

- `git fetch origin --prune` выполнен перед проверками и перед подготовкой отчёта;
  проверенный HEAD main не изменился. Чистый snapshot создан через отдельный detached worktree
  `work/qadam-final-qa-main-check`. Ветка main не переключалась и не редактировалась.
- Документация: `AGENTS.md`, `docs/TEAM_INTEGRATION.md`, handoff, `docs/submission/DEFENSE_CHECKLIST.md`.
- Публикация Pages подтверждена капитаном в
  [release report](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/f44338240333a8d8d5d9b9618641341bc71592cf/docs/PAGES_ASSISTANT_RELEASE_20261018.md):
  09:55 GMT+5, deployment `f89a486c-72e6-4188-bea8-9db5d8e15813`, source `2ba2c09`.
  Это подтверждение капитана; собственная проверка ниже относится к доступности и UI production URL.
- Windows, локальный Playwright Chromium с синтетическими HTTP/Auth fixtures;
  ручная проверка опубликованного сайта — Codex IAB на Windows.
  IAB не заменяет физические Chrome/Android и Safari/iPhone.
- Для responsive-проверки измерена фактическая ширина `window.innerWidth`: 360 и 1440 CSS px.
  Параметры окна IAB скорректированы с учётом масштаба среды; временный viewport затем сброшен.
- Backend, OpenAPI, generated types, финансовая логика, main и чужие PR не изменялись.
  Публикуется только документация и доказательства QA.

## Проверка — устройство — результат

| Проверка                                                                    | Устройство / среда                                                  | Результат                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                    | Чистый snapshot main, Windows                                       | PASS, 357 packages; npm сообщает 3 audit findings (1 moderate, 2 critical), отдельный security triage не выполнялся         |
| `cabinet-ai-first.playwright.config.ts`                                     | Playwright Chromium, synthetic API, RU/KZ, 390/1440 и narrow reflow | **10/10 PASS**, 1.3 мин                                                                                                     |
| `assistant.playwright.config.ts`                                            | Playwright Chromium, synthetic API, RU/KZ, 390/1440                 | **6/6 PASS**, 28.8 с                                                                                                        |
| `assistant-qa.playwright.config.ts`                                         | Playwright Chromium, synthetic API, RU/KZ, 360/1440                 | **13/13 PASS**, 36.2 с                                                                                                      |
| Повторы трёх обязательных наборов                                           | —                                                                   | Не требовались: падений нет                                                                                                 |
| `node scripts/verify-pages.mjs`                                             | Production HTTPS, 10:04 GMT+5                                       | **9/9 PASS**, HTTP 200: 6 страниц и 3 entry assets                                                                          |
| Главная → Кайкармет → учебный магазин                                       | Production IAB, RU/KZ, mobile viewport и desktop                    | PASS; каталог и форма заявки открываются, заявка не отправлялась                                                            |
| Android CTA                                                                 | Production IAB, RU/KZ                                               | href ведёт на GitHub release `mobile-v0.5.2-review68.1`; APK не устанавливался                                              |
| `/login` → «Посмотреть демо»                                                | Production IAB, 360 px                                              | PASS, явная подпись учебных данных и отсутствия сохранения                                                                  |
| «Скажите о продаже», «Спросите Qadam»                                       | Production IAB, RU/KZ, 360/1440                                     | PASS, обе кнопки доступны                                                                                                   |
| Пример помощника                                                            | Production IAB, RU/KZ, 360/1440                                     | PASS, «Пример ответа в демо, без AI» / «AI қолданылмайды»; живой вопрос не задавался                                        |
| Escape и верхний крестик панели                                             | Production IAB                                                      | PASS; возврат на главную и восстановление фокуса наблюдались                                                                |
| Главная, Продажа, Мне должны, Аналитика, Заявки                             | Production IAB, KZ mobile и RU desktop                              | PASS, переходы через навигацию; финансовые записи в Demo заблокированы                                                      |
| «Ещё»: Клиенты, Каталог, История, Итог дня                                  | Production IAB, KZ mobile и RU desktop                              | PASS, все страницы открываются; mobile-меню закрывается при переходе                                                        |
| Аналитика: объяснение, 3 KPI, напоминания, свёрнутое «Подробнее»            | Production IAB, RU/KZ                                               | PASS; синтетические суммы явно подписаны, порядок элементов проверен                                                        |
| Горизонтальный скролл страницы / KZ                                         | Production IAB, 360 CSS px                                          | PASS на проверенных страницах; `scrollWidth <= innerWidth`, подписи доступны. Внутренняя прокрутка графика предусмотрена UI |
| Консоль                                                                     | Production IAB, публичные страницы и Demo                           | **0 error**, четыре предупреждения deprecation `THREE.Clock` в 3D bundle                                                    |
| Физический Safari / iPhone                                                  | Устройства нет                                                      | **BLOCKED**, не проверено                                                                                                   |
| Физический Chrome / Android                                                 | Устройства нет                                                      | **BLOCKED**, не проверено; viewport не является приёмкой телефона                                                           |
| Продажа 3000 / 1000 → долг 2000 → доплата 500 → долг 1500; повторный submit | Живой учебный аккаунт и разрешение не предоставлены                 | **NOT RUN**, финансовые записи не создавались                                                                               |
| Живой вопрос помощнику                                                      | Выполняет капитан                                                   | **NOT RUN по инструкции**                                                                                                   |

Собственные [результаты Pages smoke](defense-20261018/verify-pages.json) и
[наблюдения UI, ширины и console warnings](defense-20261018/live-observations.json).
HTTP 200 не доказывает живую авторизацию, доступ к БД или финансовую идемпотентность.

## Повторные падения расширенной регрессии

Расширенные наборы были запущены до уточнения последнего чек-листа. Их результаты не скрыты
и не смешаны с 29 обязательными PASS. Каждый перечисленный ниже сценарий повторён один раз отдельно
на неизменённых тестах свежего main. По правилу капитана два падения — **блокер зелёной расширенной регрессии**.
Капитану сообщено сразу после получения повторного падения. Production-исправления не выполнялись.

### QA-FINAL-01 — пять customer recovery tests не учитывают чтения Dashboard

URL тестовой страницы: `http://127.0.0.1:4207/seller/customers`;
начальный Dashboard: `http://127.0.0.1:4207/seller`.
Production URL для контекста: `https://qadamx-taraz.pages.dev/seller/customers`.
**Дефект клиента или сервера на live этим не доказан.**

Шаги: `npm ci` в `apps/web`, затем запустить существующий customer recovery сценарий отдельно:

```powershell
npx playwright test -c e2e/customer-recovery.playwright.config.ts -g "lost acknowledgement after synthetic commit resolves through completed lookup without a second POST"
```

Для остальных сценариев заменить `-g` на точный префикс из таблицы.
В Windows после зависания оболочки npx второй запуск был остановлен до старта теста;
оставшиеся повторы выполнены эквивалентным установленным CLI:
`node node_modules/playwright/cli.js test -c <config> -g <prefix> --retries=0 --trace=retain-on-failure`.

| Сценарий / `-g`                                                                                       | Ожидание                                                              | Факт при первом запуске и отдельном повторе                                                 | Доказательства                                                            |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `lost acknowledgement after synthetic commit resolves through completed lookup without a second POST` | Нет второго POST, lookup завершает recovery, неизвестных запросов нет | Recovery assertions проходят; финальный `server.unexpected` содержит GET summary/operations | [кадр](defense-20261018/retry-1.jpg), [лог](defense-20261018/retry-1.txt) |
| `not_observed preserves the unknown attempt`                                                          | Повтор только с тем же ключом и body                                  | Проверки ключа/body проходят; тот же финальный assert падает                                | [кадр](defense-20261018/retry-2.jpg), [лог](defense-20261018/retry-2.txt) |
| `reload checks the original key with GET only`                                                        | Reload проверяет исходный ключ                                        | Проверки recovery проходят; тот же финальный assert падает                                  | [кадр](defense-20261018/retry-3.jpg), [лог](defense-20261018/retry-3.txt) |
| `two real tabs queue native Web Locks`                                                                | Две вкладки не создают два POST                                       | Проверка одного POST проходит; тот же финальный assert падает                               | [кадр](defense-20261018/retry-4.jpg), [лог](defense-20261018/retry-4.txt) |
| `a legacy intent with unknown API origin`                                                             | Старый intent не мигрирует и не отправляется                          | Проверки блокировки проходят; тот же финальный assert падает                                | [кадр](defense-20261018/retry-5.jpg), [лог](defense-20261018/retry-5.txt) |

Наблюдаемая причина: fixture считает неизвестными новые разрешённые чтения
`GET /api/v1/businesses/<synthetic-id>/summary` и `GET .../operations` при входе на Dashboard.
Следующий шаг владельцу тестов: согласованно добавить эти чтения в fixture и повторить весь набор;
не удалять assertions о количестве POST, ключе, body и recovery.

### QA-FINAL-02 — integration mobile-menu test ожидает старое меню

URL: `http://127.0.0.1:4181/seller`; production-контекст: `https://qadamx-taraz.pages.dev/seller`.

```powershell
npx playwright test -c e2e/analytics.playwright.config.ts -g "integrated mobile menu closes on Escape and route change"
```

Шаги теста: открыть Demo на mobile, открыть «Ещё», закрыть Escape, открыть снова,
найти в диалоге ссылку «Мне должны». Тест ждёт её и завершается timeout на
`integration-design.spec.ts:106`. В текущем дизайне «Мне должны» находится в основной нижней
навигации; «Ещё» содержит Клиентов, Каталог, Историю и Итог дня.
Ручные переходы на production работают. Не перемещать пункты UI ради устаревшего селектора.
Результат отдельного повтора фиксируется в [логе](defense-20261018/retry-6.txt),
фактическое меню — [кадр теста](defense-20261018/retry-6.jpg),
[production KZ](defense-20261018/live-more-kz-360.jpg).

## Дополнительные результаты и сохранённый контекст

До уточнения роли на том же production source выполнены собственные проверки:
check:api, typecheck, lint, build — PASS; unit/component — **513/513 PASS** (37 файлов).
Синтетические browser-наборы: financial journey 1/1, seller QA 13/13,
registration 25/25, cabinet-disabled 1/1; analytics aggregate 29 PASS / 1 FAIL (QA-FINAL-02).
Это не проверки живой БД, реального email или физического микрофона.

Ранее подготовленные локальные QA-изменения **не входят в публикуемый diff**:
две новые late-response проверки прошли в составе 15 assistant-qa tests, но обязательный результат
выше получен заново на исходных 13 тестах main. Старый release-surfaces набор дал 8 FAIL:
4 устаревших точных селектора CTA, 4 ожидания Hero из ещё не включённой ветки
`feature/home-clear-purpose:e919817`. Эти ожидания не подменяют последний чек-лист капитана.
Локальный CSS `zoom: 2` probe публичной страницы при исходных 390 px также дал overflow;
это отдельный stress probe, а не физический browser zoom и не измеренный live viewport 360.
Полные первоначальные логи и снимки сохранены локально, не объявлены успешными.

Первоначальный format:check дал FAIL из-за сгенерированного JSON под `e2e/test-results`.
Полный format:check после уточнения scope не повторялся; обход или production-исправление не публикуются.
Известные build warnings о размере bundle и npm audit findings остаются отдельной задачей владельцев.

## Снимки production

- [Главная витрины RU desktop](defense-20261018/live-home-ru-1440.jpg).
- [Учебный магазин KZ mobile](defense-20261018/live-shop-kz-360.jpg).
- [Кабинет KZ 360](defense-20261018/live-dashboard-kz-360.jpg),
  [кабинет RU desktop](defense-20261018/live-dashboard-ru-1440.jpg).
- [Помощник KZ 360](defense-20261018/live-assistant-demo-kz-360.jpg),
  [помощник RU desktop](defense-20261018/live-assistant-demo-ru-1440.jpg).
- [Аналитика KZ 360](defense-20261018/live-analytics-kz-360.jpg),
  [аналитика RU desktop](defense-20261018/live-analytics-ru-1440.jpg).

Снимки `live-*` получены с опубликованного сайта; `retry-*` — фактические screencast frames
из локальных Playwright traces с синтетическими данными. Это разные среды.

## Продолжение капитану

1. Назначить владельца двух подтверждённых проблем расширенных тестов; никаких автоматических исправлений в этой QA-задаче.
2. На физических iPhone/Safari и Android/Chrome пройти тот же RU/KZ чек-лист и приложить модель/OS/browser/снимки.
3. Только после разрешения на учебную точку проверить финансовую цепочку и повторный submit.
4. Живой вопрос помощнику задаёт капитан. QA платных/live AI-запросов не делал.

Команды обязательного повторного QA:

```powershell
git fetch origin --prune
# Проверить новый SHA; использовать отдельный snapshot, не менять main.
cd apps/web
npm ci
npx playwright test -c e2e/cabinet-ai-first.playwright.config.ts
npx playwright test -c e2e/assistant.playwright.config.ts
npx playwright test -c e2e/assistant-qa.playwright.config.ts
cd ../..
node scripts/verify-pages.mjs
```

Повторно упавший отдельный тест не запускать циклом до зелёного: один `-g` retry,
затем отчёт капитану с шагами, URL и доказательствами.
