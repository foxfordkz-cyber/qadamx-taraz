# Qadam API — первый локальный этап

Реализованы FastAPI, `/health`, `/api/v1/health`, `/docs`, `/openapi.json`, семь схем из ТЗ, единый формат ошибок и CORS по явному списку origins. Health подтверждает только работу процесса. Сервис не подключается к БД или AI при запуске.

Авторизация, денежные операции, AI и прикладные маршруты `/api/v1` ещё не реализованы: запросы к ним получают 404, а не демонстрационный успех. Схемы в OpenAPI позволяют frontend начать формы; наличие схемы не означает готовность метода.

## Запуск (PowerShell, из корня репозитория)

Требуется `uv`; Python 3.12 устанавливается им автоматически. Зависимости зафиксированы в `uv.lock`.

```powershell
cd apps/api
uv sync --locked
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Локальный URL: `http://127.0.0.1:8000`, Swagger: `http://127.0.0.1:8000/docs`. `.env` для этого запуска не нужен. При ограничении доступа к системному cache перед `uv sync` можно задать пути внутри репозитория:

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '../../tmp/uv-cache'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $PWD '../../tmp/python'
```

Для настройки скопировать `.env.example` в `.env` и заполнить локально. Переменные: `DATABASE_URL`, `SUPABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `AI_API_KEY`, `AI_MODEL`, `ALLOWED_ORIGINS`. Последние параметры Auth/AI зарезервированы для следующего этапа; сейчас к внешним сервисам запросов нет. `ALLOWED_ORIGINS` — JSON-массив точных origins, например `["http://localhost:5173"]`. По умолчанию массив пуст. Секреты не коммитить.

## PostgreSQL и учебные данные

Первая миграция создаёт пять таблиц (`venues`, `businesses`, `memberships`, `catalog_items`, `customers`) в схеме `qadam`. Не включать `qadam` в exposed schemas Supabase Data API. Миграция отзывает доступ `PUBLIC`, а при наличии ролей — также `anon` и `authenticated`. При добавлении новых таблиц эти ограничения нужно сохранить. Четыре таблицы журнала, черновиков и заявок добавляются следующим этапом.

В `.env` указать `DATABASE_URL` вида `postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`. Команды из `apps/api`:

```powershell
uv run alembic upgrade head
uv run python -m app.seed --demo
```

Использовать отдельную demo-БД. Seed выполняется атомарно, имеет детерминированные UUID и `ON CONFLICT DO NOTHING` по первичному ключу: повтор не перезаписывает строки. При конфликте другого уникального ключа транзакция завершается ошибкой. Seed не удаляет данные. Он создаёт три площадки, девять точек, девять товаров и девять вымышленных покупателей; шесть точек принадлежат учебному владельцу A, три — B. UUID владельцев не дают возможности входа. Реальные пользователи Supabase и привязка их subject к memberships — следующий этап.

Точные UUID и slug: `packages/contracts/demo-seed.json`. Slug точки: `<venue>-demo-<clothes|food|home>`, площадки: `mart`, `kaikarmet`, `auyl-bereke`, геометрия `conceptual` — в соответствии с примером 3D-manifest.

## Контракты и проверки

```powershell
uv run python -m app.export_contracts
uv run python -m app.export_contracts --check
uv run pytest -q
uv run ruff check app tests migrations
uv run ruff format --check app tests migrations
```

Экспорт записывает `packages/contracts/openapi.json`, `examples.json`, `demo-seed.json`. Примеры синтетические, это не результат живого AI. Деньги принимаются только JSON-целыми: строки, float и bool отвергаются. Лимит одной суммы — 10 000 000 000 тиынов (100 млн ₸). Проверка принадлежности UUID и текущего остатка должна выполняться будущим сервисом внутри транзакции; Pydantic этого не заменяет.

При наличии **пустой выделенной тестовой PostgreSQL**, задать `TEST_DATABASE_URL` и выполнить `uv run pytest -q -m postgres`. Тест применяет миграцию, проверяет соответствие моделей, повторяет seed, проверяет количества и откатывает миграцию. Не направлять его в demo/рабочую/общую БД. Без переменной тест явно пропускается. SQLite не используется для имитации PostgreSQL-проверок.

Для генерации SQL без соединения с БД: `uv run alembic upgrade head --sql` (нужен синтаксически корректный `DATABASE_URL`). Это проверка генерации, не доказательство выполнения SQL на PostgreSQL.

Внешние AI, Supabase Auth, PostgreSQL и Render в этом этапе не проверены; деплой по решению капитана отложен до появления конфигурации. Следующий этап: реальные Auth/JWKS и memberships, миграция журнала, атомарная ручная продажа/погашение с идемпотентностью и PostgreSQL-тестами изоляции и конкуренции.
