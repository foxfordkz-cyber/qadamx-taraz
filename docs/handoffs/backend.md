# Передача работы backend

Роль: капитан, весь backend. Обновлено: 2026-10-15. Ручной этап `backend/ledger-auth` сохранён коммитом `78483b8`, интеграция с опубликованным bootstrap — `193f6e5`; ветка запушена, открыт [PR #4 в main](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4), без слияния. Исходная `0001_catalog` сохранена из main (`ced32e7`, PR #2), тесты каркаса сохранены и адаптированы. Текущая ветка `backend/ai-drafts` основана на head PR журнала. Актуальный результат AI-этапа и следующий шаг — в последней секции этого файла. Ни merge, ни деплой не выполнены.

## Сделано в ручном этапе (PR #4)

- При начале задачи исходники первого этапа отсутствовали в checkout (сохранились только окружение/кэши), рабочая ветка содержала документацию. Восстановлен один каркас `apps/api`, без параллельного приложения.
- FastAPI, Python 3.12, Pydantic 2, SQLAlchemy 2/Alembic/PostgreSQL, фиксированные зависимости `uv.lock`, настройки, health, единые ошибки и CORS. Health не обещает готовность внешних сервисов.
- Supabase JWT через PyJWT/JWKS: ES256/RS256, issuer/audience, срок, subject UUID, роль authenticated; anonymous/service-role/невалидные токены не допускаются. Все закрытые методы используют токен, все запросы к точке проверяют memberships; чужие сущности дают 404.
- `/api/v1/me`; получение/создание клиентов с остатками; ручная продажа, частичное погашение; история и открытые продажи с ограниченной keyset-пагинацией; итог дня `Asia/Almaty` и текущий долг; идемпотентная отмена ошибочной записи.
- Одна транзакция на денежную запись и запись идемпотентности. Порядок блокировок: membership FOR SHARE, business FOR UPDATE, исходная sale FOR UPDATE при погашении/отмене. Переплата исключается пересчётом под блокировкой. Повтор возвращает прежнюю операцию и исходный JSON-ответ; другой payload/action с тем же ключом — 409.
- Миграции `0001_catalog`, `0002_ledger`: восемь таблиц в закрытой `qadam`, составные FK принадлежности, ограничения денег, уникальность ключей/отмен, trigger запрета UPDATE/DELETE журнала. AI-таблица добавлена следующим этапом, см. ниже.
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

Контрактные уточнения ручного этапа отражены в [API](../team5/02_ARCHITECTURE_API.md) и `docs/DECISIONS.md`: лимит 100 млн ₸, схемы клиента/открытой продажи/отмены, курсоры, статусы 200/201, `customer_balance_minor=null` без клиента, сохранённый ответ идемпотентности. Потребителей frontend в checkout пока нет. Публичные методы и заявки не реализованы. Поддержка ненулевого `draft_id` добавлена AI-этапом ниже.

## Проверки

Все команды ниже из `apps/api`, Python 3.12.14. Cache/install Python находятся в игнорируемом `tmp/`.

- `uv sync` / `uv sync --locked` — зависимости установлены и закреплены.
- `.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q` — **101 passed** после интеграции тестов bootstrap из main (до интеграции 45), без skipped. Есть одно deprecation-предупреждение Starlette о TestClient/httpx; ошибок нет. Использован настоящий PostgreSQL 17.11, не SQLite. Тестовый JWT подписывается ES256 и проверяется через HTTP JWKS; production auth dependency не подменяется.
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

В PR #4 AI ещё не было; текущая реализация описана ниже. Не реализованы публичный каталог/витрина, HTTP-заявки, rate limiting этих будущих методов, frontend-интеграция и деплой. Счётчик заявок читает реальную таблицу, в demo он0. Записи одной точки сериализуются — сознательный предел производительности MVP. API не выполняет обновление Supabase-сессии и не проверяет онлайн отзыв уже выданного JWT до его истечения.

## План после ручного этапа (история; актуальный план ниже)

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

## Актуальный итог AI-этапа — 2026-10-15, `backend/ai-drafts`

### Сделано и границы публикации

- Завершённый журнал проверен на секреты, сохранён, запушен и передан через [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4): head `backend/ledger-auth`, base `main`, последний commit `193f6e5`. Слияние не выполнялось. Новая AI-ветка основана на этом commit; её изменения не добавлены в PR #4.
- `app/services/ai.py`: серверный Gemini REST `generateContent`, фиксированный Google endpoint, ключ в заголовке, Pydantic JSON Schema и повторная валидация ответа. Модель не получает UUID/список клиентов/балансы/токены, не имеет tools или доступа к БД. Суммы — строго целые тиыны; неясная оплата/сумма остаётся null. Проверяется наличие текстовых свидетельств в исходной фразе/транскрипте. Это дополнительная проверка формы ответа, не доказательство правильного понимания речи.
- `app/draft_routes.py`, `services/drafts.py`: авторизованный multipart `POST /api/v1/businesses/{id}/drafts`, ровно text либо audio, locale ru/kk/auto; сквозной лимит тела, до 4000 символов текста. Кандидаты клиентов/продаж берутся только из выбранной точки, до 20; одинаковые/неизвестные имена требуют выбора, погашение всегда требует выбора продажи. Уточнения RU/KZ в `missing_fields`/`questions`. Membership проверяется до и после AI; во время вызова провайдера SQL-транзакция и соединение не удерживаются.
- `app/services/audio.py`: проверка MIME/реального контейнера, размера 8 MiB и декодированной длительности 30 секунд. WAV, WebM/Opus, Ogg/Opus, MP3, M4A/MP4, FLAC → PCM WAV 16 kHz mono. Только разрешённые demuxers, запрещены playlist/удалённые ссылки. PyAV 17.1.0 из locked wheel, отдельный FFmpeg CLI не нужен. Аудио не сохраняется после запроса; Files API не используется.
- `models.Draft`, `0003_drafts`: приватный JSON черновика, author `created_by`, business, время PostgreSQL, TTL 30 минут, ссылка на операцию потребления с tenant FK. Миграции 0001/0002 сохранены. `services/ledger.py` добавляет только проверку/блокировку/потребление draft к прежней транзакции: membership → business → draft → sale. Денежные формулы, ограничения и отмены не изменены.
- Подтверждение идёт через существующий POST operations и конечные поля продавца. Чужой draft/автор/точка — 404; истёкший — 409 `DRAFT_EXPIRED`; использованный с новым ключом — 409 `DRAFT_USED`. Исходный ключ/тело повторяет прежний ответ даже после TTL, с проверкой автора. Ошибка/rollback не потребляет draft. Ручной ввод с `draft_id=null` остаётся независимым от AI.
- Общий timeout 25 секунд включает один повтор невалидного JSON/схемы. Сеть/HTTP/квота не повторяются автоматически. Ошибки 503 `AI_UNAVAILABLE`, 504 `AI_TIMEOUT`; без мока и без записи денег. UI сохраняет введённые данные и открывает ручную форму. Для выбранной Flash установлен thinking level low, общий deadline не увеличен.
- Обновлены OpenAPI, валидируемые примеры успешного/неясного/repayment draft, подтверждения и ошибки, API README, общий контракт, DECISIONS и сводка состояния. Frontend-файлы и чужие handoff не менялись. `scripts/smoke_ai.py` запускает явно запрошенный live разбор без БД и без вывода ключей.

### Фактические локальные проверки (Gemini заменён заглушкой)

Команды из `apps/api`:

```powershell
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m alembic upgrade head
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m alembic check
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m app.seed --demo
# Та же команда seed выполнена второй раз.
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q --tb=short
.venv/Scripts/python -m ruff check app tests scripts migrations
.venv/Scripts/python -m ruff format --check app tests scripts migrations
.venv/Scripts/python -m app.export_contracts --check
```

Результат: **162 passed**, без skipped, PostgreSQL 17.11; одно deprecation-предупреждение Starlette TestClient/httpx. Ruff и экспорт актуальны. Локальная demo-БД обновлена до `0003_drafts`, `alembic check` не обнаружил drift, двойной seed успешен. Отдельная пустая `qadam_test` использовалась для upgrade/check/downgrade и очищалась только защитной fixture; Supabase не очищался и не мигрировался на этом AI-этапе.

Проверены прежние денежные сценарии (3000−1000=2000; +500 → долг1500 без увеличения продаж; concurrent repayment; idempotency; изоляция A/B; reversals) и новый путь: создание draft без operations/idempotency; 30-минутный TTL; чужая точка/автор, в том числе совладелец; неизвестный UUID; повтор с тем же и новым ключом; две конкурентные попытки потребления; недопустимое исправление; rollback после пометки потребления; отзыв membership во время AI; уточнение неизвестной оплаты/двух имён/неизвестного клиента; scoped sale candidates; общий deadline и отмена async-запроса; повтор JSON ровно один раз; API-ошибки не раскрывают сообщения провайдера; ручная операция после отказа AI.

Аудиотесты реально кодируют/декодируют синтетическую тишину в WebM, Ogg, MP3, M4A/MP4, FLAC и WAV. Проверены неверный MIME, повреждённые данные, playlist, лишние/дублирующие поля, URL вместо файла, 31 секунда, размер и лимит всего тела. Эти тесты проверяют pipeline, **не качество распознавания речи**.

`git diff --check` и поиск значений локальных паролей/API key/access tokens по versionable файлам успешны. `.env`, `.env.local-postgres`, временные инструменты, аудио и данные PostgreSQL игнорируются Git. В `.env` по поручению владельца изменён только `AI_MODEL`; ключ, DB URL, Supabase-параметры и токены не перезаписаны и не выводились.

### Живой Gemini — отдельно от тестов

- `GET /v1beta/models` с предоставленным локально ключом вернул 200. Выбран точный `AI_MODEL=gemini-3.6-flash`, стабильная Flash с audio input и structured output по [официальному описанию](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash). `gemini-3.8-flash` при проверке отвечала 503/high demand. Пробный старый 3.5 alias отвечал 200, но документация сообщает перенаправление на 3.6, поэтому alias не оставлен в конфигурации. Платный тариф/биллинг не подключались; численные квоты проекта не измерены.
- По ходу live прогонов успешно проверены **11 уникальных текстовых fixture**: `ru01–ru08`, `kk01`, `kk02`, `mix01`. Подтверждены 300000/100000, полная оплата, явный долг=0 оплаты, частичное погашение, неизвестная сумма/оплата=null, запрос неизвестного типа и смешанная фраза. `ru08` после первоначального отказа отдельно вернул валидный unknown; `kk02` после отказа отдельно вернул 200000/200000.
- Полный непрерывный набор **20/20 не пройден**: прогоны останавливались на временной недоступности (`ru08`, `kk02`, `kk03`) и timeout (`ru04`; повторный отдельный прогон прошёл). Остальные KZ/mixed-фразы не считаются проверенными. Сбои показаны как ошибки, не заменены заготовкой.
- Живое аудио: локально синтезирован WAV голосом Windows Microsoft Irina (RU), фраза «Продал товар на три тысячи тенге, покупатель оплатил полностью». `smoke_ai.py --live --audio ../../tmp/ai-synthetic-ru.wav --expected-total-minor 300000 --expected-received-minor 300000` → PASS, kind sale, непустая транскрипция, обе суммы 300000. Файл только в игнорируемом `tmp`. Это **синтетическая русская речь**, не голос продавца/телефон/шум рынка; KZ-аудио пока не проверено.
- Live прогоны проверяли извлечение без БД. HTTP→авторизация→draft→подтверждение→журнал проверен отдельно на реальном локальном PostgreSQL с заглушкой Gemini. Совместный живой Gemini+Supabase/frontend сценарий ещё не выполнен.

### Оставшиеся ограничения и следующий шаг

1. Review и ручное слияние PR #4 выполняет капитан. AI-ветка зависит от него; перед её отдельной публикацией сверить новый main и контракт. Автослияние не включать.
2. Повторить оставшиеся 9 текстовых fixture после стабилизации провайдера, записать реальные короткие RU/KZ-аудио с телефона и проверить суммы/неясности с носителем языка. Текущие live результаты не гарантируют качество всех будущих фраз.
3. Для запуска AI на Supabase применить **только новую добавочную `0003_drafts`** отдельным release-step после review. Сейчас Supabase на `0002_ledger`; `.env` сохранён. Очищающие pytest туда не направлять. Затем проверить live draft без записи, отдельное подтверждение и повторы с реальными владельцами/обновлёнными access tokens.
4. Передать frontend обновлённые OpenAPI/примеры: хранить форму при 503/504, показывать вопросы/кандидатов, отправлять выбранные поля с draft_id и стабильным Idempotency-Key; ручной путь сохраняется. Реальной интеграции UI/телефона/деплоя пока нет.
5. Просроченные drafts остаются в БД; плановая очистка/политика хранения и лимит частоты AI-запросов пока не реализованы. Кандидаты ограничены 20 и буквальным поиском; для полного списка пользоваться GET. Следующий функциональный backend-этап — публичный каталог и заявки, затем общий пользовательский сценарий и HTTPS-деплой.
