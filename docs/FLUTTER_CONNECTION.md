# Flutter: живой HTTPS, API 0.6.1 и рынок

Опубликован [Draft PR #17](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/17): `integration/livestock-https` → `integration/local-combined-check`; зависит от PR #13. Документация опубликована после проверенного кода, API остаётся 0.6.1.

Проверено 2026-10-16 (Asia/Qyzylorda). Backend **4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5**, ветка `integration/livestock-https`, основана на `58d4eb4` и локальном `e26f732`. API **0.6.1** сохраняет аналитику 0.6.0 и денежные правила. [OpenAPI проверенного commit](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5/packages/contracts/openapi.json), [JSON-примеры](../packages/contracts/examples.json), [LIVESTOCK_API](../packages/contracts/LIVESTOCK_API.md), [аналитика](../packages/contracts/ANALYTICS_API.md).

## Действующий тестовый адрес

**API_BASE_URL: `https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1`**

Swagger: [docs](https://kelkoo-student-skiing-universal.trycloudflare.com/docs). [Health](https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1/health), [живой OpenAPI](https://kelkoo-student-skiing-universal.trycloudflare.com/openapi.json). Публичная лента: [listings](https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1/livestock/listings).

Это временный Cloudflare Quick Tunnel к FastAPI `127.0.0.1:8018` на ПК капитана. Он проверен по внешнему HTTPS **с ПК капитана**, не с устройства Flutter-разработчика. Адрес действует, пока работают ПК, сеть, FastAPI и cloudflared; фиксированного срока/гарантии доступности нет. Остановка туннеля завершает доступ, новый запуск обычно выдаёт другой hostname. [Условия Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Не зашивать этот адрес как production URL, держать в игнорируемом публичном конфиге. После смены origin сначала разрешить неизвестный результат прежних pending-запросов, не переотправлять их с новым ключом.

Туннель направлен только на HTTP8018. PostgreSQL не открыт, JWT не отключён; закрытые методы требуют access_token обычного Supabase-пользователя. Public API остаётся публичным. Секреты не входят в конфиг Flutter. Web капитана `http://127.0.0.1:5188` сохранён, точный CORS origin сохранён. Постоянный деплой и платные услуги не выполнялись.

## Конфиг, который ожидает PR #15

Проверен [Draft PR #15](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/15), head `a2c0aab1ac5ad8a87c70e9a2a84269142417d4e3`, база backend/livestock. Его ветка не менялась и не сливалась. В `apps/mobile/config/public.local.json`, созданном из example:

```json
{
  "API_BASE_URL": "https://kelkoo-student-skiing-universal.trycloudflare.com/api/v1",
  "SUPABASE_URL": "https://pdjjdqgoitnkpgkbqjtp.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_w17k2VDn1gf_Jr8hoXhGeQ_-T9NRnfz"
}
```

Путь **/api/v1 обязателен**, без query/fragment, без credentials в URL. Не использовать Supabase URL вместо API. Config допускает завершающий slash, но этот пример передаёт канонический URL без него. Publishable key публичный; DATABASE_URL, STORAGE_SERVICE_KEY/service_role, AI_API_KEY, пароль и access/refresh tokens в этот файл не входят.

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define-from-file=config/public.local.json
```

Команды выше предназначены mobile-участнику; здесь Flutter SDK/устройство не запускались. Учебный аккаунт получает лично разработчик от капитана через закрытый канал/менеджер паролей. Пароль вводится в форме входа, не в public config/APK/GitHub; временный пароль нужно сменить. Не передавать готовые JWT в чате. Livestock принадлежит JWT subject и не требует membership магазина. Для аналитики/денежного журнала доступны только точки из `/me`.

## Совместимость и точные изменения Flutter

Старые запросы PR15 совместимы с 0.6.1: response_validation.dart проверяет известные поля и не отклоняет новые; status/median сохраняют прежнюю семантику. listing_form.dart пока не отправляет market, ui/app.dart пока показывает только медиану. Поэтому это **совместимый старый клиент, но UI рынка/«Цена от» ещё ожидается от mobile-участника**.

- `ListingWrite.market?: string|null`, 1–100 символов, пробелы нормализуются; пустая строка запрещена. В новом UI добавить отдельный выбор/ввод рынка, RU/KZ и сохранение в локальном draft/pending. Не придумывать реестр рынков и не объявлять MART мал базаром без подтверждения.
- В PublicListing/OwnerListing читать nullable market, показывать «Рынок не указан» при null. Старый POST без поля создаёт null. Старый PUT **без market сохраняет имеющееся значение**; явный null снимает привязку. При повторе сохранять наличие/отсутствие поля и всё тело, а не добавлять null к старому pending.
- В запросы feed/mine/prices добавить optional query market вместе с locality; смена фильтра сбрасывает cursor и ключ кеша. Совпадение точное после нормализации пробелов/регистра. Рынок — самоописание продавца, не GPS/проверенный адрес.
- `PriceStats.min_price_per_head_minor?: int|null` и `market?: string|null`. В валидаторе принять отсутствие нового поля у старого API как «не поддерживается», при наличии проверить null либо положительный int в текущем денежном диапазоне. Не вычислять минимум из первой страницы клиента.
- Минимум считается по **подходящим по виду/населённому пункту/рынку активным объявлениям, подтверждённым сегодня Asia/Almaty**, без demo. Одна запись — одно наблюдение, quantity не множитель. Это **цена предложения за голову**, не цена сделки. Нет подходящих данных → null, не 0. Минимум доступен при count>=1; медиана при count>=5. `status=insufficient_data` относится к медиане и **не скрывает ненулевой минимум**. Показывать «От … среди сегодняшних объявлений», дату, sample_count; не обещать рыночную гарантию.
- Суммы int в тиынах, при показе ₸ делить на 100. Смена аккаунта по-прежнему изолирует pending/фото. Auth SDK/refresh, multipart `file`, Idempotency-Key и private-photo URL не менять.

Примеры новых price-полей (прочие поля ответа — в OpenAPI):

```json
{"sample_count":0,"min_price_per_head_minor":null,"median_price_per_head_minor":null,"status":"insufficient_data"}
{"sample_count":1,"min_price_per_head_minor":30000000,"median_price_per_head_minor":null,"status":"insufficient_data"}
{"sample_count":5,"min_price_per_head_minor":30000000,"median_price_per_head_minor":35000000,"status":"available"}
```

## Что проверено реально

Через приведённый **внешний HTTPS** с этого ПК, без заглушек: health/OpenAPI0.6.1, обычный Supabase password login A/B и GET /me, аналитика7 дней, public feed и mine, private photo owner200/foreign404/anonymous401, чужое редактирование404, CORS5188. PNG **7 692 562 байта** (>4.5MB, <8MiB) загружен в настоящий Storage, выдан JPEG без EXIF; точный повтор вернул тот же photo ID. Публикация старым телом без market и повтор вернули один listing ID. Повтор ранее сохранённого **до 0005** publish-запроса через HTTPS тоже вернул прежний ID без дубля. Редактирование рынка, feed/mine по рынку и пустой чужой фильтр прошли. Demo исключено из цены → count0/minnull; положительный минимум подтверждён только отдельными PostgreSQL-тестами, ложных non-demo объявлений в общей БД не создавали.

Оставлены явно учебные данные: active listing `16b8f0be-732c-449e-81f6-5fb3fb0fff83`, photo `dd1478b0-2f0f-5159-87fc-e68b698b893f`. Место `Synthetic HTTPS test`, рынок `Synthetic HTTPS market`, контакт обозначает отсутствие связи; изображение — синтетический шум. В полночь Asia/Almaty active объявление исчезнет из публичной ленты до confirm_today; это ожидаемо. Существующие операции11/businesses9/customers13/inquiries2 сохранены. Автоматического удаления не было.

Не выполнены на этом этапе: Flutter/физический телефон, внешний запрос с компьютера разработчика, повторный браузерный UI или живой Gemini. 238 backend-тестов прошли на отдельной qadam_test (реальные SQL/миграции, синтетические JWT/JWKS/Storage/Gemini); ruff и экспорт PASS. Web check:api, TypeScript и lint PASS. Старые 142 frontend/браузерные результаты из предыдущего этапа не объявляются новым прогоном.

## Миграция и воспроизведение у капитана

Общая qadam-demo теперь **0005_livestock_market**. Перед применением после явного разрешения капитана backup qadam был **реально восстановлен** в отдельную локальную `qadam_restore_0005_test`; количества/хеши содержимого всех12 таблиц совпали. После миграции сравнение повторено: прежние данные сохранены, старый market null, индекс создан, RLS и запреты anon/authenticated сохранены. Это backup схемы/данных qadam без исходных owner/ACL, не всей Supabase/Auth/Storage; восстановление прав требует отдельно проверенных миграций/ролей. Backup и журналы в игнорируемом tmp, не публикуются и автоматически не удаляются.

Рабочая копия сервера: `C:\Users\karab\Documents\Codex\2026-10-15\x20\work\qadamx-taraz\tmp\livestock-https`. Env — прежний `...\work\qadamx-taraz\apps\api\.env`, не перезаписан. На 8018 запущен 0.6.1 только после миграции и read-only application preflight. Команды ниже — для повторного запуска **только при свободном порте**, не для второго экземпляра:

```powershell
cd C:\Users\karab\Documents\Codex\2026-10-15\x20\work\qadamx-taraz\tmp\livestock-https\apps\api
uv sync --locked
$serverEnv = 'C:\Users\karab\Documents\Codex\2026-10-15\x20\work\qadamx-taraz\apps\api\.env'
$env:ALLOWED_ORIGINS = '["http://127.0.0.1:5188"]'
uv run uvicorn app.main:app --env-file $serverEnv --host 127.0.0.1 --port 8018 --no-access-log
# В отдельном процессе, если действующий туннель остановлен:
cloudflared tunnel --url http://127.0.0.1:8018
```

Сейчас cloudflared2026.10.1 взят из официального release, SHA256 сверён. Не запускать второй туннель вместо действующего и не останавливaть чужие процессы. Не применять повторно setup/seed/очищающую проверку к общей БД. Откат приложения0.6.0 совместим с добавленной схемой; не делать downgrade0005 для отката приложения — он удаляет новые поля.

## Следующий шаг

Flutter-разработчик проверяет с **своего компьютера и устройства** health, вход, загрузку/повтор, фильтры и A/B isolation; фиксирует версию0.6.1 и дату. Backend не может выдать проверку со своего ПК за этот результат. Mobile UI рынка/минимума — задача владельца PR15. Frontend аналитика остаётся отдельной задачей. [План постоянного размещения](PERMANENT_HOSTING_PLAN.md) подготовлен отдельно; постоянного деплоя здесь нет.
