# Seller web — передача

2026-10-15, feature/seller-dashboard, Draft PR #3. Разрешение на backend 193f6e5 получено в новом задании. Только этот snapshot принят; README/DECISIONS сохраняют обе части, код backend/экспорт не менялись.

Этап A: реальные bindings /me и GET/POST customers по OpenAPI + runtime validation, раздельные capabilities, nullable contact, server balance_minor, query invalidation/CustomerPicker. Inquiries/catalog live API не включены. Локальная публичная Supabase-конфигурация игнорируется Git; backend env/DB/passwords отсутствуют, health ECONNREFUSED. Живые проверки не объявлены успешными.

Проверки: typecheck/lint/build/check:api, 70 unit/component и 6 E2E прошли. Последний опубликованный hash до этапа: 27cfdae; актуальный — git log -1 --format=%H. После этапа commit/fetch/pull --ff-only feature/push. Далее этап B — Polaris-inspired UI и 6 screenshots, отдельные проверки/commit/push. Подробно: ../SELLER_FRONTEND_HANDOFF.md.
