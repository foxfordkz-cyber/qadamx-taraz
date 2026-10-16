# Контракты Qadam

Опубликованный API — **0.6.2**; контракт идемпотентного создания и восстановления клиента — [CUSTOMER_RECOVERY_API.md](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/e4414012ff4dd749ed154a4d767f8eff1225fae2/packages/contracts/CUSTOMER_RECOVERY_API.md). Источник полностью в `apps/api`. [Flutter «Мал базар»](LIVESTOCK_API.md): реализованные маршруты, JSON/multipart, JWT, фото, доступность сегодня, статистика, адреса Android emulator/телефона. Требуется новая локально проверенная миграция 0004; общая Supabase пока 0003. Сохранены публичные venues/businesses/shop, заявки и денежный журнал 0.4. Типы обновлены в едином `apps/web`. Запуск и точный состав — [TEAM_INTEGRATION](../../docs/TEAM_INTEGRATION.md); старый AI-only patch ниже служит историей и поверх 0.5.0 не применяется.

[Передача AI-интеграции frontend](AI_INTEGRATION.md): точный проверенный commit, OpenAPI, multipart, уточнения, подтверждение и повтор запроса.

[Подключение команды к backend](../../docs/BACKEND_FRONTEND_CONNECTION.md): Base URL, запуск, публичные переменные, учебные точки и совместимость опубликованных PR.

[Точное обновление frontend generated.ts](FRONTEND_TYPES_UPDATE.md): проверенный patch и команды генерации по OpenAPI PR #5.

Источник: `apps/api/app/schemas` и реально зарегистрированные FastAPI-маршруты. Из `apps/api`: `uv run python -m app.export_contracts`, проверка — та же команда с `--check`.

- `openapi.json` — health, авторизация, журнал и текстовые/аудио AI-черновики; Bearer security, multipart XOR text/audio, параметры, discriminated sale/repayment, ответы и ошибки.
- `examples.json` — валидируемые учебные примеры. `RepaymentOperationResponse` — второй пример схемы `OperationResponse`, не отдельный тип API. Это не настоящие пользователи, долги или результат AI.
- `demo-seed.json` — согласованные UUID/slug площадок, точек, товаров и покупателей. Memberships и токены не экспортируются.

`ClarificationDraftResponse` и `RepaymentDraftResponse` — варианты `DraftResponse`; `ConfirmedSaleCreate` — вариант `SaleCreate` с `draft_id`; `AIUnavailableErrorResponse` — вариант общей ошибки. Это имена примеров, не новые типы API. Неизвестная оплата — `null`, UI показывает вопросы и сохраняет ручную форму при ошибке AI.

Общий контракт: `docs/team5/02_ARCHITECTURE_API.md`; запуск: `apps/api/README.md`. `InquiryCreate` теперь используется публичным POST, ответ `InquiryReceipt` не содержит контакт или сообщение. `InquiryResponse` — только владельцу; `InquiryUpdate` меняет статус. `VenueResponse`, `PublicBusiness`, `ShopResponse`, `CatalogResponse` имеют явные публичные поля; деньги только `_minor`. Примеры всех новых схем есть в examples.json. При подтверждении AI передать проверенные продавцом поля и сохранить Idempotency-Key для повтора. Чужой автор/точка → 404, TTL 30 минут → `DRAFT_EXPIRED`, новый ключ использованного draft → `DRAFT_USED`; ручной ввод остаётся `draft_id=null`.
