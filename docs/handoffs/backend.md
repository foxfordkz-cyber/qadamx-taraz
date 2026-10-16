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

## Реализация AI-этапа — 2026-10-15, `ad107f5` (итог интеграции ниже)

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

## Актуальная интеграция AI + Supabase — 2026-10-15

### Review и локальные тесты

Проверен `ad107f5f7e883a8a1e7bf8e95d5c270aa74be071`: `0003_drafts`, модели, маршруты, авторизация, создание/подтверждение, тесты. Дефектов в проверках прав, TTL и транзакции потребления не обнаружено; изменения runtime-кода и миграции не потребовались. Денежные правила и функциональность не расширены. Исправлены устаревшие сообщения README/сводки о неприменённой Supabase-миграции и неподтверждённом полном сценарии.

- `draft_id` ищется по id + business + created_by под блокировкой до возврата идемпотентного ответа. Даже совладелец не подтверждает/повторяет чужой draft. При создании membership проверяется повторно после Gemini.
- Срок 30 минут задаётся по `clock_timestamp()` PostgreSQL. Проверка времени выполняется после ожидания бизнес-блокировки, чтобы просроченный в очереди запрос не прошёл.
- При новом ключе consumed draft даёт 409; при исходном ключе/теле возвращается прежний ответ. Для разных ключей блокировки business/draft предотвращают вторую операцию; одинаковый ключ при гонке возвращает один ответ обоим запросам.
- INSERT operation, UPDATE consumed_operation_id и INSERT idempotency_records выполняются одной SQLAlchemy-транзакцией. HTTP-успех — только после COMMIT. Тест перед COMMIT подтвердил откат всех трёх изменений.
- В миграции проверены tenant FK, unique consumed_operation_id, expiry constraint, индексы, REVOKE PUBLIC/anon/authenticated. Прямые Supabase Data API роли не получают доступ к draft.

Добавлены три содержательные проверки в `apps/api/tests/test_drafts.py`: гонка с одинаковым ключом, ошибка непосредственно перед COMMIT после flush всех трёх записей, истечение срока во время ожидания business lock. Команды из `apps/api`:

```powershell
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest tests/test_drafts.py tests/test_ledger.py tests/test_postgres.py -q --tb=short
.venv/Scripts/python scripts/with_env.py .env.local-postgres -m pytest -q --tb=short
.venv/Scripts/python -m ruff check app tests scripts migrations
.venv/Scripts/python -m ruff format --check app tests scripts migrations
.venv/Scripts/python -m app.export_contracts --check
```

Результат: **36 targeted passed, 165 total passed**, без skipped, одна прежняя deprecation Starlette/httpx. Ruff и экспорт успешно. Настоящая локальная PostgreSQL 17.11; Gemini в pytest — заглушка, JWT подписаны тестовым ключом и проверены через JWKS. На Supabase pytest/очистка не выполнялись.

### Применение миграции на qadam-demo

После локальных проверок выполнен `alembic upgrade 0003_drafts` через проверяющий локальный скрипт с контролем project reference и revision. Переход **0002_ledger → 0003_drafts** подтверждён. До/после миграции одинаковые количества: operations 2, idempotency_records 2, memberships 9, customers 9. Миграция добавочная; никаких truncate/delete/downgrade на Supabase.

Проверены эффективные права: у `anon`/`authenticated` нет USAGE схемы `qadam` и ни одного из SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER на `qadam.drafts`; PUBLIC grants отсутствуют. Контрольная сумма `.env` до и после миграции совпала; ключи/токены не выводились, файл не переписывался.

После применения `.venv/Scripts/python -m alembic check` на Supabase завершился успешно: `No new upgrade operations detected.`

### Живой Gemini и полный HTTP-сценарий

`apps/api/scripts/smoke_draft_flow.py --demo` запустил собственный Uvicorn на случайном loopback-порту. Запросы прошли через настоящий HTTP, штатную авторизацию, настоящие Supabase PostgreSQL/JWKS и **живой `gemini-3.6-flash`**; ни auth, ни Gemini, ни БД не подменялись.

1. Оба JWT действительны и соответствуют реальным subjects: A — 6 точек, B — 3; аноним получает 401. B не создаёт/не подтверждает draft в точке A — 404.
2. В `mart-demo-food` текст «Продал товар на 3000 тенге, Демо Асқар заплатил 1000 тенге, остальное в долг» дал sale, `total_minor=300000`, `received_minor=100000`, кандидата учебного клиента. До подтверждения количество operations и summary не изменились.
3. Скрипт отдельно подтвердил проверенные учебные поля с фиксированным `Idempotency-Key=ai-integration-2026-10-15-sale`. В журнале появилась **ровно одна** строка «Учебная AI-проверка интеграции 2026-10-15», draft consumed_operation_id указывает на неё, автор/точка совпадают.
4. Повтор того же ключа/тела вернул идентичный ответ; новый ключ для consumed draft дал **409 DRAFT_USED**. В истории запись одна. Summary точки: sales_minor **300000**, receipts_minor **100000**, outstanding_minor **200000**.

Команда: `.venv/Scripts/python scripts/smoke_draft_flow.py --demo` → **PASS, live-full-flow**. Скрипт оставляет учебную запись в demo и ничего не удаляет. Повторный запуск восстанавливает исходный draft по сохранённой операции и проверяет идемпотентность без повторного вызова Gemini; такой результат помечается `replay-only`.

Второй запуск с новым процессом API также фактически выполнен: **PASS, replay-only**, итоги не изменились, второй продажи нет.

Это отдельный живой интеграционный результат, а не один из 165 тестов с заглушкой. Предыдущие 11 RU/KZ/mixed-текстов и синтетическое RU-аудио остаются результатами этапа реализации; весь набор 20/20, реальное KZ-аудио и браузер/телефон в этом узком шаге не перепроверялись. HTTPS-деплой не выполнен.

### Передача и следующий шаг

Проверенный backend commit: **`99ce3f3852d552cc1c59ae1c109020c8fcdacb07`**. Ветка `backend/ai-drafts` опубликована, создан [PR #5](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/5) в `backend/ledger-auth`; [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4) остаётся открытым в `main`. Автоматическое слияние не включалось. Следующий commit содержит только документацию передачи.

Frontend получает [AI_INTEGRATION.md](../../packages/contracts/AI_INTEGRATION.md): ссылки на OpenAPI и валидированные примеры по точному commit, multipart text/audio, ответ с уточнением, тело подтверждения, обработку TTL/повторов/ошибок. OpenAPI/JSON-примеры остаются совместимыми с `ad107f5`: поля и денежные правила не изменены. Для frontend нужен действующий Supabase access token и UUID точки из `/me`; схема `qadam` напрямую недоступна. Проверять форму перед отдельным подтверждением, сохранять Idempotency-Key при сетевом повторе, при 503/504 оставлять ручной ввод.

Следующий шаг: review двух PR с учётом зависимости, затем подключение формы frontend и браузерная проверка того же сценария. HTTPS API пока не опубликован. Новые функции backend не добавлять в этот интеграционный шаг.

## Подготовка подключения команды — 2026-10-15, backend/integration-readiness

### Актуальные опубликованные снимки и совместимость

GitHub проверен в начале и повторно во время работы. PR #3 обновился с `246851b2d4df996f054c7b1a27b2ba2933d2b3ee` до **`9b4156122e22f12839f9f69384cb79a43e90c730`**, остаётся draft/open в main. PR #4 — **`193f6e527d716549d759d805dc4b86db1d9e059e`**, open в main. PR #5 — **`2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`**, open в backend/ledger-auth. Main — `ced32e7aa8e737a0cbc5318715ad02bdc98a89d4`. Автослияние выключено у всех.

Создан отдельный detached worktree `tmp/integration-review-20261015`; локально совмещены опубликованные снимки, итог `6c6f5090c9d5ea3e97bdbf37168e7d40ba6c768c`. Это не опубликованная интеграционная ветка и не merge PR. Код совместился, конфликты только README и PROJECT_STATUS. В проверочной копии сохранены обе стороны; перед реальным merge нужна осмысленная редакция общей сводки. Рабочие ветки друзей не менялись. Backend-код и экспорт побайтно совпадают с PR #5; новые функции не добавлялись.

### Проверки с заглушками и локальной PostgreSQL

- В совмещённой копии `python scripts/with_env.py <абсолютный .env.local-postgres> -m pytest -q --tb=short` → **165 passed**, без skipped, одна прежняя Starlette/httpx deprecation. Только отдельная локальная PostgreSQL 17.11, тестовые JWT/JWKS и заглушка Gemini. После обновления PR #3 backend не менялся — повторять этот прогон не требовалось.
- `python -m ruff check app tests scripts migrations`, `ruff format --check` (37 файлов), `python -m app.export_contracts --check` → PASS.
- Frontend `npm ci`, typecheck, lint, build → PASS. На актуальном PR #3 `npm test` → **71 passed** (ранее 70 на первом снимке). Format check сначала выявил только Windows CRLF в generate-api.mjs/eslint.config.js/index.html; после локальной нормализации LF → PASS, Git-содержимое этих файлов не изменилось.
- `npm run check:api` в общей копии → **FAIL: generated API types out of date**. Отдельная сверка подтвердила, что frontend generated.ts точно соответствует PR #4, а schemas/paths ручного журнала и seller endpoints в PR #5 не изменились. Требуется штатная генерация типов владельцем frontend при принятии AI-контракта; чужие файлы не исправлялись.

### Браузерные результаты — только опубликованный demo

Существующий `npm run test:e2e` после установки нужного Chromium → **8 passed** на `9b41561` (ранее 6 на `246851b`). Это реальный Chromium, но приложение в явно учебном read-only режиме, без Supabase login и API-записей. Первоначальный запуск не стартовал из-за отсутствующего Chromium 1248; после установки успешный прогон выполнен. Screenshot-тест обновил шесть кадров только в отдельной копии; они не публиковались и не меняли ветку автора.

**Полный живой браузерный сценарий не проводился**, как согласовано пользователем. Supabase password login/refresh/reload, денежные формы и AI UI не объявляются проверенными. В `app/modules.ts` seller/public exports пока пусты: sale/debts/history/summary/voice **ожидаются от команды ledger-web**, публичные экраны/3D — **от public-web/assets-3d**. Ничего не реализовано вместо участников.

### Живые API, Supabase и AI

Сначала только чтением подтверждены `0003_drafts`, 3 прежние операции и отсутствие USAGE qadam для anon/authenticated. Сохранённые JWT были просрочены; пользователь обновил их через обычный вход. Затем реальная подпись/JWKS/subject прошли. `.env` не переписывался агентом; секреты не выводились. Миграции/seed/очищающая pytest на Supabase в этом шаге не запускались.

Живой HTTP-прогон использовал опубликованные неизменённые TypeScript `createApiClient`, `createLiveGateway`, `backendBindings`, `formatKZT` из PR #3 под Node и Uvicorn из интеграционной копии. **Не браузер и не SDK-login**. В обновлении `246851b → 9b41561` эти модули и Auth/runtime не изменились (git diff проверен).

- `/me`: A — 6 точек, B — 3; создан и повторно прочитан один явно учебный клиент «Демо интеграция PR3 2026-10-15», contact null.
- Продажа 300000/100000 → долг 200000; доплата 50000 → долг 150000, sales_delta доплаты 0. Клиент получает серверный balance_minor=150000; форматтер показывает 1500 ₸.
- Каждый денежный запрос повторён с прежним ключом/телом — идентичный ответ. Изменённое тело с прежним ключом → 409 IDEMPOTENCY_CONFLICT. История клиента содержит ровно две операции. A/B не читают чужую точку; B не пишет в точку A — 404. Без token — 401.
- Summary mart-demo-clothes с учётом прежних операций: sales_minor=600000, receipts_minor=300000, outstanding_minor=300000. В demo оставлены один новый учебный клиент и продажа/доплата; операций всего **5**, удаления/очистки не было.
- CORS реальным OPTIONS: localhost:5173 и 127.0.0.1:5173 с Authorization/Content-Type/Idempotency-Key → 200; посторонний HTTPS origin → 400 без разрешения. `/openapi.json` живого сервера совпал с экспортом.
- `scripts/smoke_draft_flow.py --demo` с явным серверным env → **PASS replay-only**: сохранённая AI-продажа возвращается, новый ключ → 409 DRAFT_USED, summary mart-demo-food прежний 300000/100000/200000. **Нового Gemini-вызова в этом шаге не было**. Ранее выполненный живой текст → Gemini → Supabase описан выше; его не смешивать с текущими тестами.

Временные инструменты этого прогона: игнорируемые `tmp/run_integration_api.py`, `tmp/frontend_live_bridge.ts` (сборка esbuild, реальные imports), `tmp/check_integration_prs.py`. Токены передавались только окружением. Тестовые бизнес-UUID публичны, реальные subjects/пароли/JWT в отчёт не включены.

### Передача, блокеры и порядок PR

Подготовлена [инструкция подключения](../BACKEND_FRONTEND_CONNECTION.md): проверенный backend **2d2fc56**, точный OpenAPI/примеры, запуск без повторной инициализации Supabase, Base URL **http://127.0.0.1:8000/api/v1**, три публичные VITE-переменные, CORS и девять тестовых businessId. Ссылки добавлены в README API/contracts. Документация находится в отдельной backend/integration-readiness; опубликованные PR и ветки команды не редактировались.

PR #4 готов к review/ручному слиянию. Затем изменить base PR #5 на main, проверить diff; #5 готов как зависимый backend-этап. Рекомендуется обычный merge #4 для сохранения истории, на которую уже опираются #3/#5. PR #3 остаётся draft: владельцу обновить README/PROJECT_STATUS при интеграции, сгенерировать типы по #5, подтвердить login/клиентов в браузере и готовность PR. Код seller endpoints совместим; отсутствие ledger UI — задача отдельного участника, а не требование написать его вместо команды.

Блокеры полного сценария: ожидаемые ledger/AI/public модули, generated.ts после #5, конфликты общей документации, неподтверждённый браузерный login/refresh и отсутствие общего HTTPS API. Следующий шаг — передача инструкции команде и, после её готовности, браузерная интеграция. PR не сливались, деплой не выполнялся.

## Живой Seller Frontend и публикация передачи — 2026-10-15

Повторно проверены GitHub PR #3/#4/#5: heads соответственно `9b4156122e22f12839f9f69384cb79a43e90c730`, `193f6e527d716549d759d805dc4b86db1d9e059e`, `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`; все open, #3 draft, base #5 по-прежнему backend/ledger-auth. Использована отдельная `tmp/integration-review-20261015`; ветки друзей и PR не менялись. Модули ledger/AI/public остаются **ожидаемыми от команды**, ничего не реализовано вместо авторов.

### Проверено в настоящем браузере

Playwright Chromium, живой Vite/React, настоящий Supabase password login и FastAPI/PostgreSQL, без mocks или инъекции готовой сессии. Пользователь временно добавил пароли в игнорируемый `.env`. Успешно выполнен один сценарий с **10 контрольными точками**:

1. Вход A через email/пароль → Supabase HTTP 200 → `/me` 200 → шесть своих точек в UI, живой режим без demo-banner.
2. Выбор mart-demo-clothes, создание через форму клиента «Демо браузер PR3 2026-10-15» → 201, contact=null, balance_minor=0, появление в списке.
3. Переключение на другую свою точку скрывает клиента; возврат показывает его.
4. Reload восстанавливает реальную SDK-сессию, снова вызывает `/me`; после выбора исходной точки поиск возвращает того же клиента/UUID, без повторного создания.
5. Logout закрывает доступ; прямой переход на `/seller/customers` возвращает к `/login`.
6. Вход B обычной формой → три точки, ни одного UUID A в селекторе. Клиент A отсутствует; query `business_id=A` не подменяет выбор своей точки.
7. Logout B → повторный login A → снова шесть своих точек и ранее созданный клиент. Завершение logout, ошибок pageerror не было.

Первый запуск остановился после входа A на двух совпадающих кнопках «Новый клиент». Исправлен только селектор временного теста; повторный прогон полностью успешен. Приложение и ветка frontend для обхода ошибки не изменялись. Естественное истечение JWT/автоматический refresh длительным ожиданием не проверялись; reload подтверждает восстановление сессии, а не этот отдельный случай.

### Отдельно API и сохранность данных

В рамках браузерного прогона проверены реальные ответы Auth `/token`, API `/me`, POST/GET customers. Дополнительный fetch **из браузера** с текущим JWT B к `/businesses/{businessA}/customers` → **404 NOT_FOUND**; это прямая API-проверка изоляции, не действие формы. До/после `0003_drafts`, operations **5 → 5**. В demo оставлен только один новый явно учебный клиент. Миграции, seed, очистка БД и денежные записи не выполнялись. Gemini в этом шаге не вызывался.

Trace, HAR, video, screenshots и storageState не сохранялись. Пароли/токены не выводились в логи или отчёт. После каждого запуска удалены **только** `DEMO_OWNER_A_PASSWORD` и `DEMO_OWNER_B_PASSWORD` из исходного `.env`; сохранность всех остальных parsed значений проверена. Email, публичный ключ и прежние настройки не переписывались. Временные средства: `tmp/live_seller_browser.mjs`, `tmp/run_live_seller.py`, только в игнорируемом tmp. Запуск: `apps/api/.venv/Scripts/python tmp/run_live_seller.py`; вывод содержит только статусы и безопасные счётчики. Скрипт удаляет эти две переменные после завершения.

### generated.ts и публикация

В отдельной копии `npm run generate:api` по OpenAPI backend `2d2fc56` обновил только `apps/web/src/shared/api/generated.ts`. `npm run check:api`, `npm run typecheck`, `npx vitest run src/test/bindings.test.ts src/test/client.test.ts src/test/errors.test.ts` → **PASS, 45 tests passed**. Это контрактные тесты с заглушками, отдельно от живого браузера. Exact patch проверен обратным `git apply --reverse --check`.

Для автора frontend опубликованы [разбор изменений](../../packages/contracts/FRONTEND_TYPES_UPDATE.md) и [patch](../../packages/contracts/frontend-generated-ai.patch): +178/-48 строк, новый multipart POST drafts и его operation; CustomerCandidate/DraftResponse лишь перемещаются, существующие ручные типы не меняются. Ограничение XOR text/audio не выражается генератором строго — проверяется формой и backend. Generated-файл в ветке автора не менялся; patch служит точной передачей.

Коммит **`afbef782893d2c973bf14d9ba7b9b3e261d21dee`** проверен на секреты и опубликован в `backend/integration-readiness`, remote SHA подтверждён. [Инструкция подключения на GitHub](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/backend/integration-readiness/docs/BACKEND_FRONTEND_CONNECTION.md) дополнена текущими результатами. [Воспроизведение на компьютере frontend-разработчика](../SELLER_LIVE_ACCEPTANCE.md) содержит отдельный worktree, команды двух процессов, публичный env, точный UI-сценарий и различие собственного localhost/удалённого адреса.

Следующий шаг: seller-web принимает согласованный OpenAPI/patch, актуализирует README/PROJECT_STATUS при объединении и готовность draft PR #3. Ожидаются страницы ledger/AI от команды; полный денежный браузерный сценарий после их появления. Общий сетевой URL ещё не опубликован. PR не сливались, деплой не выполнялся.

## Интеграция всей команды после PR #7 — 2026-10-15

Ветка `integration/team-mvp`, отдельный worktree `tmp/integration-team`, основа `main:8c932dd`. Remote refs обновлены; GitHub подтверждает #7 merged, #3/#6 draft/open, #4/#5 open (база #5 остаётся backend/ledger-auth). Приняты Seller `b3d0328`, API/AI `2d2fc56`, readiness `95f6087`, public sources `a1ba5ae`, assets **`f53d469`** (новее указанного капитаном `1d49c29`). Полные SHA и способы переноса — [TEAM_INTEGRATION](../TEAM_INTEGRATION.md). Ветки друзей и main не изменялись, unrelated histories/force push не использовались.

### Сделано

- Единственный backend `apps/api`: PostgreSQL, Supabase JWT/JWKS и Gemini. `services/ledger.py` и миграции относительно принятого API не изменены. Root backend/SQLite/cookie-auth и root frontend PR #7 удалены **после** адаптации полезных сценариев; история PR #7 остаётся в предках.
- Единый `apps/web` построен на router/AuthProvider/runtime/BusinessProvider/API client/UI/RU-KZ Seller Frontend. `app/modules.ts` подключает адаптированные Sale/AudioInput, Debts/History, Summary и публичные страницы. Нового router/login/CustomerProvider нет. Общий CustomerPicker, Bearer токен, денежный decimal parser, серверные остатки, явное AI-подтверждение.
- Pending сохраняет точные ключ и тело при сетевой ошибке, невалидном ответе или 5xx. Запросы/cache/pending изолированы по identity scope + business; формы сбрасываются при смене точки. Runtime пересоздаётся при смене аккаунта. Pending хранится в памяти; beforeunload предупреждает о незавершённой попытке, offline/durable replay не реализован. После принудительного закрытия вкладки сверить журнал перед новой записью.
- Исходники public-web перенесены без отдельного каркаса/node_modules/dist. Envelope приведён к Page, venue_id — UUID, цены — price_minor; visitor_name обязателен. Публичная и seller-локализация используют общий context. CSS витрины ограничен `.ex`.
- Manifest управляет GLB/WebP, bounds, camera и hotspots. UUID **и** slug сверены с актуальными девятью Supabase-точками и seed. Маркер и карточка ведут на один shop. После визуальной проверки длинные подписи заменены номерами 1–3 с теми же номерами карточек, title и aria-label имени магазина; модель не перекрыта текстом. Без WebGL/при ошибке GLB остаются превью и список.
- `app/public_routes.py`: GET venues/businesses/shop; POST inquiry с квитанцией id/created_at, одинаковый client_request_id/body → та же квитанция, иной body → 409; PostgreSQL-лимит 20 новых заявок на точку/минуту. Private GET/PATCH inquiries проверяют membership/tenant. Публичные проекции не включают клиентов, долги или memberships. Денежные суммы заявки не меняют.
- OpenAPI/версия API 0.4.0, валидируемые примеры и generated.ts обновлены; включены runtime bindings seller inquiries/catalog. README и передача обновлены; прежние документы snapshot помечены как история. Главная актуальная инструкция — [TEAM_INTEGRATION](../TEAM_INTEGRATION.md).

### Тесты и локальные проверки — отдельно от живых сервисов

- Отдельная локальная PostgreSQL 17.11, пустая `*_test`; команда через `scripts/with_env.py` с **локальным** `.env.local-postgres`: `python -m pytest -q --tb=short` → **175 passed**. Миграции upgrade/check/downgrade, транзакции, seed, конкурентные погашения, TTL/авторство/конкурентное потребление draft/rollback, idempotency/изоляция, новые публичные проекции/заявки/лимит проходят. JWT подписывает тестовый JWKS, Gemini — заглушка; БД настоящая. Очистка только этой test БД. Предупреждение Starlette TestClient/httpx остаётся некритичным.
- `ruff check app tests migrations`, `ruff format --check app tests migrations`, `python -m app.export_contracts --check`, `uv lock --check --offline` → PASS. Новая миграция **не требуется**: каталог и inquiries уже есть до 0003_drafts; существующие migrations не переписаны.
- Web: `npm run check:api`, `typecheck`, `lint`, `format`, `npm test`, `build` → PASS. **81 unit/component tests** с заглушками, включая одинаковые body/key после неопределённого результата, double click, чужой ответ, pending scope, timeout/невалидный AI-response с сохранением текста/ручной формы и без денежного POST. Не считать их живым Gemini.
- `npm run test:e2e -- seller.spec.ts` → **7 passed**, Chromium demo, размеры 360/390/768/1440 и RU/KZ. Старый screenshot-only spec отдельно не запускался. Сборка предупреждает о lazy 3D chunk около 1 МБ (gzip около 275 КБ); оптимизация/FPS физического телефона не заявлены. Сборка без публичного env проверяет компиляцию; live Vite запускался с реальными публичными настройками.
- `python tools/assets/validate_assets.py --report tmp/assets-integration-validation.json` → PASS, 0 ошибок/предупреждений; GLB 609624 / 859988 / 779864 байт, без внешних URI. Связи с seed подтверждены.

### Настоящий браузер, Supabase и денежный ввод

Использованы опубликованный код объединённого приложения, реальный FastAPI/Uvicorn на loopback, настоящая Supabase и обычная форма email/password. Auth/денежные/публичные ответы не подменялись.

- A → `/me` → 6 точек, создание одного явно учебного клиента «Демо интеграция команды 2026-10-15», reload с восстановлением сессии/клиента; смена точки скрывает клиента и очищает денежную форму. Logout закрывает private routes. B → 3 другие точки, клиента A нет; B → A восстанавливает только свои точки. Проверка естественного expiry/refresh длительным ожиданием не проводилась.
- Через форму и общий CustomerPicker: продажа **3000 ₸ / получено 1000 ₸ → долг 2000 ₸**; через выбор той же продажи доплата **500 ₸ → долг 1500 ₸**. История и итог дня открываются. Точный повтор sale через отдельный browser fetch вернул тот же operation ID; это API-проверка, а не второе нажатие UI.
- Настоящий GLB hotspot MART → нужный shop → публичная форма заявки → квитанция → inbox владельца A. Контакт/текст только учебные; в общей БД оставлена одна заявка.
- Анонимный Chromium 360×800: все три GLB и **все девять hotspot** открыли соответствующие shops; горизонтального overflow нет, bounds/кадрирование проверены визуально. WebGL отключён через browser injection: декодированное превью + карточки работают; отдельная подмена только GLB-network на error при реальном public API также оставляет переход к магазину. Это desktop Chromium с мобильным viewport, не физический телефон. В раннем расширенном прогоне был timeout ожидания markers; финальный прогон всех девяти прошёл. Отдельные снимки только анонимных публичных страниц в игнорируемом tmp.

### Живой Gemini и API — не смешивать с браузерным успехом

- Через браузер получен **один валидный настоящий Gemini draft** для полной оплаты 3000 ₸, поля отобразились в форме. Первоначальный автоматизированный прогон остановился до подтверждения из-за отсутствующей функции во временном тестовом скрипте. Последующие попытки провайдера дали 503 AI_UNAVAILABLE; отдельная безопасная диагностика показала **HTTP 429 Gemini**. Модель/ключ/тариф не менялись, платный тариф не подключался. Полный повторный RU/KZ browser AI acceptance сейчас **не подтверждён**; прежние 11 RU/KZ/mixed и RU-audio результаты остаются историей предыдущего этапа.
- Сохранённый ещё действующий браузерный live draft затем явно подтверждён **через API** с настоящим JWT A: операция → история → summary. Дельта sales/receipts +300000/+300000 тиынов, долг +0; точный повтор возвращает прежнюю операцию, новый ключ → DRAFT_USED. Новых вызовов Gemini для этого не было. Это подтверждение через API, не через кнопку браузера.
- Реальные JWT B: GET customers, operations, summary и inquiries точки A → **404**. CORS разрешённый origin/Authorization/Idempotency-Key → PASS; чужой origin → отказ. Повторная проверка публичных UUID/slug по текущей Supabase совпала с manifest.
- До/после общая Supabase остаётся **0003_drafts**, операций **5 → 8**: две ручные (sale/repayment) и одна API-confirmation живого draft, все помечены учебными. Никаких миграций, seed, TRUNCATE, downgrade или очистки Supabase. Существующие `.env` не переписывались; пароли из отдельного игнорируемого файла, ключи/JWT/пароли не печатались и не записывались в trace/HAR/video/storageState.

### Следующий шаг и ограничения Draft PR

Получить review владельцев frontend/3D по интеграционному diff. После восстановления бесплатной квоты Gemini завершить **одним браузерным проходом** RU/KZ text → draft → явная кнопка подтверждения → history/summary. Проверить реальное аудио/микрофон и физический телефон отдельно; этого текущий прогон не доказывает. Для развёртывания понадобится отдельное разрешение/настройка достижимого HTTPS API и frontend origins; localhost коллеги недоступен удалённо.

Интеграционный PR остаётся Draft. Слияние либо всей этой ветки после review, либо согласованный последовательный порядок #4 → retarget #5 → #3/#6 → оставшийся integration diff с новой проверкой; не сливать все варианты одновременно. Ветки команды не удалять. Секреты проверены по известным локальным значениям и Git diff; приватные env, node_modules и dist исключены.

Проверенный commit кода: **`dab0fe7f91b1dbf8c8d7522694759ae9b9cebfc6`**. Последующая передача меняет только документацию. `git diff --check`, `format:check` и `check:api` прошли; `main` перед публикацией всё ещё `8c932dd49b8defa8456fd3b7015ed7828ddae3b7`. Основная рабочая копия `backend/integration-readiness` осталась чистой.

Ветка опубликована; создан **[Draft PR #8 → main](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/8)**. При создании head документации — `4fd5cea48aa2bdd0d194900f964ee1d1db022a93`; текущая запись лишь добавляет ссылку публикации. [Инструкция подключения](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/integration/team-mvp/docs/TEAM_INTEGRATION.md). PR оставлен open/draft, автоматическое слияние не включалось. Следующий шаг — review интеграции и завершение живой browser AI-проверки после восстановления квоты, затем решение капитана о слиянии; деплой требует отдельного этапа.

## Integration update 2026-10-16

Separate worktree tmp/integration-mobile, branch integration/team-mobile from PR #8 3d009dc. Early Flutter contract commit 0f2b06d. Assets 11c4e45 imported by explicit paths; storefront 8818e8b presentation selectively adapted, real API fields/name/price_minor, shared locale, seller route, keyed inquiry form and manifest VenueScene retained. Added sixth mobile role without changing other assignments. No frontend/backend duplicates or unrelated history.

Checks: typecheck/lint/build PASS; 81 web unit/component tests PASS (stubs). Asset validator PASS: GLB bytes 1312516/712724/745044, 0 errors/warnings. Real anonymous Chromium with real public Supabase API: all 3 venues and 9 hotspots -> matching shops, 360x800 no overflow, screenshots visually inspected; WebGL disabled and GLB network failure leave working previews/cards. No physical phone/FPS check. Supabase revision 0003_drafts, operations 8 -> 8, no migrations/cleanup. Gemini not called in this stage. npm audit reports 3 existing dev-tool findings (Vitest/mocker/tinypool); major test-tool upgrade deferred, no force audit fix. Lazy 3D chunk warning remains. Next: livestock implementation on a separate dependent backend branch, local-only migration, Storage live upload requires private bucket/server key (not configured).

## «Мал базар»: backend и передача Flutter — 2026-10-16

Рабочая копия `tmp/integration-mobile`, feature-ветка **backend/livestock** от обновлённой **integration/team-mobile:f240b27**. Ранняя публикация предложенного контракта — `0f2b06d`, до реализации. [LIVESTOCK_API](../../packages/contracts/LIVESTOCK_API.md) теперь описывает реализованный API 0.5.0, ограничение общей среды, Storage policies/env и подключение телефона. Общая Supabase не мигрировалась: по-прежнему 0003_drafts. Данные/ветки команды/локальные `.env` сохранены.

### Сделано

- `app/livestock_schemas.py`, `livestock_routes.py`, новые модели и **0004_livestock**: публичные лента/карточка/статистика, свои объявления, публикация/полное редактирование, confirm_today/sell/withdraw. Автор — проверенный JWT subject, без фиктивного магазина. Публичный ответ исключает subject/memberships/денежные данные. Контакт публикуется только с явным boolean consent=true.
- PostgreSQL clock → Asia/Almaty. В 00:00 вчерашние active скрываются; редактирование не продлевает наличие. Confirm обновляет ту же запись, sold/withdrawn не переоткрываются. Ключ UUID в области user; advisory transaction lock, нормализованный payload hash и исходный JSON-ответ атомарны с записью. Строгие целые тиыны, фильтры, bounded UUID pagination. Формулы/код ledger service не изменены.
- Медиана цен предложений за сегодня по виду/месту, минимум пять объявлений, quantity не даёт дополнительных наблюдений. Demo исключены. Без LLM. Default `LIVESTOCK_DEMO_MODE=true` помечает создаваемые учебные объявления навсегда.
- `services/photos.py`: Supabase private Storage adapter, проверка реального JPEG/PNG/WebP, лимит 8 MiB/20 MP, без анимации, EXIF orientation и перекодирование до 1600 px в JPEG без metadata. До трёх фото, проверка owner/attachment, составной owner FK и уникальные slots. До 30 unattached на пользователя, bounded multipart streaming, private orphan после сбоя DB не публикуется. Download через API с no-store, без раздачи object keys/серверного ключа.
- OpenAPI 0.5.0, шесть новых JSON-примеров, generated.ts, API README, инструкции Flutter, роль mobile, общие решения/статус обновлены. Flutter-каркас и отдельная авторизация не создавались.

### Настоящая локальная PostgreSQL + тестовые JWKS/Storage

Из `apps/api`: Python 3.12, `scripts/with_env.py <root>/apps/api/.env.local-postgres -m pytest -q --tb=short` → **218 passed**. Это отдельная пустая `qadam_test` на loopback: upgrade до 0004, `alembic check`, downgrade до base в fixture. Ни миграции, ни очистка тестов не направлялись на Supabase.

Проверены concurrent publish и photo retry, одинаковый key/body и конфликт payload, независимость ключей разных users, rollback перед commit, гонка sell/withdraw, пользователь без memberships, чужие PUT/actions/photo, UTC→Almaty граница суток, повтор старого key на следующий день, terminal states, фильтры/пагинация, медиана <5/5/6 и округление, исключение demo/просрочки, SQL RLS/права, входные ограничения, фото type/size/pixels/animation/EXIF/reorder/orphan/квота. Существующие ledger/drafts regression tests включены. Один первоначальный дефект next_cursor (UUID вместо string) исправлен. Слишком длинный ID pytest для 8 MiB fixture заменён именованным; это проблема теста, не загрузки API.

JWT в этом наборе подписаны тестовым JWKS. Storage HTTP transport tests подменяют сеть (upload/download, timeout/403/redirect), MemoryStorage подменяет удалённый bucket. Реальные байты обрабатывает Pillow. Эти проверки **не подтверждают живой Supabase Storage**. Прежние AI-тесты используют заглушки Gemini.

`ruff check app tests migrations`, `ruff format --check app tests migrations`, `python -m app.export_contracts --check`, `uv lock --check --offline`, `git diff --check` → PASS. Web: generate/check API, typecheck, lint, format:check и build → PASS. 81 web test с заглушками прошёл на обновлении интеграции; последующие web изменения — только сгенерированные типы. Известны предупреждение Starlette/httpx, lazy 3D chunk и три npm audit findings существующего dev toolchain; эти ограничения не скрыты как успешный security audit зависимостей.

### Живой Auth и HTTP API — отдельно

Настоящий Supabase login A/B, проверка реальных JWT/JWKS, Uvicorn/HTTP и **локальная qadam_demo**. После успешного тестового upgrade отдельно применена 0004 только в этой локальной demo БД; `alembic check` без отличий. Публикация → public feed/card → точный replay → B PUT чужого 404/своё пустое → без токена 401 → confirm_today с прежним ID → sell → public 404. Статистика исключает demo, журнал не изменился. Оставлено одно явно учебное локальное объявление, статус sold. Ключи/пароли/JWT не печатались; файлы конфигурации не изменялись.

**Живой Gemini в этом этапе не вызывался. Живой Storage не проверен:** STORAGE_SERVICE_KEY/BUCKET отсутствуют. Полный Flutter UI/Android device flow не проверен — приложение делает mobile-участник.

### Браузер и витрина — отдельно

Обновление `f240b27`: настоящий анонимный Chromium, реальный public API Supabase, новые GLB/preview/manifest 11c4e45. Три площадки, девять hotspots → правильные shops, 360×800 без horizontal overflow, визуальная проверка кадров. Отключённый WebGL и отдельно сетевой сбой GLB оставляют рабочие preview/cards. Это desktop Chromium с узким viewport, не физический телефон. Supabase проверена на 0003, операции 8→8. Seller login/ledger UI в этом новом этапе повторно не прогонялись; их прежние результаты не выдаются за новую проверку.

### Передача и следующий шаг

Flutter уже может использовать актуальные OpenAPI/examples и LIVESTOCK_API, запускать локальный API с 0004. Base URL desktop `http://127.0.0.1:8000/api/v1`, Android emulator `http://10.0.2.2:8000/api/v1`; телефон — LAN IP компьютера или `adb reverse`. Native HTTP разрешать только для debug, публичные параметры API_BASE_URL/SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY. Пароли/JWT/service_role/DB/AI key не являются публичным env.

Для общей среды капитану потребуется отдельно разрешить 0004, создать private Storage bucket с image/jpeg и лимитом 8 MiB, закрыть client policies (включая прежние broad policies) и настроить серверный service_role key. Затем проверить живую загрузку/приватность с двумя аккаунтами и Flutter на устройстве. Без Storage можно публиковать без фото. Не выполнены автоматическая уборка orphan/unattached, TTL удаления idempotency snapshots, production moderation/anti-spam, физический телефон/FPS. Голосовое заполнение — следующий этап. Новая миграция на общей Supabase, merge PR и deploy в этой задаче не выполнялись.

### Публикация

**[Draft PR #9](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/9)**: integration/team-mobile → integration/team-mvp, интеграция `f240b278f292e40f8033db6526fd0161e035cd96`. **[Draft PR #10](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/10)**: backend/livestock → integration/team-mobile, проверенный backend **`c447a594a6a7d9aad1ee7fca751053bf6a176a61`**. Ссылки на точный OpenAPI/примеры — в LIVESTOCK_API. Отдельное сравнение JSON OpenAPI с интеграционной базой подтвердило: **ни один прежний schema/path не изменён**, добавлен только livestock. Последующие commits — передача/ссылки.

Порядок review: #8, #9, #10; при принятии #8 капитан вручную проверяет diff и retarget #9, после него #10. В этой задаче PR только открыты как Draft, main и ветки команды не менялись. Проверка известных локальных секретов охватила 204 versionable paths и diff; значения не выводились, `.env`/tmp/node_modules/dist игнорируются. Корневая рабочая копия backend/integration-readiness чистая.

Дополнительная анонимная браузерная проверка главной витрины после публикации: 360/1440 px, три реальные карточки/превью, seller link, переключение RU→KZ и сохранение locale после перехода на MART — PASS. Снимки публичных страниц просмотрены, секретных browser artifacts нет. Read-only Supabase проверка повторно подтвердила 0003_drafts и 8→8 операций. Код не менялся.

## 2026-10-16 — review и живая приёмка общей версии

Проверенный код **c5ecd5e5abb579e75121c9e05541b9b8d14a0591**, integration/local-combined-check. Исходный merge614b13e сохранён; включены уже опубликованные PR #11 c9e099e и #12 abee31f. [Полный отчёт, команды запуска, точные результаты и Flutter-подключение](../COMBINED_ACCEPTANCE.md). После этого code commit меняется только передача/публичные снимки.

Исправлено: поколение Auth при позднем401 A→B→A; UUID next_cursor в Pydantic/OpenAPI и валидируемый CustomerPage example; Unicode длина клиента в bindings/форме; доступный RU/KZ alert ручного ввода при отказе AI. Денежный сервис/правила, router/modules/runtime и новые модели сохранены. Включены готовые меню/адаптивность PR #11. QA-тесты согласованы с API0.5 и подключёнными financial/public-модулями; исправлены ожидание layout, KZ selector, разделены E2E-конфигурации.

**Живой браузер:** A login→6 points→учебный клиент→reload; B login→3 points без данных A; form reset при смене business; sale3000/paid1000→debt2000; repay500→debt1500; history/summary; GLB hotspot→магазин→учебная заявка→inboxA. **Живой Gemini:** одна UI-попытка RU-разбора через gemini-3.6-flash, весь UI-цикл draft→проверка полей→нажатие confirm→history прошёл, без платного тарифа/повторов. KZ/audio заново не проверялись; живой429 в этот раз не возникал.

**Живой API отдельно:** точный replay продажи даёт тот же ID; использованный AI draft с новым ключом409 DRAFT_USED; JWT B к customers/operations/summary/inquiries A даёт404; без токена401; CORS разрешает5188, чужой origin отклонён. После финальных Auth/schema-изменений повторены A/B, reload/history/summary и replay. Дельты ручного этапа: sales+300000, receipts+150000, debt+150000; с AI: +600000/+450000/+150000. Общая БД operations8→11, только3 помеченные учебные операции. Созданы один учебный клиент и одна заявка; данные не удалялись.

**3D:** реальные GLB всех3 площадок визуально просмотрены на1440/360/390px, все9 hotspots совпадают со slug и UUID реального public API. При отключённом WebGL и отдельно оборванном GLB работают preview/list/shop. [Анонимные публичные снимки](../screenshots/combined-live-public/README.md); исходные10 Demo PNG и новые20 Demo/API-fixture PNG просмотрены перед commit.

**Тесты:**219 backend passed только на локальной qadam_test:55432 (синтетические JWT/JWKS/Gemini/Storage);142 frontend unit/component;15 стандартных Chromium Demo/public fixtures;21 QA Chromium synthetic Auth/API (8 тестов повторяются). typecheck/lint/build/format:check/check:api и export_contracts --check passed; после примера3 contract tests passed. Исходные QA-001/002/003 сначала воспроизведены красными, затем зелёные. Browser fault injection: прерванный до API money POST сохраняет те же body/key, pending изолирован по точке/user; операций не добавлено. 429/503/timeout/invalidJSON AI проверены заглушками, ввод сохраняется, один запрос, ноль денежных writes.

**Окружение:** начальный Vite не имел публичных Supabase env; добавлены только недостающие публичные настройки в игнорируемый web/.env.local. Серверные env/пароли не заменялись. Просмотр восстановлен на прежнем5188, API с обновлённой схемой на8018; оба оставлены работать. Общая Supabase подтверждена0003 до/после: upgrade/seed/очищающие тесты на ней не запускались, Storage не менялся. Секреты/privatenv/node_modules/dist не публикуются; auth-артефактов нет.

**Ограничения/следующий шаг:** backend — после отдельного разрешения backup→0004_livestock→private bucket/серверный key→живая фото/изоляция/полночь; до этого livestock API общей БД не заявляется рабочим. Frontend — физический телефон, микрофон/аудио, mobile performance; QA-G01 (нет собственного deadline у customer POST) остаётся ограничением. Flutter — ожидается приложение участника и его handoff; использовать LIVESTOCK_API/OpenAPI0.5, int minor, Supabase session, API_BASE_URL для emulator/LAN/adb. Не применять0004 и не менять Storage без следующего разрешения.

Публикация — отдельный Draft из общей ветки в backend/livestock, зависимость #10→#9→#8→main; #11/#12 уже включены с сохранением истории. Не сливать/retarget автоматически. Старые role/QA отчёты описывают свои snapshots; текущие результаты — здесь.

### Публикация общей приёмки

Создан **[open Draft PR #13](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/13)**, head `integration/local-combined-check`, base `backend/livestock`. Проверенный код `c5ecd5e5abb579e75121c9e05541b9b8d14a0591`; `17ee90f` и текущая запись добавляют только отчёт/публичные снимки/ссылку. Ветка опубликована без force push. Существующие PR и их базы не менялись, merge/deploy не выполнялись. [Инструкция и результаты](../COMBINED_ACCEPTANCE.md).
