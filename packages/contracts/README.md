# Контракты Qadam

[Передача AI-интеграции frontend](AI_INTEGRATION.md): точный проверенный commit, OpenAPI, multipart, уточнения, подтверждение и повтор запроса.

[Подключение команды к backend](../../docs/BACKEND_FRONTEND_CONNECTION.md): Base URL, запуск, публичные переменные, учебные точки и совместимость опубликованных PR.

[Точное обновление frontend generated.ts](FRONTEND_TYPES_UPDATE.md): проверенный patch и команды генерации по OpenAPI PR #5.

Источник: `apps/api/app/schemas` и реально зарегистрированные FastAPI-маршруты. Из `apps/api`: `uv run python -m app.export_contracts`, проверка — та же команда с `--check`.

- `openapi.json` — health, авторизация, журнал и текстовые/аудио AI-черновики; Bearer security, multipart XOR text/audio, параметры, discriminated sale/repayment, ответы и ошибки.
- `examples.json` — валидируемые учебные примеры. `RepaymentOperationResponse` — второй пример схемы `OperationResponse`, не отдельный тип API. Это не настоящие пользователи, долги или результат AI.
- `demo-seed.json` — согласованные UUID/slug площадок, точек, товаров и покупателей. Memberships и токены не экспортируются.

`ClarificationDraftResponse` и `RepaymentDraftResponse` — варианты `DraftResponse`; `ConfirmedSaleCreate` — вариант `SaleCreate` с `draft_id`; `AIUnavailableErrorResponse` — вариант общей ошибки. Это имена примеров, не новые типы API. Неизвестная оплата — `null`, UI показывает вопросы и сохраняет ручную форму при ошибке AI.

Общий текстовый контракт: `docs/team5/02_ARCHITECTURE_API.md`; настройка и ограничения: `apps/api/README.md`. `InquiryCreate` сохранён для следующего этапа, HTTP-заявки ещё не реализованы. Генерацию TypeScript-клиента подключает владелец seller-web. При подтверждении черновика передать проверенные продавцом поля и сохранить Idempotency-Key для повтора. Чужой автор/точка → 404, TTL 30 минут → `DRAFT_EXPIRED`, новый ключ использованного draft → `DRAFT_USED`; ручной ввод остаётся `draft_id=null`.
