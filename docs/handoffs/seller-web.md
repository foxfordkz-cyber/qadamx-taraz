# Seller web — передача

2026-10-16, только `feature/seller-dashboard`, Draft PR https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3. Main не менять, merge PR и force push запрещены.

Этап D: кабинет согласован с настоящей публичной темой `feature/public-storefront` на 8818e8b73ecc2e2dd2f517f18796782b10d1872f (read-only reference, без merge). Shared tokens, Manrope+локальный Noto Kazakh fallback/OFL, green/lime qadam mark; Dashboard/Customers/Inquiries/Catalog и компактная mobile nav с Dialog «Ещё». Каталог фильтруется локально, API не расширен. Auth/runtime/shared API/backend/чужие frontend-модули и CustomerPicker exports сохранены. Прежняя красная тема B заменена по новому запросу.

Финальные проверки D: typecheck/lint/build/check:api/format:check passed, **74 unit/component + 9 E2E**, 360/390/768/1440, RU/KZ, font faces, focus/Escape/skip link и touch targets. 10 реальных Demo screenshots в docs/screenshots; источники и галерея в SELLER_DESIGN_NOTES.md. Реализация D опубликована: **95e3bd4cd42d5642ac6f56e22815d1d1f820a321**, fetch/pull --ff-only (Already up to date) и push прошли, remote HEAD совпал; PR #3 обновлён, open/draft. Финальная запись меняет только handoff; актуальный HEAD: git log -1 --format=%H.

Завершены этап A (публикация `246851b2d4df996f054c7b1a27b2ba2933d2b3ee`) и этап B (Polaris-inspired UI, `e8321f0cb5c7056d284c831d4e6ae7b0293424ca`). Оба отправлены после fetch/pull --ff-only; remote hash совпал. Последний опубликованный seller HEAD перед этапом C: `9b4156122e22f12839f9f69384cb79a43e90c730`. Код apps/api остаётся на одобренном `193f6e5`. Актуальный HEAD: `git log -1 --format=%H`.

Этап C: согласованно взят только OpenAPI 0.3.0 из `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`, существующим генератором обновлён generated.ts. Добавлен HTTP POST drafts; старые paths/20 schemas/security семантически прежние. Все `$ref` внутренние, дополнительных файлов из AI-ветки не нужно. AI-код/миграции/UI/финансовая логика не включены. README и docs/PROJECT_STATUS.md объединены с сохранением обеих частей; собственные integration/PR/handoff docs обновлены. Не экспортировать новый JSON из старого локального Python backend. Известное ограничение multipart XOR генератора описано в основном handoff.

Этап C опубликован: `b9fd3b41998b2cd1ce904f15e558408e13e3f135`, remote hash совпал после fetch/pull --ff-only/push; PR #3 обновлён и остаётся open/draft. Финальная запись меняет только документацию. При задержке общего fetch на новых pack адресный fetch рабочей ветки прошёл; детали в основном handoff.

Live bindings /me и GET/POST customers используют OpenAPI, runtime validation, nullable contact, server balance_minor, identity/business guards, общие hooks и CustomerPicker. Supabase session restore/token/cache boundaries сохранены. Заявки/каталог live API не включены; Demo явно read-only.

UI: dashboard/actions, desktop customer list / mobile cards, локальный поиск заявок, RU/KZ, 6 новых Demo screenshots. Shopify зависимости не добавлены. Проверки A: 70 unit/component и 6 E2E; B: 71 и 8; typecheck/lint/build/check:api/format:check passed, ширины B 360/390/768/1440.

Проверки C повторно прошли: generate:api/check:api/typecheck/lint/test/build/test:e2e/format:check, **71 unit/component и 8 E2E**. Повторная генерация побайтово стабильна; screenshots без изменений. E2E потребовали разрешённого loopback после sandbox EACCES. Root/contract README различают локальный backend 193f6e5 и согласованный контракт 0.3.0; примеры/seed прежние.

Публичная конфигурация только в игнорируемом apps/web/.env.local. Нет server env/БД/passwords, health ECONNREFUSED. Живые Supabase/DB/CORS проверки ожидают среды капитана. Денежные и публичные модули других участников не переписаны.

Капитан подтвердил live TypeScript-client /me/customer create/sale/repayment/history/summary. Это не собственные browser-проверки seller-сессии. Browser login/CORS и AI UI ещё не подтверждены.

Подробные файлы, архитектура, маршруты, точные команды и следующий шаг: [основной handoff](../SELLER_FRONTEND_HANDOFF.md). [Интерфейсы](../SELLER_FRONTEND_INTEGRATION.md), [дизайн/screenshots](../SELLER_DESIGN_NOTES.md). Следующий шаг — live acceptance при готовом серверном окружении; не повторять merge уже принятого snapshot.
