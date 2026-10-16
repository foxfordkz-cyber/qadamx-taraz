# Seller QA — матрица проверок

Дата: 2026-10-16. База: `a77f1a02b240dbf9e8c627937a5cb6445d92fb51`.
Ветка: `test/seller-regression`. Подробности дефектов и команд — [отчёт](SELLER_REGRESSION_REPORT.md).

## Значение статусов

- **Mock verified** — выполнен Vitest на настоящих компонентах/providers/hooks/transport с подставными Supabase и HTTP-ответами. Это не проверка серверных прав или PostgreSQL.
- **Contract verified** — проверен принятый JSON OpenAPI, его типы и соответствующие ограничения. Это не результат запроса на сервер.
- **Live verified** — собственная выполненная проверка с настоящими Auth/API/БД. В этой сессии таких результатов нет.
- **Blocked** — невозможно подтвердить в текущем окружении; написанный тест не считается пройденным.
- **Failed** — желаемое поведение проверено и не выполнено. Три проверки остаются красными без skip/todo/expected failure.

Имена файлов ниже указаны относительно `apps/web`.

## Auth и изоляция

| Сценарий | Автоматизация / доказательство | Статус |
|---|---|---|
| Успешный вход, Bearer, неверный пароль без Demo | `src/test/qa-auth-regression.test.tsx` | Mock verified |
| Восстановление INITIAL_SESSION | Новый auth suite + существующий `src/test/auth.test.tsx` | Mock verified |
| Все 8 seller routes закрыты без сессии | Параметризованный новый auth suite | Mock verified |
| Отсутствующий JWT не доходит до HTTP | Новый auth suite | Mock verified |
| 401 на POST, очистка приватных данных, восстановление своего черновика после refresh | `src/test/qa-customers-regression.test.tsx` | Mock verified |
| Истёкший/поддельный/неверно подписанный JWT отклонён настоящим сервером | Нужны Supabase/JWKS и согласованный тестовый API | Blocked |
| 401/403/404 transport | Существующий `src/test/client.test.ts`, новый customers suite | Mock verified |
| Logout, новая сессия B, отсутствие кэша/черновика A | Новый auth suite; существующий auth suite | Mock verified |
| Ошибка signOut не выдаётся за успешный выход | Существующий auth suite | Mock verified |
| A → B: поздний GET A не возвращает данные; AbortSignal отменён | Новый auth suite, transport намеренно игнорирует abort | Mock verified |
| A → B: поздний 401 A не истекает B | Новый auth suite | Mock verified |
| A → B → A: поздний 401 первой A не должен истекать новую A | `src/test/qa-known-defects.test.tsx`, QA-001 | Failed |
| Обновление token одной identity не сбрасывает кэш | Существующий auth suite | Mock verified |

## Торговые точки

| Сценарий | Автоматизация / доказательство | Статус |
|---|---|---|
| Только memberships `/me`, чужой business_id в query URL не выбирается | Новый auth suite | Mock verified |
| Прямой `selectBusiness` чужого ID игнорируется | Новый auth suite, production BusinessProvider | Mock verified |
| Отзыв выбранного membership переводит на оставшийся разрешённый | Новый auth suite | Mock verified |
| Query keys разделены по identity + business; черновики разделены по точкам | Новый auth suite | Mock verified |
| `/me.id` другой identity отклонён | Существующий `src/test/bindings.test.ts` | Mock verified |
| Чужой business_id в GET/POST ответе отклонён | Существующий bindings suite + новый customers suite для формы POST | Mock verified |
| Некорректные UUID membership/customer отклонены | Новый customers suite | Mock verified |
| Чужой business/customer/cursor на настоящем API не раскрывает данные | Требуются два настоящих пользователя и API | Blocked |
| Изоляция PostgreSQL, grants/RLS/tenant FK, конкурентные финансовые записи | За пределами frontend mocks; выполнять с капитаном | Blocked |

## Customers

| Сценарий | Автоматизация / доказательство | Статус |
|---|---|---|
| GET списка с настоящим transport/readers | Новые auth/customers suites | Mock verified |
| Поиск: trim, NFC, спецсимволы, debounce; stale results скрыты | Новый customers suite + существующий screens suite | Mock verified |
| Cursor второй страницы сохраняет q/limit; load-more исчезает на последней | Новый customers suite | Mock verified |
| Одинаковые имена имеют разные UUID и остаются отдельными | Новый customers suite + существующий picker test | Mock verified |
| POST 201, optional contact → null, реальный body, list invalidation | Новый customers suite | Mock verified |
| До POST response нет успеха; кнопка pending disabled | Новый customers suite | Mock verified |
| Invalidation не затрагивает другую точку | Новый customers suite | Mock verified |
| Пустое имя — нет POST; лимиты 200/2000/200 и max+1 | Новый customers suite | Mock verified |
| Unicode вне BMP в пределах maxLength | QA-003 | Failed |
| GET 403/404/409/422/429/500 не даёт empty/demo/success | Новый customers suite | Mock verified |
| POST 403/404/409/422/429/500 сохраняет ввод, без повторной мутации | Новый customers suite | Mock verified |
| POST 401 не даёт успех; требует reauth | Новый customers suite | Mock verified |
| Невалидный JSON и чужой business_id в успешном POST | Новый customers suite | Mock verified |
| Синтетический TimeoutError сохраняет форму; caller AbortSignal deadline | Новый customers suite | Mock verified |
| Автоматический timeout для зависшего production-запроса | Deadline в клиенте не задан; см. ограничение QA-G01 | Blocked |
| Сохранённый клиент переживает reload настоящей БД | Нужен live API | Blocked |

## Контракт и Demo

| Сценарий | Автоматизация / доказательство | Статус |
|---|---|---|
| TS воспроизводимо соответствует принятому OpenAPI | `npm run check:api` генерирует в памяти и сравнивает | Contract verified |
| Все `$ref` внутренние и разрешаются | `src/test/qa-contract-regression.test.ts` | Contract verified |
| Приватные endpoints требуют HTTP Bearer | Новый contract suite | Contract verified |
| UUID path/input cursor, nullable contact, pagination limits, optional note | Новый contract suite | Contract verified |
| Integer minor units, KZT, Asia/Almaty, financial request limits | Новый contract suite; денежные POST не отправлялись | Contract verified |
| Response cursor согласован с request cursor | QA-002 | Failed |
| Документированные error responses ссылаются на ErrorResponse | Новый contract suite | Contract verified |
| Разрешённые gateway calls существуют в OpenAPI; catalog/inquiries unbound | Новый contract suite + существующий bindings suite | Contract verified |
| Multipart XOR text/audio остаётся в исходном OpenAPI | Новый contract suite; generated type XOR не гарантирует | Contract verified |
| Demo только явный, read-only, без fallback на ошибке API | Существующие client/screens suites + новый customers suite | Mock verified |
| Demo customer/inquiry writes запрещены | Существующие client/screens suites | Mock verified |
| Demo не пишет деньги через sale | Раздел пока placeholder; новый browser scenario написан, но не запущен | Blocked |

## Browser E2E

`e2e/qa-seller-regression.spec.ts` содержит **13 новых сценариев**:
вход/reload/выбор точки/logout/A→B; неверный пароль; pending POST/успех/поиск;
шесть POST ошибок; 401; чужой business_id; malformed JSON; ручной Demo без API/финансовых запросов.

Все 13 имеют статус **Blocked**, не Mock verified: Chromium не установлен, загрузка архивов завершилась ошибкой. Typecheck/lint и обнаружение Playwright `--list` прошли.
QA-config также включает 8 прежних сценариев `seller.spec.ts`; screenshot-writer исключён намеренно.
Итого обнаружен 21 сценарий, запуск остановлен на первой ошибке browser launch, 20 не запускались.

## Live acceptance для капитана

Подготовить отдельное согласованное тестовое окружение и двух продавцов. Проверить настоящий login/refresh/reload/logout, JWT exp/signature/issuer/audience, memberships A/B, отказ для чужих UUID/cursor, GET/POST customer с persistence, CORS и browser 401. Backend проверяет права самостоятельно. Пароли/токены не прикладывать к отчёту, не использовать общую БД для разрушающих тестов. Итоги капитана из прежнего handoff не перенесены в наши Live verified.
