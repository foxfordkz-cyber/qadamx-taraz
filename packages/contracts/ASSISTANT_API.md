# «Спросите Qadam» — контракт API 0.7.1

`POST /api/v1/businesses/{id}/assistant`, Bearer JWT продавца. Схемы — в `openapi.json` (`AssistantRequest`, `AssistantResponse`), примеры — в `examples.json` (`AssistantRequest`, `AssistantResponse`, `AssistantFallbackResponse`, `AssistantFactsRequest`, `AssistantFactsResponse`, `AssistantDisabledErrorResponse`). Типы для web — `apps/web/src/shared/api/generated.ts`.

## Запрос

```json
{ "question": "Кто мне должен больше всего?", "locale": "ru", "days": 7, "ai": true }
```

- `question` — 1–500 символов, обязательное.
- `locale` — `ru` или `kk`, по умолчанию `ru`. Ответ, подписи фактов и тексты напоминаний на этом языке.
- `days` — `7` или `30`, по умолчанию `7`. Тот же период, что в аналитике.
- `ai` — по умолчанию `true`. `false` — сводка сервера из тех же фактов без вызова модели, бесплатно, мгновенно и без дневного лимита. Ответ с `source="facts"`. Используйте при открытии страницы аналитики и главной, а `ai=true` — только по явной кнопке или вопросу продавца.

## Ответ 200

| Поле | Что это |
|---|---|
| `answer` | 1–4 предложения для продавца |
| `facts[]` | Цифры, посчитанные сервером: `key`, `label` (на языке запроса), `value_minor` (тиыны) или `count`. Для `key="debtor"` — `label` = имя клиента, `customer_id`, `value_minor` = остаток долга. До 5 должников по убыванию долга |
| `actions[]` | До 3 кнопок: `open_debts` → `/seller/debts`, `new_sale` → `/seller/sale`, `open_history` → `/seller/history`, `open_analytics` → `/seller/analytics`, `reminder_draft` → карточка с `text` и кнопкой «Скопировать» для клиента `customer_id`. Ничего не отправляется |
| `source` | `ai` — сформулировала модель, все суммы и клиенты проверены по `facts`. `fallback` — AI недоступен или ответ не прошёл проверку, текст собран сервером. `facts` — запрошен `ai=false`, текст собран сервером без модели |
| `days`, `locale`, `as_of`, `timezone`, `currency` | Период и момент расчёта |

Ключи фактов: `sales`, `sales_previous`, `sales_change`, `receipts`, `outstanding`, `debtors`, `sales_count`, `average_ticket` (может отсутствовать без продаж), `today_sales`, `today_receipts`, `debtor`.

Подписи в интерфейсе: для `ai` — «Ответ AI по вашим данным. Цифры посчитал сервер». Для `fallback` — «AI недоступен, показаны данные сервера». Для `facts` — «Сводка по данным сервера, без AI».

## Ошибки

| Статус | `error.code` | Когда |
|---|---|---|
| 401 | `UNAUTHORIZED` | Нет или неверный JWT |
| 404 | `NOT_FOUND` | Чужая или несуществующая точка |
| 404 | `ASSISTANT_DISABLED` | На сервере выключено (`ASSISTANT_ENABLED=false`, по умолчанию). Скрыть помощника |
| 422 | `VALIDATION_ERROR` | Пустой вопрос, >500 символов, другой `locale` или `days` |
| 429 | `ASSISTANT_LIMIT` | Дневной лимит пользователя (`ASSISTANT_DAILY_LIMIT`, 20). «Лимит вопросов на сегодня исчерпан» |

AI-сбой не даёт 5xx: приходит 200 с `source="fallback"`.

## Гарантии

- Нет записей в журнал. Модель видит только `facts`, вопрос, язык и период.
- Каждое число в `answer` и в тексте напоминания должно совпадать с фактом; `customer_id` — только из фактов. Иначе — `fallback`.
- Вопрос, ответ, имена и суммы не пишутся в логи; в диагностике только тип ошибки и длина вопроса.
- Лимит хранится в памяти процесса и сбрасывается при перезапуске сервера. Это мягкая защита бюджета, не учёт расходов.
- Демо-режим web не вызывает этот метод: показывает заранее написанный пример с подписью «Пример ответа в демо, без AI».
