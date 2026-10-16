# Создание клиента: идемпотентность и восстановление результата

Точный контракт backend для решения PR19/99ed2c0. Документ и [JSON-примеры](customer-recovery-examples.json) опубликованы первыми в **737a559**, до реализации. Сервер, [OpenAPI](openapi.json) и generated.ts реализованы в ветке `backend/customer-post-recovery` от общей интеграции PR18/**1324885**. Версия ветки **0.6.2**; работающий HTTPS пока **0.6.1**, новые методы на нём ещё недоступны. Переключение общей среды — отдельный шаг после review и миграции.

## POST: совместимое расширение

`POST /api/v1/businesses/{id}/customers`

- Bearer Supabase JWT и актуальная owner membership точки обязательны для первого запроса и каждого повтора.
- Необязательный заголовок **`Idempotency-Key`**: 1–200 печатных ASCII-символов без пробелов (`^[!-~]+$`). Рекомендуется UUIDv4. Пустой/невалидный ключ —422. Не включать имя, контакт или токен в ключ.
- Тело **CustomerCreate не меняется**: `display_name`1–200 Unicode code points; `note`0–2000, default`""`; `contact`0–200 либоnull, defaultnull. Внешние пробелы обрезаются сервером; extra fields запрещены. Пустой contact иnull различаются. NFC/casefold/телефонная нормализация не добавляются.
- **Без заголовка** сохраняется legacy-поведение:201CustomerResponse, каждый POST создаёт нового клиента. Совпадающие имена/контакты допустимы. На такой запрос гарантия recovery не распространяется; предыдущую попытку без ключа нельзя задним числом связать с новым ключом.
- **С ключом** scope = действие `customer.create.v1` + business UUID + подтверждённый Supabase subject + key. Другая точка, другой автор или денежная операция имеют отдельную область ключей. Два владельца одной точки с одинаковым ключом создают независимые intents, не получают чужой receipt.
- Повтор того же ключа и канонического валидированного тела возвращает **201 с исходным CustomerResponse**, без INSERT нового клиента. Тело канонизируется после trim/defaults, сериализация всех полей с сортировкой ключей, hashSHA256. Перестановка JSON-полей и явные defaults не меняют смысл. Другие значения при том же ключе — **409 `IDEMPOTENCY_CONFLICT`**, без новой записи. Тело проходит обычную валидацию и при replay.
- Клиент, customerID, hash и полный успешный ответ сохраняются **атомарно в одной транзакции**. Конкурентные POST одного scope сериализуются PostgreSQL; успешный ответ отдаётся только послеCOMMIT. При rollback нет ни клиента, ни receipt.

201 не вводит новый envelope. Поля: `id,business_id,display_name,note,contact,balance_minor`. В исходном snapshot `balance_minor=0`. Replay возвращает этот исходный snapshot **даже если текущий долг изменился**; свежие остатки брать из существующего GETcustomers/журнала. Различать first/replay по201 не нужно: оба подтверждают один результат intent.

## GET: durable lookup без повторной записи

`GET /api/v1/businesses/{id}/customer-creation-result`

Обязательные заголовки: `Authorization: Bearer <user access token>` и **`Idempotency-Key`** с теми же правилами. Тела, query-параметра ключа и произвольного creatorID нет. Ключ не помещается в URL. Сначала проверяются JWT и актуальная membership, затем receipt только текущего subject/точки. Все ответы этого маршрута и customerPOST имеют `Cache-Control: no-store`.

HTTP200, discriminated union по `status`:

```json
{"status":"completed","customer":{"id":"60000000-0000-4000-8000-000000000001","business_id":"10000000-0000-4000-8000-000000000001","display_name":"Демо Асқар","note":"Вымышленный покупатель","contact":null,"balance_minor":0}}
```

```json
{"status":"not_observed","customer":null}
```

- `completed` означает наличие закоммиченного receipt этой попытки, возвращает тот же исходный snapshot, что POST. Работает после потери ответа, reload, нового подключения или перезапуска API.
- `not_observed` означает только отсутствие **видимого закоммиченного** receipt в момент чтения. Исходный POST может ещё идти, ждать lock, быть в пути или прийти позже. GET ничего не резервирует, не отменяет и не доказывает отсутствие клиента от legacyPOST.
- MVP **не возвращает `processing`, `rejected`, `expired`**: отдельной durable reservation/terminal rejection нет. 401/404/422 не сохраняются как состояние intent. Timeout/503/500/невалидный ответ и `not_observed` не разрешают новый ключ для неизвестного результата.
- Same-business receipt другого автора не раскрывается: разрешённый текущий владелец получит `not_observed` в своём scope. Безmembership —404, даже если receipt существует. Отзывmembership запрещает replay/lookup; восстановление той жеmembership позволяет получить прежний receipt, он не удаляется.

| Ситуация | POST | GET результата |
|---|---|---|
| Успех/совпадающий повтор |201CustomerResponse|200completed|
| Receipt пока не наблюдается |Выполнить или дождаться intent с тем же ключом/телом|200not_observed|
| Другое валидное тело, тот же scope/key |409IDEMPOTENCY_CONFLICT|Не принимает тело, возвращает исходный результат|
| Нет/невалидный JWT |401стандартныйErrorResponse|401|
| Нетmembership/чужая точка |404NOT_FOUND|404NOT_FOUND|
| Невалидное тело/ключ; GET без ключа |422VALIDATION_ERROR|422VALIDATION_ERROR|
| БД/транспорт/неожиданная ошибка |503/500/нет достоверного ответа →unknown|503/500/ошибка не меняет исход intent|

Невалидный повтор422 или отозваннаяmembership404 **не доказывают отказ прежнего POST**. При восстановлении прав используйте прежний ключ. Диагностический X-Request-ID меняется междуHTTP-запросами; это не intentID и не часть сохранённого customer snapshot.

## Retention, поздние запросы и frontend

Receipt хранится **без автоматического TTL/expiry/очистки**. Ключ нельзя повторно назначить новому intent. Таблица ссылается на клиента составным FK business/customer и не допускает его удаления при сохранённом receipt. Будущая политика удаления требует сохранять защиту от позднего повтора; удаление receipt ради очистки не является поддержанным recovery.

Frontend перед отправкой создаёт и сохраняет key с identity/API project/business scope. До разрешения unknown не генерирует новый key для того же действия. Сохраняйте точное тело в памяти для retry, не записывайте контакты/имена/JWT вlocalStorage. После reload без тела разрешён безопасный GET по сохранённому key. Если GETnot_observed, можно продолжать проверку; повторPOST допустим только с достоверно восстановленным прежним телом и тем жеkey. Нельзя восстановить корреляцию поиском имени или подставить новую форму к старому key. Если тело утрачено, unknown остаётся открытым; сервер не может доказать, что старый worker больше не придёт.

Смена аккаунта/точки/epoch не переносит форму или успех в другой UI. Перед выбором клиента runtime-валидировать ответ, егоbusiness и текущую identity. Прежние201клиенты продолжают работать; frontend recovery coordinator/UX реализует seller-участник после опубликованного OpenAPI и подтверждения доступной версии API, не backend-разработчик.

## Хранение и проверка внедрения

Подготовлена additive-миграция **0006_customer_requests** от0005: отдельная `qadam.customer_creation_requests`, первичный ключ business/creator/key, hash, customerID, responseJSON, created_at; RLS включён, прямых прав PUBLIC/anon/authenticated нет. Не переиспользуется финансовая таблицаIdempotencyRecord, денежные правила не меняются. Сериализация — PostgreSQL transaction advisory lock по hash полного scope; совпадение hash только добавляет ожидание, receipt всегда ищется по полному PK. Membership удерживается FOR SHARE до завершения транзакции. Downgrade удаляет receipts и разрушает recovery-гарантию: это не допустимый способ обычного rollback релиза; старый API совместим с добавленной таблицей, оставьте её на месте.

Перед запуском0.6.2 нужна0006. Проверки только на отдельной testPostgreSQL: legacy/replay/conflict/canonicalization, concurrent same/different body, rollback междуINSERT, loss-afterCOMMIT/late-worker/not_observed, creator/business scope, отзывmembership/replay/lookup, immutable snapshot послеизменениядолга, миграция и запрет прямого доступа. Общая Supabase остаётся0005; работающие API0.6.1 и обаHTTPSтуннеля не переключаются.
