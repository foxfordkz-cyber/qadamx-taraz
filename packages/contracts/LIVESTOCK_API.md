# «Мал базар»: контракт Flutter v1

Статус первой публикации: **предложено к реализации в backend/livestock**. На `integration/team-mobile` пока работает API 0.4 (магазины/журнал); перечисленные ниже livestock endpoints ещё не доступны. После реализации источником схем будет соседний `openapi.json`, статус и фактические проверки — backend handoff. Flutter принадлежит участнику mobile, каталог — основному `apps/api`, собственной авторизации нет.

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

Общий envelope `{error:{code,message,fields:{}},request_id:UUID}`. 401 UNAUTHORIZED — войти/обновить Supabase session; 404 NOT_FOUND — отсутствует, чужое или недоступно сегодня; 409 IDEMPOTENCY_CONFLICT / INVALID_STATE / PHOTO_IN_USE; 422 VALIDATION_ERROR / INVALID_AMOUNT / INVALID_PHOTO (размер, тип, число/принадлежность); 503 DATABASE_UNAVAILABLE / STORAGE_UNAVAILABLE — сохранить ввод и повторить исходный ключ/тело. Не показывайте технический message как RU/KZ перевод, используйте code.

## Flutter и локальный запуск

`apps/mobile` создаёт mobile-участник. Публичные параметры: API_BASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. DATABASE_URL, AI_API_KEY, STORAGE_SERVICE_KEY — только backend .env. Используйте существующий Supabase SDK login/session, refresh, logout; access token не записывать в логи. Денежные значения Dart int, никакого double при вводе ₸→тиыны.

Backend: из apps/api `uv sync --locked`, настройте собственный игнорируемый .env, затем `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`. На отдельной локальной demo PostgreSQL потребуется новая миграция 0004_livestock (пока предлагается); общую Supabase не мигрировать до разрешения капитана. `/docs`, `/openapi.json` находятся вне /api/v1.

Android emulator: `http://10.0.2.2:8000/api/v1`. Физический телефон в той же доверенной Wi-Fi сети: `http://<LAN-IP-компьютера>:8000/api/v1`, разрешите входящий 8000 только в private network Windows Firewall. Альтернатива Android USB: `adb reverse tcp:8000 tcp:8000`, затем `http://127.0.0.1:8000/api/v1` на телефоне. iOS simulator на Mac обычно использует localhost Mac, не Windows. HTTP/cleartext разрешать только в debug-конфигурации приложения; production требует отдельно согласованного HTTPS API. Никакого деплоя/туннеля здесь нет. Native Flutter не зависит от CORS; Flutter Web требует точного origin в ALLOWED_ORIGINS.
