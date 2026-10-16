# Актуальная передача — Auth/Unicode fixes, 2026-10-16

Отдельная ветка **fix/seller-auth-unicode** от **integration/team-mvp:3d009dc86c93debcab05dedda530b7d1fe62a304**. Новая задача исправляет QA-001 (session epoch guard для позднего401 A→B→A) и QA-003 (Unicode code-point limits в форме/body/readers). QA-002/next_cursor, backend/OpenAPI0.4/generated, CSS/дизайн и модули других участников сохранены. PR11/12 не менялись. Полного merge QA нет; только целевые regression tests.

25 связанных regression и полный прогон 106 unit/component прошли; typecheck/lint/build/check:api и targeted Prettier успешны. Полный E2E: 11/11 passed (8 прежних + 3 новых). Git/PR результат — в [SELLER_AUTH_UNICODE_FIX](../SELLER_AUTH_UNICODE_FIX.md). Там же точные команды и ограничения live. Эта ветка не заменяет отдельный design PR11, не начинает новый редизайн.

Публикация: Draft PR #14 https://github.com/foxfordkz-cyber/qadamx-taraz/pull/14 в integration/team-mvp. Отдельные commits: Auth7cf9744, Unicode8f0776f, общие E2E/docs e993a6b; push успешен, local/remote совпали. Финальный docs commit фиксирует эту передачу, полный HEAD получать git log -1 --format=%H. Тесты:106unit/component и11E2E passed. QA-002/live acceptance остаются отдельно; analytics не начинался.

Ниже сохранена историческая передача старых seller-этапов; её прежние branch/API ограничения не задают текущую fix-задачу.

---

# Seller web — передача

2026-10-15, только `feature/seller-dashboard`, Draft PR https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3. Main не менять, merge PR и force push запрещены.

Завершены этап A (публикация `246851b2d4df996f054c7b1a27b2ba2933d2b3ee`) и этап B (Polaris-inspired UI, `e8321f0cb5c7056d284c831d4e6ae7b0293424ca`). Оба отправлены после fetch/pull --ff-only; remote hash совпал. Последний опубликованный seller HEAD перед этапом C: `9b4156122e22f12839f9f69384cb79a43e90c730`. Код apps/api остаётся на одобренном `193f6e5`. Актуальный HEAD: `git log -1 --format=%H`.

Этап C: согласованно взят только OpenAPI 0.3.0 из `2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`, существующим генератором обновлён generated.ts. Добавлен HTTP POST drafts; старые paths/20 schemas/security семантически прежние. Все `$ref` внутренние, дополнительных файлов из AI-ветки не нужно. AI-код/миграции/UI/финансовая логика не включены. README и docs/PROJECT_STATUS.md объединены с сохранением обеих частей; собственные integration/PR/handoff docs обновлены. Не экспортировать новый JSON из старого локального Python backend. Известное ограничение multipart XOR генератора описано в основном handoff.

Этап C опубликован: `b9fd3b41998b2cd1ce904f15e558408e13e3f135`, remote hash совпал после fetch/pull --ff-only/push; PR #3 обновлён и остаётся open/draft. Финальная запись меняет только документацию. При задержке общего fetch на новых pack адресный fetch рабочей ветки прошёл; детали в основном handoff.

Live bindings /me и GET/POST customers используют OpenAPI, runtime validation, nullable contact, server balance_minor, identity/business guards, общие hooks и CustomerPicker. Supabase session restore/token/cache boundaries сохранены. Заявки/каталог live API не включены; Demo явно read-only.

UI: dashboard/actions, desktop customer list / mobile cards, локальный поиск заявок, RU/KZ, 6 новых Demo screenshots. Shopify зависимости не добавлены. Проверки A: 70 unit/component и 6 E2E; B: 71 и 8; typecheck/lint/build/check:api/format:check passed, ширины B 360/390/768/1440.

Проверки C повторно прошли: generate:api/check:api/typecheck/lint/test/build/test:e2e/format:check, **71 unit/component и 8 E2E**. Повторная генерация побайтово стабильна; screenshots без изменений. E2E потребовали разрешённого loopback после sandbox EACCES. Root/contract README различают локальный backend 193f6e5 и согласованный контракт 0.3.0; примеры/seed прежние.

Публичная конфигурация только в игнорируемом apps/web/.env.local. Нет server env/БД/passwords, health ECONNREFUSED. Живые Supabase/DB/CORS проверки ожидают среды капитана. Денежные и публичные модули других участников не переписаны.

Капитан подтвердил live TypeScript-client /me/customer create/sale/repayment/history/summary. Это не собственные browser-проверки seller-сессии. Browser login/CORS и AI UI ещё не подтверждены.

Подробные файлы, архитектура, маршруты, точные команды и следующий шаг: [основной handoff](../SELLER_FRONTEND_HANDOFF.md). [Интерфейсы](../SELLER_FRONTEND_INTEGRATION.md), [дизайн/screenshots](../SELLER_DESIGN_NOTES.md). Следующий шаг — live acceptance при готовом серверном окружении; не повторять merge уже принятого snapshot.
