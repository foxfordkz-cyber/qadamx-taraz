# Backend integration — состояние этапа A

Одобренный 193f6e5 принят в feature/seller-dashboard по прямому разрешению капитана/пользователя. Прежний анализ и ожидание подтверждения завершены. Код backend не редактировался. Следующий согласованный этап обновляет только OpenAPI/generated.ts из AI snapshot `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`; код AI-ветки, миграции и UI не включены.

OpenAPI 0.3.0 добавляет только HTTP POST drafts; существующие paths/20 schemas/security семантически прежние. Внешних `$ref` нет, дополнительные файлы не нужны. API /me и customers совместимы. Новый JSON не экспортировать из старого локального apps/api: воспроизводимая frontend-генерация выполняется через npm run generate:api/check:api, backend export проверяется в соответствующем checkout капитана. Ограничение генератора multipart XOR и дальнейшие проверки указаны в основном handoff.

Подключены GET /api/v1/me, GET/POST /api/v1/businesses/{id}/customers. Типы generated.ts получены из принятого OpenAPI. Runtime-валидация проверяет UUID, membership role/identity, nullable/default поля, строковые лимиты, cursor и safe-integer balance_minor. GET/POST проверяют business_id. Контакт необязателен, пустое поле → null. Создание клиентов разрешается независимо от недоступных заявок. Membership не имеет is_demo, флаг не придумывается.

HTTP inquiries/catalog отсутствуют в backend и bindings; эти live endpoints не вызываются. Финансовые страницы принадлежат участнику 4, его логику не копировать.

Публичная Supabase-конфигурация находится только в игнорируемом apps/web/.env.local. Server apps/api/.env и PostgreSQL отсутствуют; health на 127.0.0.1:8000 дал ECONNREFUSED. Контрактные проверки не являются live-проверками. Для них нужны API, DB, два тестовых аккаунта/пароля безопасным каналом; frontend CORS origins согласованы localhost:5173 и 127.0.0.1:5173. Общую demo-БД не изменять без согласования.

После появления среды проверить реальные login/refresh/reload, /me 6/3 memberships, поиск/создание/пагинацию/повторную загрузку клиентов, чужие business/customer/cursor IDs, отсутствие token, 401/404, cache cleanup. Использовать тестовые UUID только в проверках, не hardcode UI. Подробный прогресс и команды — SELLER_FRONTEND_HANDOFF.md.

Капитан сообщил о прошедшем live TypeScript-client smoke /me, customer create, sale, repayment, history и summary. Это не собственная seller/browser проверка; живой browser login, CORS и AI UI остаются отдельными этапами.
