# Контракты Qadam

## Согласованный snapshot в seller-ветке

`openapi.json` принят отдельно из AI-backend **2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c**, API 0.3.0; blob `9a1ed34f189692d750161de4d4728f78159e83cd`. Добавлен POST `/api/v1/businesses/{id}/drafts`, старые paths/20 schemas/security семантически сохранены. JSON самодостаточен: внешних/неразрешённых `$ref` нет. Examples/demo seed ниже не менялись и совместимы; дополнительные файлы AI-ветки не переносились. AI UI не активирован.

Локальный `apps/api` seller-ветки остаётся на **193f6e5**. Его exporter не содержит HTTP drafts и перезапишет 0.3.0 старым контрактом: здесь его не запускать поверх согласованного snapshot. Из `apps/web`: `npm run generate:api`, `npm run check:api`; generated.ts вручную не редактировать. Первичный экспорт/проверку Python выполняет капитан в соответствующем AI checkout. [Исходные инструкции 2d2fc56](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/README.md), [текущая передача seller](../../docs/SELLER_FRONTEND_HANDOFF.md).

## Первичный экспорт и сохранённые примеры

Источник backend-экспорта: `apps/api/app/schemas` и реально зарегистрированные FastAPI-маршруты **соответствующего backend checkout**. Из его `apps/api`: `uv run python -m app.export_contracts`, проверка — та же команда с `--check`.

- `openapi.json` — health, авторизация, ручной учёт и отдельно принятый HTTP drafts; Bearer security, параметры, discriminated sale/repayment, multipart text/audio, ответы и ошибки.
- `examples.json` — валидируемые учебные примеры. `RepaymentOperationResponse` — второй пример схемы `OperationResponse`, не отдельный тип API. Это не настоящие пользователи, долги или результат AI.
- `demo-seed.json` — согласованные UUID/slug площадок, точек, товаров и покупателей. Memberships и токены не экспортируются.

Общий текстовый контракт: `docs/team5/02_ARCHITECTURE_API.md`; локальные настройка и ограничения: `apps/api/README.md`. HTTP заявок ещё нет; DraftResponse присутствует в новом OpenAPI, однако сам AI backend и его frontend UI в seller-ветку не интегрированы. Генерацию TypeScript-клиента поддерживает владелец seller-web. Ограничение текущего генератора multipart XOR и план дальнейшей интеграции описаны в seller handoff.
