# Seller web — передача

2026-10-15, только `feature/seller-dashboard`, Draft PR https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3. Main не менять, merge PR и force push запрещены.

Завершены этап A (публикация `246851b2d4df996f054c7b1a27b2ba2933d2b3ee`) и этап B (Polaris-inspired UI). Принят только одобренный backend `193f6e5`; код apps/api и экспорт packages/contracts не редактировались. Актуальный HEAD: `git log -1 --format=%H`.

Live bindings /me и GET/POST customers используют OpenAPI, runtime validation, nullable contact, server balance_minor, identity/business guards, общие hooks и CustomerPicker. Supabase session restore/token/cache boundaries сохранены. Заявки/каталог live API не включены; Demo явно read-only.

UI: dashboard/actions, desktop customer list / mobile cards, локальный поиск заявок, RU/KZ, 6 новых Demo screenshots. Shopify зависимости не добавлены. Проверки A: 70 unit/component и 6 E2E; B: 71 и 8; typecheck/lint/build/check:api/format:check passed, ширины B 360/390/768/1440.

Публичная конфигурация только в игнорируемом apps/web/.env.local. Нет server env/БД/passwords, health ECONNREFUSED. Живые Supabase/DB/CORS проверки ожидают среды капитана. Денежные и публичные модули других участников не переписаны.

Подробные файлы, архитектура, маршруты, точные команды и следующий шаг: [основной handoff](../SELLER_FRONTEND_HANDOFF.md). [Интерфейсы](../SELLER_FRONTEND_INTEGRATION.md), [дизайн/screenshots](../SELLER_DESIGN_NOTES.md). Следующий шаг — live acceptance при готовом серверном окружении; не повторять merge уже принятого snapshot.
