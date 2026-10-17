# Канонические рынки — additive контракт Мал базара

Публикуется до реализации. PR B зависит от PR A PUBLIC_LOCALIZATION_API/0007;
миграция B —0008_canonical_markets. Используется существующий livestock listing,
его авторизация, idempotency, confirmed_on, photos и price aggregation. Второго каталога нет.

## Справочник

GET `/api/v1/livestock/markets?status=verified&lang=kk&limit=20&cursor=UUID` → Page.
status: unverified/verified/retired; по умолчанию verified. lang: ru/kk, правила fallback
как PUBLIC_LOCALIZATION_API. UUID ascending, max100, next_cursor=null на последней странице.
GET `/api/v1/livestock/markets/{id}` → MarketResponse; неизвестный UUID404, неверныйUUID422.

```json
{"id":"10000000-0000-4000-8000-000000000001","key":"example-market","name":"Учебный пример рынка","name_i18n":null,"locality":"Тараз","verification_status":"unverified","verified_at":null,"accepts_listings":false}
```

Это фикстура контракта, не реальный рынок. UUID и key стабильные, key уникален,
lowercase ASCII slug; не переиспользовать после закрытия рынка. verified требует
verified_at и внутреннего основания проверки. Публичны только поля примера;
внутренние verification_note/проверяющий, owner IDs, memberships не выдаются.
Создание/проверка справочника — отдельное администраторское действие после проверки
места, без публичного POST. Миграция создаёт **пустой** справочник, без выдуманных рынков.
`/venues/mal-bazar` — концепт, не запись справочника и не основание verified.

## Объявления и совместимость

ListingWrite (POST/PUT) и PublicListing/OwnerListing добавляют optional nullable `market_id`.
Новый POST без поля →null. В PUT пропущенное поле сохраняет текущую связь;
явный null снимает связь. Ненулевой UUID должен существовать и быть verified:
неизвестный404, unverified/retired422 MARKET_NOT_VERIFIED. Авторизация остаётся
по owner UUID (не memberships); чужое редактирование404 ещё до проверки выбора рынка.
Старая запись со свободным `market` остаётся `market_id=null`.
Никакой автоматической связи по названию, casefold или locality.
`market`/внутренний `market_key` продолжают обозначать старый свободный текст;
они **не** канонический market.key. Даже если текст совпадает, связи нет.
Свободный текст и market_id могут сосуществовать; справочник — источник названия
канонического рынка, free text — только историческое значение продавца.

Повтор старого запроса с прежним ключом не меняет fingerprint из-за нового default-поля:
пропущенный market_id не включается в fingerprint. Explicit null и omission различаются.
Response старого receipt может не содержать новое поле; nullable default обеспечивает replay.

GET `/livestock/listings?market_id=UUID&species=cattle&limit=20&cursor=UUID`
и GET `/livestock/me/listings?market_id=UUID` используют существующую Page-пагинацию.
`market`+`market_id` вместе →422; species/locality/limit/cursor совместимы.
Неизвестный UUID404; malformed422. Известный unverified/retired в публичной ленте
возвращает пустую Page, не объявления другого рынка. Владелец видит собственные
объявления выбранного существующего рынка, включая неактивные и устаревшие.
Смена фильтра требует сброса cursor/cache; cursor UUID не является публичной ссылкой на запись.

Публичные объявления с ненулевым market_id доступны только пока рынок verified,
listing active и confirmed_on равен сегодняшнему дню Asia/Almaty. Если статус рынка
отозван, скрываются public detail/photo и listings; автор сохраняет доступ к своим данным.
Legacy market_id=null сохраняет прежнюю видимость. Не менять контакты или consent.

## Наличие и цены

Существующий GET `/livestock/prices?species=cattle&locality=Тараз&market_id=UUID`.
market_id optional, совместим с прежними обязательными species/locality.
Ответ PriceStats добавляет market_id; остальные формулы не меняются.
Только active, подтверждённые сегодня Asia/Almaty, не demo, выбранные species/locality/market_id.
Minimum — минимальная **цена предложения за голову**, целые тиыны. Это не сделка
и не сумма за всё стадо. Пограничный день берётся из серверного clock_timestamp.
min=null при0выборке; median=null при<5; status=insufficient_data при<5.
Существующий unverified/retired → sample_count0/minnull/mediannull. Unknown404.
Пустое состояние не заменять нулём или статистикой соседнего рынка.

```json
{"species":"cattle","locality":"Тараз","market":null,"market_id":"10000000-0000-4000-8000-000000000001","period_from":"2026-10-17","period_to":"2026-10-17","timezone":"Asia/Almaty","currency":"KZT","unit":"head","sample_count":0,"min_price_per_head_minor":null,"median_price_per_head_minor":null,"status":"insufficient_data","source":"asking_prices"}
```

## Перенос / откат / клиенты

0008 создаёт markets с RLS/revoke anon/authenticated, nullable FK market_id/index
в существующих livestock_listings. Никакой backfill/seed/update старых объявлений.
После backup/restore:0007→0008, затем новый backend, read-only contract acceptance,
потом web/Flutter выбирают справочник и передают UUID. Общий backend для обоих PR —0.6.3.
До rollоut не включать market_id UI. Не принимать numeric/index/name за UUID.

Откат приложения требует защиты: прежний API игнорирует неизвестный query market_id
и может показать общую ленту. Сначала отключить зависимый UI и заблокировать такие
запросы на edge/защитном API; не возвращать обычный0.6.2 при работающих новых клиентах.
Предпочтителен forward fix с сохранением фильтра. Колонки/таблицу при откате не удалять:
downgrade стирает связи и справочник, допустим только в test/после отдельного backup-плана.
Web concept остаётся без привязки, пока капитан не подтвердит конкретное место.

## Передача web и Flutter

Контракт опубликован до кода в b5fb813. PR #72 зависит от PR #70 / 0007; добавляет 0008.
Машинные схемы — openapi.json, web — generated.ts, валидируемые ответы — examples.json
(MarketResponse, CanonicalMarketPriceStats).

1. До rollout использовать прежние запросы. После проверки нового OpenAPI загружать
   /livestock/markets и выбирать ID из ответа. Не вычислять ID из имени, slug или индекса.
2. Для выбранного рынка передавать market_id в feed/prices и явно в ListingWrite.
   В prices сохранить обязательные species/locality; locality брать из выбранной записи
   справочника. Смена рынка/вида/места сбрасывает cursor и кэш списка.
3. Нет verified записи — «Нет подтверждённого рынка», без чужой ленты и цен.
   Пустая Page — «Нет подтверждённых объявлений на сегодня». Цена null — «Нет данных».
4. Ключ кэша цены включает species, locality и market_id. Не смешивать соседние рынки.
   «Есть сегодня» означает подтверждение продавца на текущую дату, не аудит остатков.
5. market_id nullable в старых ответах и старых pending-телах. Не добавлять его даже
   как null при повторе неизвестного результата: сохранить исходное тело и ключ.
   При новом PUT omission сохраняет связь; для осознанного удаления передать null.
6. lang=kk соответствует кнопке KZ; локализация name следует PR A.
   Пользовательские описания и контакты объявлений автоматически не переводятся.

Только автор получает свои status/created_at/updated_at и приватные фото. Публичная
карточка содержит контакт по прежнему явному contact_consent. Subject автора и
внутреннее основание проверки рынка в публичную схему не добавлены.
Проверка реальных рынков, языковой review и UI клиентов — отдельные следующие шаги.
Подтверждённой связи с концептом /venues/mal-bazar в подготовке нет.
