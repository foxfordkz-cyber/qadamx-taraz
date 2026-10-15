# Контракты Qadam

Источник: `apps/api/app/schemas` и реально зарегистрированные FastAPI-маршруты. Из `apps/api`: `uv run python -m app.export_contracts`, проверка — та же команда с `--check`.

- `openapi.json` — health, авторизация и ручной учёт; Bearer security, параметры, discriminated sale/repayment, ответы и ошибки.
- `examples.json` — валидируемые учебные примеры. `RepaymentOperationResponse` — второй пример схемы `OperationResponse`, не отдельный тип API. Это не настоящие пользователи, долги или результат AI.
- `demo-seed.json` — согласованные UUID/slug площадок, точек, товаров и покупателей. Memberships и токены не экспортируются.

Общий текстовый контракт: `docs/team5/02_ARCHITECTURE_API.md`; настройка и ограничения: `apps/api/README.md`. Поля `DraftResponse`/`InquiryCreate` сохранены для следующих этапов, соответствующие HTTP-маршруты ещё не реализованы. Генерацию TypeScript-клиента подключает владелец seller-web.
