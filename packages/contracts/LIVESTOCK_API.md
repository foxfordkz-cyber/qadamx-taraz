# «Мал базар»: контракт Flutter v1

Текущая общая ветка — `integration/local-combined-check`, [Draft PR #13](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/13) → backend/livestock. Точный проверенный commit, запуск и удалённое подключение: [FLUTTER_CONNECTION](../../docs/FLUTTER_CONNECTION.md). [OpenAPI 0.6.0](openapi.json), [JSON-примеры](examples.json); добавление аналитики не меняет livestock-контракт 0.5.0.

**qadam-demo уже на 0004_livestock**, private bucket livestock-photos подключён. Setup выполнен отдельно с разрешения капитана; повторять его не нужно. Проверены настоящие HTTP/JWT/Storage: public feed, mine, upload/read, повтор, чужой доступ. Это ещё не Flutter на устройстве и не внешний HTTPS. Историческая локальная приёмка backend/livestock сохранена в handoff. Flutter опубликован участником отдельно в feature/mobile-livestock-api:da6a3a0, автоматически здесь не объединялся.

## Адрес и авторизация

Base URL `http://127.0.0.1:8000/api/v1`. Префикс маршрутов `/livestock`. Для private методов `Authorization: Bearer <Supabase access_token>` обычного вошедшего пользователя. Владелец определяется только сервером по JWT `sub`; `owner_id`, `business_id`, memberships и клиентский флаг `is_demo` не принимаются. Членство в магазине не требуется; правила существующего журнала сохраняются.

Все изменения, включая upload, требуют `Idempotency-Key: <UUID>`. Храните исходные ключ, URL и тело до определённого результата. При сетевой ошибке/5xx повторяйте их без изменений. Область ключа — пользователь, общий для всех livestock действий. Другой payload/path с тем же ключом → 409. Повтор возвращает исходный снимок, актуальное состояние получайте GET. Смена пользователя не переносит pending-запросы. Для повторного «сегодня» на следующий день нужен новый ключ.

## Маршруты

| Метод | Маршрут | Доступ / результат |
|---|---|---|
| GET | `/livestock/listings` | Public Page<PublicListing>, только доступные сегодня |
| GET | `/livestock/listings/{id}` | PublicListing, иначе 404 |
| GET | `/livestock/prices?species=cattle&locality=Тараз` | Public PriceStats |
| GET | `/livestock/me/listings` | Private Page<OwnerListing>, все свои, включая устаревшие |
| POST | `/livestock/listings` | Private ListingWrite → OwnerListing; сразу active и сегодня |
| PUT | `/livestock/listings/{id}` | Private полная замена редактируемых полей; не меняет статус/дату |
| POST | `/livestock/listings/{id}/actions` | Private `{action:"confirm_today"|"sell"|"withdraw"}` → OwnerListing |
| POST | `/livestock/photos` | Private multipart `file` → `{id:UUID}` |
| GET | `/livestock/listings/{id}/photos/{photo_id}` | Public JPEG, только фото доступного сегодня объявления |
| GET | `/livestock/me/photos/{photo_id}` | Private JPEG, только своё (в том числе ещё не прикреплённое) |

Пагинация: `{items:[],next_cursor:null}`, `limit=20` по умолчанию, 1..100, `cursor` UUID последнего элемента. Сортировка UUID ASC, opaque для клиента; не сортировка по свежести и не snapshot. Public фильтры `species`, `locality` (точное совпадение без регистра/лишних пробелов). Private дополнительно `status=active|sold|withdrawn`. Не смешивать cursor разных фильтров. Каждый запрос вычисляет текущую дату заново, поэтому в полночь состав страниц меняется.

## Поля и примеры

ListingWrite (все поля обязательны кроме nullable/списка фото; PUT передаёт полный объект):

```json
{"species":"cattle","quantity":2,"price_per_head_minor":35000000,"locality":"Тараз","age_months":24,"sex":"female","description":"Учебный пример формы, не рыночные данные","photo_ids":[],"contact":"+7 …","contact_consent":true}
```

`species`: cattle/sheep/goat/horse/camel; локализованные подписи — Flutter RU/KZ. `quantity`: строго целое 1..10000; `price_per_head_minor`: строго целое 1..10000000000, KZT, за одну голову (35000000 = 350000 ₸). Строки/float/bool вместо чисел запрещены. `locality` 1..100 символов, нормализуются пробелы; `age_months` null или 0..600; `sex` null или male/female/unknown; `description` null или до 2000; `contact` 1..200, **contact_consent строго true**. Покажите явный checkbox согласия: контакт станет публичным. Клиент не может задать время, владельца, статус или is_demo. Все неизвестные поля запрещены.

PublicListing: поля species/quantity/price_per_head_minor/locality/age_months/sex/description/contact плюс `id`, `currency:"KZT"`, `photos:[{id,url}]`, `confirmed_on:"2026-10-16"`, `is_demo:false`. Не возвращаются JWT subject, магазин, memberships, долги и клиенты. OwnerListing добавляет `status`, `available_today`, `created_at`, `updated_at` (UTC ISO8601); собственный subject не нужен в ответе. `url` — относительный путь к API, не Supabase object key; добавляйте origin API, не повторный `/api/v1`.

## «Есть сегодня», статусы и полночь

Источник времени — PostgreSQL, зона `Asia/Almaty`. Публично доступны только `status=active AND confirmed_on=текущая местная дата`. Создание устанавливает обе величины. `confirm_today` обновляет **ту же запись**, только для active, включая просроченную. Повтор в тот же день безопасен. В 00:00 Asia/Almaty вчерашнее объявление исчезает из выдачи/карточки/публичных фото без фоновой задачи; в «Моих» остаётся active с available_today=false. Редактирование не подтверждает наличие.

`sell` и `withdraw` переводят active в sold/withdrawn. Повтор того же конечного действия безопасен; другое конечное действие или confirm_today для sold/withdrawn → 409 INVALID_STATE. Автоматического возврата и переоткрытия нет. После продажи можно создать отдельное новое объявление осознанно. Операции каталога никогда не создают продажу/долг в журнале.

## Фото

Сначала загрузите JPEG/PNG/WebP (до 8 MiB исходного файла, до 20 млн пикселей, без анимации). Сервер декодирует реальные байты, а не доверяет расширению/MIME; поворачивает по EXIF, уменьшает до 1600 px и заново кодирует JPEG без EXIF/metadata. Затем передайте выданные photo_ids, максимум 3 уникальных ID. Фото должны принадлежать JWT-пользователю; чужие, неизвестные, уже прикреплённые к другому объявлению и произвольные URL/пути запрещены. Заменённое фото остаётся приватным, доступно владельцу. Supabase bucket **private**, прямые клиентские записи запрещены; service key только на сервере. Без Storage API вернёт 503 STORAGE_UNAVAILABLE, публикация без фото работает. Уборка непривязанных объектов — отдельная эксплуатационная задача, автоматического удаления пока нет. Изображения public API: Cache-Control no-store, проверка доступности при каждом запросе; уже скачанное фото невозможно отозвать с устройства.

## Статистика цен предложений

Только активные объявления за **сегодня Asia/Almaty**, по обязательным виду и месту, без `is_demo=true`. Каждое объявление даёт одно наблюдение независимо от quantity. Медиана за голову: для чётного числа среднее двух центральных цен, половина тиына округляется вверх до целого. Не LLM, не цена сделки и не экспертная оценка. Минимум 5 объявлений, иначе `median_price_per_head_minor:null,status:"insufficient_data"`.

```json
{"species":"cattle","locality":"Тараз","period_from":"2026-10-16","period_to":"2026-10-16","timezone":"Asia/Almaty","currency":"KZT","unit":"head","sample_count":4,"median_price_per_head_minor":null,"status":"insufficient_data","source":"asking_prices"}
```

## Ошибки

Общий envelope `{error:{code,message,fields:{}},request_id:UUID}`. 401 AUTH_REQUIRED — войти/обновить Supabase session; 404 NOT_FOUND — отсутствует, чужое или недоступно сегодня; 409 IDEMPOTENCY_CONFLICT / INVALID_STATE / PHOTO_IN_USE; 413 PHOTO_TOO_LARGE — превышен multipart body; 422 VALIDATION_ERROR / INVALID_AMOUNT / INVALID_PHOTO (размер, тип, число/принадлежность); 429 RATE_LIMITED — лимит непривязанных фото; 503 AUTH_UNAVAILABLE / DATABASE_UNAVAILABLE / STORAGE_UNAVAILABLE — сохранить ввод и повторить исходный ключ/тело. Не показывайте технический message как RU/KZ перевод, используйте code.

## Flutter и локальный запуск

`apps/mobile` создаёт mobile-участник. Публичные параметры: API_BASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. DATABASE_URL, AI_API_KEY, STORAGE_SERVICE_KEY — только backend .env. Используйте существующий Supabase SDK login/session, refresh, logout; access token не записывать в логи. Денежные значения Dart int, никакого double при вводе ₸→тиыны.

Backend: из apps/api `uv sync --locked`, настройте собственный игнорируемый .env, затем `uv run uvicorn app.main:app --host 127.0.0.1 --port 8018`. На отдельной локальной demo PostgreSQL примените проверенную миграцию `uv run alembic upgrade 0004_livestock`; общая Supabase уже на этой ревизии, не применять повторно и не запускать seed. `/docs`, `/openapi.json` находятся вне /api/v1.

## Storage и учебная среда

Серверный `.env.example`: `STORAGE_BUCKET`, `STORAGE_SERVICE_KEY` (legacy Supabase service_role JWT), `LIVESTOCK_DEMO_MODE=true`. Supabase URL уже используется Auth; отдельный клиентский Storage URL/ключ не нужен. **Все объявления, созданные при demo_mode=true, получают is_demo=true навсегда** и исключаются из рыночной статистики. Для настоящей среды капитан отдельно задаёт false перед публикацией реальных данных; клиент флаг не меняет. Переключение режима не изменяет старые объявления.

Для новой отдельной среды администратору Storage: создать **private** bucket, например `livestock-photos`, разрешённый MIME image/jpeg, лимит объекта 8 MiB. Не добавлять anon/authenticated SELECT/INSERT/UPDATE/DELETE policies для этого bucket; проверить, что прежние широкие policies на storage.objects также не дают доступ. Server service_role имеет доступ, Flutter обращается только к FastAPI. Bucket не создаётся автоматически, платный тариф не нужен. [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [upload](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [authenticated download](https://supabase.com/docs/guides/storage/serving/downloads).

Multipart body ограничен 8 MiB + 64 KiB даже без Content-Length. Максимум 30 непривязанных фото на владельца, затем 429; точный повтор upload не расходует лимит. Проверка фото читает реальные байты; MIME/имя файла не участвуют в хэше повтора. Пример запроса: `POST /api/v1/livestock/photos`, Authorization и Idempotency-Key в headers, multipart field `file`, Content-Type с boundary формирует HTTP-клиент. При GET «Мои объявления» публичный photo URL может быть недоступен; для превью используйте `/api/v1/livestock/me/photos/{photo_id}` с Bearer. Все livestock-ответы имеют Cache-Control no-store.

PostgreSQL и Storage не имеют общей транзакции: при сбое DB commit после upload возможен **приватный** непривязанный объект. Повтор использует детерминированный путь тех же байтов; публичный GET требует запись фото и доступное объявление. Уборка orphan/unattached фото и сохранённых idempotency-ответов пока ручная эксплуатационная задача, автоматический TTL удаления не реализован. Успешные ключи не истекают в MVP; не переиспользуйте их для другого намерения.

Живая проверка Storage выполнена сначала через TestClient в отдельном setup-этапе, затем через настоящий Uvicorn HTTP: PNG→JPEG без EXIF, повтор с тем же photo ID, владелец200/чужой404. Backend подключается ролью с нужными правами на qadam; RLS и запрет прямого доступа anon/authenticated сохраняются. Полночь/конкуренция/сбои адаптера покрыты отдельными PostgreSQL-тестами с заглушкой Storage; не выдавать их за живой Storage failure test.

Адреса устройства и их ограничения описаны в [FLUTTER_CONNECTION](../../docs/FLUTTER_CONNECTION.md). Текущий 127.0.0.1:8018 доступен только на ПК капитана; 10.0.2.2 — только хост соответствующего Android emulator. Удалённому разработчику подготовлен временный HTTPS-туннель, но он ещё не запущен. Native Flutter не требует CORS; Flutter Web требует точного origin в ALLOWED_ORIGINS.

## Дополнение API 0.6.1: конкретный рынок и «Цена от»

Требуется новая добавочная миграция `0005_livestock_market`; общая Supabase пока остаётся 0004. Применить миграцию до запуска этой версии API. Существующие объявления и денежные записи не удаляются, старые объявления получают market=null, их нельзя автоматически приписывать известному рынку.

ListingWrite и ответы объявления добавляют `market`: название конкретного рынка, 1–100 символов, без пустого значения. В новом Flutter-интерфейсе требуйте выбор/ввод рынка отдельно от населённого пункта. Поле пока nullable/optional ради совместимости старого клиента. PUT без market сохраняет имеющийся рынок, явный null снимает привязку; такое объявление показывать как «Рынок не указан». Повторы старого payload без market сохраняют прежний fingerprint.

GET `/livestock/listings`, `/livestock/me/listings` и `/livestock/prices` принимают `market`. Передавайте также locality: одинаковое название рынка в разных населённых пунктах не означает одно место. Фильтр — точное совпадение с нормализацией пробелов и регистра; разные написания/псевдонимы не объединяются. Это название, заявленное продавцом, а не проверенный реестр адресов или GPS-подтверждение присутствия. Не используйте MART/другие площадки как мал базары без подтверждения.

Пример: `/livestock/prices?species=sheep&locality=Тараз&market=Учебный%20мал%20базар%20A` (название синтетическое).

Ответ PriceStats добавляет `market` (null при запросе по всему населённому пункту) и `min_price_per_head_minor`. Минимум вычисляется от одного сегодняшнего active НЕучебного объявления выбранного вида/места/рынка; без объявлений null. Медиана остаётся доступной от пяти. `status=insufficient_data` относится к медиане: при sample_count=1..4 минимум может быть заполнен. Flutter не должен скрывать минимум только из-за этого status.

Подпись: «От … ₸ за голову среди сегодняшних объявлений», рядом sample_count, выбранный рынок, вид животного и дата. Это цена предложения, не гарантированная цена сделки. is_demo=true исключается из обоих показателей. Количество голов не меняет вес объявления. Sold/withdrawn/вчерашние предложения исключаются. UI отдельно показывает «Подтверждено продавцом сегодня» и не обещает гарантированное наличие.

Flutter: обновить DTO market/min_price_per_head_minor, форму, фильтры и ключи cache (locality+market+species); не считать минимум на странице пагинации. При market=null не показывать конкретное место. Новые реальные названия рынков согласовать с капитаном; их не добавляли как вымышленные seed.
