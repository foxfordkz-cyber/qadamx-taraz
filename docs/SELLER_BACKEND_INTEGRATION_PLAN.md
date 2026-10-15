# Backend integration — состояние этапа A

Одобренный 193f6e5 принят в feature/seller-dashboard по прямому разрешению капитана/пользователя. Прежний анализ и ожидание подтверждения завершены. Backend и контрактные экспорты не редактировались.

Подключены GET /api/v1/me, GET/POST /api/v1/businesses/{id}/customers. Типы generated.ts получены из принятого OpenAPI. Runtime-валидация проверяет UUID, membership role/identity, nullable/default поля, строковые лимиты, cursor и safe-integer balance_minor. GET/POST проверяют business_id. Контакт необязателен, пустое поле → null. Создание клиентов разрешается независимо от недоступных заявок. Membership не имеет is_demo, флаг не придумывается.

HTTP inquiries/catalog отсутствуют в backend и bindings; эти live endpoints не вызываются. Финансовые страницы принадлежат участнику 4, его логику не копировать.

Публичная Supabase-конфигурация находится только в игнорируемом apps/web/.env.local. Server apps/api/.env и PostgreSQL отсутствуют; health на 127.0.0.1:8000 дал ECONNREFUSED. Контрактные проверки не являются live-проверками. Для них нужны API, DB, два тестовых аккаунта/пароля безопасным каналом; frontend CORS origins согласованы localhost:5173 и 127.0.0.1:5173. Общую demo-БД не изменять без согласования.

После появления среды проверить реальные login/refresh/reload, /me 6/3 memberships, поиск/создание/пагинацию/повторную загрузку клиентов, чужие business/customer/cursor IDs, отсутствие token, 401/404, cache cleanup. Использовать тестовые UUID только в проверках, не hardcode UI. Подробный прогресс и команды — SELLER_FRONTEND_HANDOFF.md.
