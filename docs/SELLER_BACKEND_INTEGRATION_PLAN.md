# План интеграции backend/ledger-auth — без merge и без активации

Срез 2026-10-15. Источник анализа: commit **193f6e527d716549d759d805dc4b86db1d9e059e**, [PR #4](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/4), ветка капитана `backend/ledger-auth`. Автор PR — foxfordkz-cyber, PR open/non-Draft, но явного подтверждения капитана на включение в нашу ветку нет. Последняя инструкция пользователя: **не выполнять merge этой ветки**. Этот документ не является согласием на интеграцию.

## Что уже принято

В `feature/seller-dashboard` согласованно принят только `origin/main` **ced32e7** (bootstrap, PR #2). Он содержит health и компоненты OpenAPI, без `/me` и клиентов. Backend и packages/contracts идентичны этому main. Типы `apps/web/src/shared/api/generated.ts` генерируются **из принятого bootstrap**, а не из неподтверждённой ветки. Проверка `npm run check:api` обнаруживает расхождение экспорта и TS.

## Что фактически найдено в кандидате 193f6e5

| Маршрут / схема | Подтверждённая форма из исходников/OpenAPI кандидата |
|---|---|
| GET `/api/v1/me`, `MeResponse` | `{id: UUID, businesses: BusinessMembership[]}` |
| `BusinessMembership` | `id`, `slug`, `name`, `role: 'owner'`; **нет is_demo** |
| GET `/api/v1/businesses/{id}/customers` | `Page_CustomerResponse_`: `items`, `next_cursor: string|null` |
| Query клиентов | `q` до 200 символов; `limit` 1–100 (default 50); `cursor` UUID или null |
| POST `/api/v1/businesses/{id}/customers` | JSON `CustomerCreate`, ответ 201 `CustomerResponse` |
| `CustomerCreate` | `display_name` 1–200, `note` до 2000 (default пусто), `contact` string до 200 или null (default null). Строки trim, extra поля запрещены |
| `CustomerResponse` | входные поля + `id`, `business_id`, `balance_minor` (целые тиыны, серверный остаток) |
| Авторизация | Bearer Supabase JWT/JWKS; backend проверяет подпись/issuer/audience/срок/subject и membership; чужие сущности возвращают 404 |
| Дополнительно в кандидате | operations, reverse, history/open sales, summary; финансовый frontend принадлежит участнику 4 |

Ни GET/PATCH inquiries, ни публичный shop/catalog в этом кандидате не реализованы. Наличие `InquiryCreate` в components не означает готовый HTTP endpoint. Никаких таких bindings добавлять по догадке нельзя.

## Изменения frontend после подтверждения капитаном

1. Начать с чистого `feature/seller-dashboard`, fetch и pull --ff-only этой же ветки. Сверить подтверждённый hash с актуальным HEAD backend. При смене состава изменений повторить анализ. Backend-ветку и main не менять.
2. Отдельно согласовать включение кандидата или дождаться его merge в main; при merge в feature сохранить обе части README/DECISIONS. Backend принимать без редактирования. Не переносить конфиденциальные `.env` из рабочего окружения капитана.
3. После принятия реального OpenAPI: `cd apps/web; npm run generate:api; npm run check:api`. Использовать `components['schemas']['MeResponse']`, `CustomerCreate`, `CustomerResponse`, `Page_CustomerResponse_`. Не писать альтернативные wire types.
4. `shared/api/bindings.ts`: добавить runtime-валидацию UUID, строк, role, структуры lists и безопасных целых остатков; нормализовать только в UI views. Для `/me` проверить формат и идентичность пользователя по auth context. Для всех клиентов проверять business_id; неизвестные/чужие данные не показывать.
5. `shared/api/models.ts`: согласовать отсутствие is_demo в Membership. Не вычислять демо-статус из slug/UUID и не выдумывать флаг сервера. До решения учебные названия берутся как есть; капитан должен подтвердить способ маркировки. `balance_minor` передавать как серверное поле без вычисления в UI, учесть безопасный диапазон JS integer.
6. `shared/api/gateway.ts`: разделить возможность создания клиента и обновления заявки. Текущий canWrite консервативно требует оба binding; включение customers не должно активировать отсутствующий PATCH inquiries. Сохранить exports совместимыми, передать новый интерфейс участнику 4. Demo остаётся read-only для обеих операций.
7. Маппинг CustomerInput → CustomerCreate: trim имени/заметки/контакта, пустой необязательный контакт → null; отдельные записи с одинаковым именем, без дедупликации. Проверить серверные лимиты формы. GET использует q/limit/cursor только по принятому OpenAPI, query keys по scope+businessId+search. После 201 инвалидировать только customers текущего scope/точки и вернуть созданного клиента в CustomerPicker.
8. Сохранить единый API transport (`useRuntime().api`), свежий token и AbortSignal, `ErrorResponse`/request_id. 401 — повторный вход, 403/404 — отсутствие доступа, 409/422/429 — понятный локализованный ответ; черновик не терять. Поздние ответы старой identity не должны попасть в новую.
9. Заявки и каталог оставить на честных страницах недоступности в live-режиме до их реальных методов/схем. Учебный просмотр — только явная кнопка Demo Mode.

## Конфигурация, которая ещё нужна в нашей копии

- Доступный API URL с `/api/v1` (локальный адрес README — инструкция запуска, не доказательство работающего процесса).
- Публичные Supabase URL и publishable/anon key, подтверждённые учётные записи для browser login. Пароли/токены не публиковать в документах или коде.
- Точный `ALLOWED_ORIGINS` API. Vite здесь по умолчанию слушает `127.0.0.1:5173`; `localhost:5173` — другой origin. Для browser-тестов отдельно `127.0.0.1:4173`.
- Две разрешённые точки/пользователя для проверки изоляции; очищаемые тестовые данные согласовать с капитаном. Тесты, изменяющие PostgreSQL, не запускать на общей demo/рабочей базе.

## Приёмочные проверки будущей интеграции

- Проверить реальные ответы `/me`, сохранение сессии после reload, вход другим продавцом и отсутствие старого cache/черновиков.
- Проверить GET customers с q, page cursor, одинаковыми именами и пустым контактом; POST 201, новый UUID выбран в CustomerPicker, запись видна после reload.
- Чужой business/customer/cursor UUID не раскрывает данные; реальные 401/403/404, истёкший JWT, JWKS/CORS недоступность не дают доступа.
- Unit и runtime-validation tests по примерам капитана, contract drift check, typecheck/lint/build, E2E 360/768/1440. Отличать test gateways/fixtures от настоящих Supabase и PostgreSQL.
- Настоящую денежную форму тестировать вместе с участником 4. Денежную бизнес-логику и backend здесь не переписывать.

Backend handoff кандидата сообщает о 101 PostgreSQL tests и live Supabase smoke. Это результаты капитана; seller frontend их не повторял и не выдаёт за собственную проверку. В нашей копии конфигурации Supabase/доступной БД/API нет. Подключение `/me` и customers остаётся **планом**, а не завершённой интеграцией.
