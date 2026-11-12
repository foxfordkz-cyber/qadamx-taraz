# Stage 3 — управление клиентами, продажами и долгами

Дата: 12.11.2026. Ветка: `feature/qadam-stage3-business`.
Точная база: `feature/qadam-stage2-ai-voice`,
`7a5e1b775a5290ba282b78cba708849b3e0dc20a`.
Отдельный worktree; main и PR #104/#105 не изменяются.

## Что уже существовало

Неизменяемый денежный журнал, подтверждение пользователем, атомарная запись с
Idempotency-Key, блокировка конкурентных погашений, компенсационная отмена,
Auth/JWT/Membership, создание/поиск/восстановление клиента, долги, WhatsApp,
дневной Summary и его Share, Analytics, Research, RU/KZ, AI/Voice Stage 2.
Эти механизмы повторно используются, а не создаются заново.

## Реализация Stage 3

- Карточка клиента: полные серверные итоги за всё время, текущий долг,
  последняя операция, страницы покупок/погашений/отмен.
- История: серверные фильтры дат, клиента, суммы, типа и текущего статуса продажи
  до пагинации; выбранные фильтры сохраняются в URL.
- Долги: те же фильтры, календарные группы 0–7/8–30/31+ дней, явное копирование
  напоминания RU/KZ с ручным fallback при недоступном Clipboard.
- Summary: отчёт за произвольный период до 366 дней; продажи и поступления с
  учётом отмен, начальный/конечный/текущий долг, CSV и печатная версия.
- Read-only API 0.8.0: `report` и дополнительные параметры `operations`.
  Суммы — SQL-агрегаты signed ledger, один snapshot для отчёта.
  AI-схема OpenSale не меняется, возраст выдаётся отдельным AgedOpenSale.

Общий долг не равен сумме загруженной страницы и не ограничен фильтрами списка.
Срок оплаты не задан: возраст не называется просрочкой.
История отправки напоминаний не добавлена: приложение не знает, отправил ли
продавец подготовленный текст. Автоматической отправки нет.

## Границы изменений

Новые read-модули: `app/business_schemas.py`, `services/business_reads.py`.
В `services/ledger.py` изменена только `history`; финансовая запись,
idempotency, locks, reversal, Auth, Membership, схемы БД и миграции сохранены.
Frontend: `features/ledger/BusinessFilters.tsx`, `BusinessReport.tsx`,
`reportData.ts`, `businessText.ts`, `business.css`, интеграция в Customers,
Ledger и Summary, runtime-проверка возраста. Контракты/примеры/TS генерируются
из Pydantic. Никаких новых npm/Python зависимостей.

## Проверки

Полный backend pytest: **480 passed, zero skipped**, 1200.70 с на Windows.
Включены настоящие PostgreSQL-тесты, tenant isolation, atomicity/rollback,
конкурентные погашения, idempotency и 15 новых бизнес read-сценариев.

Первый полный frontend: **657 passed, 13 failed, 4 skipped**, 49 файлов,
1290.82 с. Таймауты пришлись на пять старых файлов при параллельной нагрузке.
Их полный повтор вместе с новыми бизнес-тестами: **109/109 passed**, 269.24 с,
один worker, testTimeout=15000 и hookTimeout=60000; проверки не ослаблялись.
После финальной проверки точной арифметики валидатора ещё **17/17 business tests**
прошли (17.41 с). Суммарное покрытие — **677 уникальных frontend-тестов**, включая
17 новых. Первый прогон не скрывается и не называется полностью зелёным.

Ruff check/format, backend export contracts, TypeScript, lint, build,
frontend check:api, Prettier для изменённых файлов и git diff --check прошли.
Полный format:check в Stage 3 не повторялся: в Stage 2 оставались два неизменённых
baseline-файла dashboard-demo.test.tsx и whatsapp-components.test.tsx.
Build сохраняет предупреждение о крупных существующих chunks (>500 kB).
Production readiness из unit-тестов не следует.

Chrome → настоящий FastAPI/JWT → изолированная PostgreSQL: **1 passed**,
142.91 с; повтор после print CSS/снимков — **1 passed**, 157.19 с.
Supabase transport синтетический; серверные операции и проверки прав
настоящие. Создание клиента, ручная продажа, двойное нажатие, погашение и отмена,
вторая продажа, карточка клиента/история погашений, age/status/amount/type filters,
CSV download, print CSS, Reload и смена точки пройдены.

Контроль: **4 journal rows, sales=420000, receipts=220000, debt=200000 тиынов**,
то есть **4200 / 2200 / 2000 ₸**. UI, API и SQL совпали. Чужой JWT получает 404.
RU/KZ, Clipboard и ширины 360/390/768/1440 px проверены в браузере, без
горизонтального скролла. Это эмуляция viewport, не физический телефон.
Первые headed-попытки не засчитаны: timeout ожидания UI 5 с и закрывшийся Chrome
до завершения входа. Финальная headless-попытка прошла, причины закрытия окна
не установлены. Физический принтер и реальный Supabase login не проверены.

Дополнительные Playwright-регрессии: **6 ledger reading + 7 Summary sharing +
1 Voice integration = 14 passed**, установленный Chrome, синтетический transport.
Итого 15 уникальных E2E-сценариев с учётом настоящего PostgreSQL harness.
Эти 14 тестов не являются проверкой живого AI или Supabase.

Скриншоты только синтетических данных:
[отчёт](evidence/stage3-business/report-desktop.png),
[карточка](evidence/stage3-business/customer-profile.png),
[KZ mobile](evidence/stage3-business/debts-kz-mobile.png),
[print CSS](evidence/stage3-business/report-print.png).

Первый тест дат ошибочно пытался изменить timestamp уже записанного журнала:
защита PostgreSQL правильно отказала. Исправлена только тестовая подготовка —
вставки синтетических исторических операций без отключения trigger.
Первый запуск browser harness не дошёл до браузера из-за Windows ACL общей
папки pytest. Используется уникальный каталог внутри игнорируемого tmp.

## Воспроизведение

Все команды из apps/api, Python 3.12, зависимости из uv.lock:

```powershell
$env:TEST_DATABASE_URL = 'postgresql+psycopg://qadam_stage3_test@127.0.0.1:55449/qadam_stage3_test'
$env:DATABASE_URL = 'postgresql+psycopg://unused@127.0.0.1:1/unconnected'
$env:PYTHONIOENCODING = 'utf-8'
# Только новая пустая локальная *_test база. Fixture проверяет это до миграций.
New-Item -ItemType Directory -Force ../../tmp | Out-Null
$testTemp = Join-Path (Resolve-Path ../../tmp) ('pytest-' + [guid]::NewGuid())
uv run pytest -q --basetemp $testTemp
uv run python -m app.export_contracts --check
# Отдельный запуск после полного pytest:
$browserTemp = Join-Path (Resolve-Path ../../tmp) ('browser-' + [guid]::NewGuid())
uv run pytest tests/stage3_browser_acceptance.py -q -s --basetemp $browserTemp
```

Harness запускает реальный FastAPI на 8348, frontend на 4348 и установленный
Chrome (headless; QADAM_QA_HEADED=1 включает окно). Supabase sign-in/JWKS синтетические; JWT проверяется,
Membership и все business API/SQL реальные. Никакого hosted DB/AI/микрофона.
Синтетический временный token нельзя публиковать. После теста серверы остановлены,
fixture удаляет только собственную схему подтверждённой пустой test-базы.

Из apps/web:

```powershell
npm run generate:api
npm run check:api
npm run typecheck
npm run lint
npm test -- --maxWorkers=1 --minWorkers=1
npm run build
```

Финальный targeted прогон: `npm test -- src/test/business-reads.test.tsx --maxWorkers=1 --minWorkers=1 --testTimeout=15000`.
Валидатор сверяет opening + sales − receipts через BigInt после проверки
безопасных целых значений: промежуточная сумма не теряет тиын у MAX_SAFE_INTEGER.
Это проверка ответа сервера, а не новый источник финансовых итогов.

Повтор после таймаутов (те же assertions):

```powershell
npm test -- src/test/qa-customers-regression.test.tsx src/test/assistant.test.tsx src/test/analytics-ui.test.tsx src/test/mal-bazar.test.tsx src/test/analytics-redesign.test.tsx src/test/business-reads.test.tsx --maxWorkers=1 --minWorkers=1 --testTimeout=15000 --hookTimeout=60000
foreach ($suite in @('ledger','summary','voice')) {
  $env:QADAM_STAGE3_SUITE = $suite
  npx playwright test -c e2e/stage3-regression.playwright.config.ts --timeout=60000
}
```

В этой рабочей копии зависимости взяты из существующих соответствующих lock-файлам
venv/node_modules соседних worktrees, без обновления пакетов. Python вызывался
напрямую из `qadam-cross-device-readiness/apps/api/.venv/Scripts/python.exe`.
Для чистой копии использовать `uv sync --locked` и `npm ci`.
Summary sharing тест обновляет шесть старых screenshots в docs/screenshots:
его артефакты сохранены в игнорируемом tmp, исходные изображения восстановлены.
В PR входят только новые Stage 3 screenshots.

## Ручная проверка кандидата

Подключить web к backend этой же ветки в своей тестовой среде.
Создать клиента и продажу 3000/1000, погасить 500, отменить погашение,
создать продажу 1200/1200. Ожидается 4200/2200/2000 ₸.
Открыть клиента → карточка; Историю → фильтры; Долги → возраст/копирование;
Итог дня → отчёт за период → CSV/печать. Переключить RU/KZ и торговую точку.
При старом backend новый отчёт выдаст ошибку с Retry; показатели не подменяются.
Новый UI фильтров нельзя выпускать отдельно от backend 0.8.0: старые версии
могут игнорировать новые query-параметры. Проверка matching backend обязательна.

## Ограничения

Это кандидат для review в Stage 2, не утверждение о production readiness.
Новых реальных клиентских данных, облачных миграций, внешних AI-запросов,
production deploy и merge нет. Demo для нового отчёта явно требует backend.
CSV выгружает агрегированный отчёт, не весь построчный журнал.
Физическая печать/телефон/Supabase email/live AI здесь не проверяются.

## Решение о готовности

| Среда | Решение | Основание / следующий шаг |
| --- | --- | --- |
| Локальное синтетическое демо | GO | Настоящий Chrome → FastAPI → PostgreSQL; UI/API/SQL 4200/2200/2000 |
| Staging acceptance | NO-GO пока | Review кандидата, matching backend 0.8.0, настоящий Supabase/JWT и собственная тестовая точка; ещё не выполнено |
| Production | NO-GO | Stage 1/2/3 остаются Draft; нет разрешённого release и hosted acceptance |

Новых функциональных блокеров в проверенной локальной цепочке нет.
Не реализованы автоматическая отправка/история доставки напоминаний, экспорт
всего построчного журнала и due dates — это отдельные задачи.
Production, общая БД, исходные ветки и PR #104/#105 не менялись.

## Публикация и передача

Проверенная реализация: `3afc4e37692c2e27697315d18be277d5359e3a61`.
Обычный push новой ветки успешен, local/remote SHA совпали.
Повторный fetch подтвердил неизменность базы Stage 2 `7a5e1b7`.
До первого push удалённой ветки не было, поэтому pull не применялся.
[Draft PR #106](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/106)
направлен строго в `feature/qadam-stage2-ai-voice`.
PR #104 и #105 проверены: open Draft, их HEAD не изменены.

На commit реализации Vercel status и Vercel Preview Comments — success.
GitHub Actions для этого SHA: 0 запусков; серверные тесты выполнены локально.
Это существующая автоматизация Preview, не проверка настоящего backend или
разрешение на production release. Merge/deploy вручную не выполнялись.
GitHub-плагин вернул 403 при создании PR; PR создан через уже разрешённую
Git-авторизацию того же репозитория, без вывода credentials.

Эта запись — отдельный документационный commit поверх реализации; точный
текущий HEAD доступен через `git log -1 --format=%H` и в PR.
Следующему исполнителю: оставить PR Draft, прочитать контракт, согласовать
staging после review, запускать только изолированную синтетическую test-БД.
