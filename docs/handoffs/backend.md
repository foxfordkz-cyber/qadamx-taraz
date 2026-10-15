# Передача работы backend

Роль: капитан, весь backend. Обновлено: 2026-10-15. Ветка: `backend/bootstrap-api`, исходный локальный commit `ee1847a`. Первый локальный этап реализован и проверен; изменения ещё не закоммичены, не опубликованы и не слиты. PR не создавался.

## Сделано

- Прочитаны инструкции, ТЗ и контракт. Исходное рабочее дерево чистое, `apps/api` отсутствовал. Попытка `git ls-remote origin refs/heads/main` завершилась ошибкой Windows Schannel `SEC_E_NO_CREDENTIALS`; актуальность удалённого main не подтверждена, история не изменялась.
- По уточнению капитана выполнен локальный этап без подключения Supabase, Gemini и Render.
- FastAPI на Python 3.12: `/health`, `/api/v1/health`, `/docs`, `/openapi.json`; ответ health `{"status":"ok","service":"qadam-api","stage":"bootstrap"}` подтверждает только процесс. Запуск без секретов и БД.
- Pydantic 2: `SaleCreate`, `RepaymentCreate`, `DraftResponse`, `OperationResponse`, `SummaryResponse`, `InquiryCreate`, `ErrorResponse`; discriminated union `OperationCreate`. Целые тиыны, запрет строк/float/bool, переплаты, долга без клиента и лишних входных полей.
- OpenAPI и проверяемые учебные JSON-примеры экспортируются в `packages/contracts`. В `paths` только реально работающие health-маршруты; будущие операции представлены схемами, без фиктивных успешных ответов.
- Единая ошибка `{error:{code,message,fields},request_id}`, заголовок `X-Request-ID`, CORS только для явно заданных origins. Текст ошибочного ввода и исключений не отражается в 422/500.
- SQLAlchemy 2 и первая Alembic-миграция: `venues`, `businesses`, `memberships`, `catalog_items`, `customers`, отдельная схема `qadam`, ограничения и индексы; доступ `PUBLIC`/`anon`/`authenticated` отозван. Автогенерация ограничена `qadam`.
- Insert-only seed в одной транзакции: три площадки, девять точек, два синтетических владельца (6 и 3 точки), девять товаров и девять покупателей. Детерминированные UUID, конфликт по PK не изменяет существующие строки. Названия явно учебные, `is_demo=true`; slug и `geometry_status=conceptual` согласованы с примером 3D-manifest.
- `uv.lock`, `.python-version`, `.env.example` без секретов, инструкция запуска и тесты. Чужие handoff-файлы и frontend не изменялись.

## Файлы и интерфейсы

- `apps/api/app/main.py`, `config.py` — приложение и настройки.
- `apps/api/app/schemas/__init__.py`, `examples.py`, `export_contracts.py` — источник контрактов, примеры, генератор.
- `apps/api/app/models/__init__.py`, `migrations/versions/0001_catalog.py`, `app/seed.py` — базовая БД и учебные данные.
- `apps/api/tests` — схемы, HTTP, CORS, ошибки, seed и отдельный PostgreSQL-тест.
- `packages/contracts/openapi.json`, `examples.json`, `demo-seed.json` — передача frontend, включая точные UUID и slug.
- `apps/api/README.md` — полный локальный запуск, миграции, seed и проверки. Локальный URL при запуске: `http://127.0.0.1:8000`, базовый путь будущих методов `/api/v1`.

Уточнения внесены в `docs/DECISIONS.md` и [контракт](../team5/02_ARCHITECTURE_API.md): максимум одной суммы 100 млн ₸ (`10_000_000_000` тиынов); баланс клиента `null` для продажи без клиента; структура кандидата продажи и `fields`; длины полей заявки. Потребителей в репозитории пока нет. Схемы сохраняют названия денежных полей ТЗ. Учебные subject не являются Supabase-аккаунтами и не предоставляют вход.

## Проверки

Команды выполнены из `apps/api` на Python 3.12.14. Из-за ограничений системного cache `UV_CACHE_DIR` и `UV_PYTHON_INSTALL_DIR` указывали в игнорируемый `tmp/` репозитория.

- `uv sync --locked` — успешно, зафиксированные зависимости установлены.
- `.venv/Scripts/python -m pytest -q` — 50 passed, 1 skipped. PostgreSQL-тест пропущен из-за отсутствия `TEST_DATABASE_URL`. Есть одно предупреждение Starlette о будущем переходе TestClient с httpx на httpx2; ошибок тестов нет.
- `.venv/Scripts/python -m ruff check app tests migrations` и `.venv/Scripts/python -m ruff format --check app tests migrations` — успешно.
- `.venv/Scripts/python -m app.export_contracts` и с `--check` — экспорт сформирован и совпадает с исходниками; примеры проходят Pydantic, ссылки `$ref` разрешаются.
- `.venv/Scripts/python -m alembic upgrade head --sql` и `.venv/Scripts/python -m alembic downgrade 0001_catalog:base --sql` — SQL успешно сгенерирован с учебным URL, без подключения к БД. Это не выполнение миграции на PostgreSQL.
- Отдельный процесс Uvicorn на `127.0.0.1:8765`: реальные HTTP-запросы `/health`, `/openapi.json`, `/docs` успешны. Проверочный процесс после проверки остановлен.
- `git diff --check` — успешно.

## Зависимости и ограничения

Нет настроенных внешних сервисов; Docker daemon недоступен. На живом PostgreSQL миграция, повторный seed и права ещё не проверены. Для этого подготовлен opt-in тест: пустая выделенная тестовая БД, `TEST_DATABASE_URL`, `uv run pytest -q -m postgres`. SQLite не используется как замена транзакционным проверкам.

Не реализованы JWT/JWKS, проверка memberships в запросах, деньги/остатки/идемпотентность/отмены, черновики и AI, публичные каталоги, заявки и отчёты. Их HTTP-маршруты отсутствуют (404). Pydantic проверяет только форму запроса; он не подтверждает существование и принадлежность UUID или текущий остаток. Финансовые сценарии из раздела «Минимальные проверки backend» ещё не выполнялись. Seed не создаёт пользователей в Supabase Auth. HTTPS-деплоя и живого AI-вызова нет.

## Следующий шаг

1. Подготовить отдельные demo/test PostgreSQL, применить миграцию и запустить PostgreSQL-тест; создать два реальных Supabase-аккаунта и явно привязать их subject к точкам.
2. Реализовать следующий этап 2–7 часов: JWT/JWKS и membership для каждого закрытого метода, миграции журнала/идемпотентности, ручную продажу и погашение в транзакции с блокировкой продажи.
3. Проверить изоляцию владельцев, повтор запроса, конфликт ключей, конкурентное погашение и отсутствие отрицательных остатков на PostgreSQL. После этого подключать AI-черновики.
4. Передать frontend экспорт схем через PR; после появления доступов проверить Gemini и опубликовать API на Render. Секреты передавать вне Git.
