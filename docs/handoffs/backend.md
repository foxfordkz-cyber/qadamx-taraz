# Передача работы backend

Роль: капитан, весь backend. Обновлено: 2026-10-15. Ветка `backend/ledger-auth`, исходный commit `ee1847a`. Ручной backend реализован и проверен на локальном PostgreSQL и на выделенном Supabase demo с двумя реальными пользователями. Изменения пока не закоммичены, PR/merge/deploy не выполнялись.

## Сделано

- При начале задачи исходники первого этапа отсутствовали в checkout (сохранились только окружение/кэши), рабочая ветка содержала документацию. Восстановлен один каркас `apps/api`, без параллельного приложения.
- FastAPI, Python 3.12, Pydantic 2, SQLAlchemy 2/Alembic/PostgreSQL, фиксированные зависимости `uv.lock`, настройки, health, единые ошибки и CORS. Health не обещает готовность внешних сервисов.
- Supabase JWT через PyJWT/JWKS: ES256/RS256, issuer/audience, срок, subject UUID, роль authenticated; anonymous/service-role/невалидные токены не допускаются. Все закрытые методы используют токен, все запросы к точке проверяют memberships; чужие сущности дают 404.
- `/api/v1/me`; получение/создание клиентов с остатками; ручная продажа, частичное погашение; история и открытые продажи с ограниченной keyset-пагинацией; итог дня `Asia/Almaty` и текущий долг; идемпотентная отмена ошибочной записи.
- Одна транзакция на денежную запись и запись идемпотентности. Порядок блокировок: membership FOR SHARE, business FOR UPDATE, исходная sale FOR UPDATE при погашении/отмене. Переплата исключается пересчётом под блокировкой. Повтор возвращает прежнюю операцию и исходный JSON-ответ; другой payload/action с тем же ключом — 409.
- Миграции `0001_catalog`, `0002_ledger`: восемь таблиц в закрытой `qadam`, составные FK принадлежности, ограничения денег, уникальность ключей/отмен, trigger запрета UPDATE/DELETE журнала. `drafts` и AI добавятся позже.
- Повторяемый seed: 3 площадки, 9 точек, 9 товаров, 9 учебных клиентов. Реальные владельцы привязываются только после проверки их Supabase access token и совпадения subject. Старые синтетические owner memberships удалены только у учебных точек; новые не создаются.
- Реальные владельцы Supabase привязаны: A — 6 точек, B — 3. Live smoke сохранил явно учебные продажу 3000 ₸/оплату 1000 ₸ и доплату 500 ₸. В точке `mart-demo-clothes` итог: продажи 300000, поступления 150000, долг 150000 тиынов. Две строки остаются для демонстрации; повторы не добавляют их снова.
- OpenAPI и примеры экспортированы, README запуска и общий контракт уточнены. Frontend и чужие handoff-файлы не менялись.

## Файлы и интерфейсы

- `apps/api/app/auth.py`, `config.py`, `db.py`, `main.py` — авторизация, подключения, приложение и ошибки.
- `apps/api/app/routers.py`, `services/ledger.py`, `models/__init__.py`, `schemas/__init__.py` — маршруты, транзакции, модели и схемы.
- `apps/api/migrations`, `app/seed.py` — миграции и проверенная привязка владельцев.
- `apps/api/tests` — JWT/JWKS, PostgreSQL, API, гонки, откат, контракты.
- `apps/api/scripts/with_env.py`, `scripts/smoke_manual.py` — выбор игнорируемой конфигурации и live demo smoke.
- `apps/api/README.md`, `packages/contracts/{openapi,examples,demo-seed}.json` — запуск и передача frontend. Экспорт не содержит memberships, реальных пользователей или секретов.

Контрактные уточнения отражены в [API](../team5/02_ARCHITECTURE_API.md) и `docs/DECISIONS.md`: лимит 100 млн ₸, схемы клиента/открытой продажи/отмены, курсоры, статусы 200/201, `customer_balance_minor=null` без клиента, сохранённый ответ идемпотентности, ошибка ненулевого draft_id. Потребителей frontend в checkout пока нет. Публичные методы, AI и заявки не выдаются за реализованные.

## Проверки

Все команды ниже из `apps/api`, Python 3.12.14. Cache/install Python находятся в игнорируемом `tmp/`.

- `uv sync` / `uv sync --locked` — зависимости установлены и закреплены.
- `.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q` — **45 passed**, без skipped. Есть одно deprecation-предупреждение Starlette о TestClient/httpx; ошибок нет. Использован настоящий PostgreSQL 17.11, не SQLite. Тестовый JWT подписывается ES256 и проверяется через HTTP JWKS; production auth dependency не подменяется.
- Проверены: 300000−100000=200000; доплата 50000 → долг150000 без роста продаж; повтор после COMMIT; одновременный одинаковый ключ; два одновременных погашения 100000 при долге150000 → один200/один409, долг50000; изоляция A/B и подмена customer/sale/cursor; откат операции и идемпотентности при внедрённом сбое; отмены и неизменность журнала; местная полночь; повтор seed, FK и денежная валидация.
- `.venv/Scripts/python -m ruff check app tests scripts migrations`, `ruff format --check app tests scripts migrations` — успешно.
- `.venv/Scripts/python -m app.export_contracts` и `--check` — экспорт актуален, примеры валидируются, ссылки OpenAPI разрешаются, закрытые методы имеют Bearer security.
- Локальная demo: `python scripts/with_env.py .env.local-postgres -m alembic upgrade head`, затем `alembic check` — применено, расхождений нет; `app.seed --demo` выполнен дважды.
- Supabase demo: проверены подключение, версия17.11, `alembic upgrade head`, `alembic check`, два последовательных seed в транзакциях. Ревизия `0002_ledger`, 3 площадки/9 точек/9 товаров/9 клиентов/9 memberships; права USAGE на `qadam` у anon/authenticated — false. Разрушающие тесты сюда не направлялись.
- `.venv/Scripts/python -m app.seed --demo --bind-owners` — реальные JWT проверены, привязка успешна.
- `.venv/Scripts/python scripts/smoke_manual.py --demo` — **PASS** на настоящих Supabase JWT и PostgreSQL: `/me`, собственные данные, чужие404, аноним401, продажа, доплата, оба повтора и summary300000/150000/150000.
- Отдельный процесс Uvicorn на `127.0.0.1:8766`: реальные HTTP health/docs/OpenAPI200, анонимный `/me`401, `/me` с настоящим Supabase-токеном200 (6 точек). Проверочный API-процесс остановлен.
- `git diff --check` и проверка игнорирования `.env*`, `.venv`, `tmp` — успешно; секреты не включены в экспорт/исходники.

## Зависимости и ограничения

Supabase demo и два реальных пользователя настроены, реквизиты только в игнорируемом `apps/api/.env`. Короткоживущие demo-токены требуют обновления обычным входом после истечения срока; API не использует постоянный обход авторизации. JWKS имеет ES256. `TEST_DATABASE_URL` в Supabase `.env` намеренно пуст.

Выделенная локальная PostgreSQL работает на `127.0.0.1:55432`; `.env.local-postgres` содержит отдельные `qadam_demo`/`qadam_test`. Бинарники/данные — в `tmp/postgres` и `tmp/qadam-pgdata-ledger`, в Git не входят. Windows sandbox не позволял pg_ctl запустить процесс; он запущен через разрешённое повышение доступа. На другой машине нужен свой PostgreSQL. Полный pytest по умолчанию без TEST_DATABASE_URL пропускает интеграционные тесты; команда выше явно подключает отдельную тестовую БД.

AI-черновиков пока нет: ненулевой `draft_id` даёт422 без записи. Не реализованы публичный каталог/витрина, HTTP-заявки, rate limiting этих будущих методов, frontend-интеграция и деплой. Счётчик заявок читает реальную таблицу, в demo он0. Записи одной точки сериализуются — сознательный предел производительности MVP. API не выполняет обновление Supabase-сессии и не проверяет онлайн отзыв уже выданного JWT до его истечения.

## Следующий шаг

1. Передать frontend OpenAPI и подключить ручную форму/клиентов/историю к Bearer API; сохранять Idempotency-Key при сетевом повторе.
2. Следующий backend-этап — AI-адаптер и черновики: отдельная таблица, автор/точка/TTL/однократное потребление в транзакции подтверждения. Не менять уже проверенный путь ручного ввода.
3. После этого публичные каталоги/заявки и деплой; проверять HTTPS и полноценный пользовательский сценарий. Опубликовать текущую ветку через PR по решению капитана.

## Журнал параллельной настройки Supabase

Ниже сохранены записи владельца настройки по ходу работы. Отметки ожидания/нулевых memberships и следующего шага в них исторические; актуальный результат ручного учёта и отдельной тестовой PostgreSQL описан выше.

## Supabase environment — 2026-10-15

В этом checkout подготовлен игнорируемый `apps/api/.env` для отдельного проекта `qadam-demo`: Session pooler PostgreSQL (SSL required), Supabase URL, issuer, audience и локальные origins Vite. Пароль базы пока заменён заглушкой; подключение к PostgreSQL и миграции не выполнялись. TEST_DATABASE_URL оставлен пустым: нельзя направлять разрушающие тесты в demo-базу.

Проверка текущим Python окружением: Settings принимает файл; публичный JWKS возвращает HTTP 200 и ключ ES256, совместимый с текущим backend. Пользователи Auth и DEMO_OWNER_* ещё не настроены. Следующий шаг: владелец локально добавляет пароль, затем проверка SELECT 1, проверенные миграции и создание двух demo Auth пользователей с привязкой seed. Секреты в handoff не записываются.

### Supabase connection and migrations verified

Password supplied locally by owner; SELECT 1 succeeded against qadam-demo. Applied Alembic upgrade head (0001_catalog, 0002_ledger) and app.seed.seed without owner binding. Verified revision 0002_ledger; counts: venues 3, businesses 9, catalog_items 9, customers 9, memberships 0, operations 0. has_schema_privilege USAGE on qadam is false for both anon and authenticated. No destructive tests run against demo database. Auth users still pending; browser form prepared for owner-a@example.test; second intended account owner-b@example.test. Next: user creates passwords/accounts, then obtain verified short-lived tokens locally and run seed --demo --bind-owners. No secrets committed.

### Auth accounts checked

Both owner-a@example.test and owner-b@example.test exist in auth.users with confirmed email and distinct IDs. Password login and membership binding await local password entry via outputs/connect-demo-owners.py (outside repository). Helper uses Supabase password grant, verifies real JWTs, calls existing verified_owners + seed, saves only short-lived tokens/subjects to ignored .env, checks /me, own customers, cross-owner access and anonymous 401 using FastAPI TestClient against real PostgreSQL. Helper syntax/imports checked; live login checks not yet executed. No memberships created in this step.

### Текущий итог Supabase/Auth: PASS

Предыдущие отметки ожидания паролей и привязки выше закрыты. Пользователь выполнил outputs/connect-demo-owners.py; локальный demo-auth-result.json подтверждает status=passed. Реальный вход обоих пользователей и проверка JWT успешны; A привязан к 6 магазинам, B к 3. Проверены /me и чтение своих клиентов через FastAPI TestClient с настоящей БД, без подмены авторизации. Без токена /me возвращает 401; доступ к чужим клиентам в обоих направлениях — 404. UUID и краткоживущие access tokens сохранены только в игнорируемом apps/api/.env; пароли пользователей скрипт не сохраняет.

Настройка demo PostgreSQL и Auth завершена. Это не проверка браузерного frontend или полного денежного сценария. Следующий этап: отдельная тестовая PostgreSQL для транзакционных тестов журнала, затем интеграция frontend; TEST_DATABASE_URL пока пуст. Истёкшие demo токены требуют повторного входа, постоянными ключами они не являются.
