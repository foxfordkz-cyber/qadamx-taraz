# Seller frontend — передача

Срез 2026-10-15. Ветка **feature/seller-dashboard**, [Draft PR #3](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/3). В Ready не переводить и в main не сливать без согласования.

Последние опубликованные этапы: `e05c1a1` (фильтры/поиск), `3b03ed3fe74188d848693891fb6132515cb29627` (согласованный merge main ced32e7). Fetch/pull --ff-only feature-ветки и push прошли. Последующий этап добавляет типы bootstrap, стандартные ошибки и план интеграции; точный hash после записи — git log -1 --format=%H.

**backend/ledger-auth 193f6e5 не объединена.** Капитан не подтвердил готовность; пользователь прямо требует отдельное подтверждение и согласование. Не активировать /me/customers из этой ветки. Backend/export идентичны принятому main ced32e7. Два конфликта README/DECISIONS разрешены с сохранением обеих сторон; код капитана не редактировался.

Реализованы единое приложение, auth provider/cache isolation, RU/KZ, UI-kit, кабинет, заявки/клиенты/каталог и read-only Demo Mode. Новое: локальный фильтр заявок с честной пагинацией, debounce 250 ms/очистка поиска, generated types/check:api, ErrorResponse/request_id и локализованные 409/422/429. Shared компоненты клиентов доступны участнику 4. Модули участников 2/4 пока отсутствуют.

Проверки: **52 unit/component + 6 Chromium E2E**, check:api/typecheck/lint/build успешны; 360/768/1440, focus/dialog, язык/поля, demo/выход. Реальный backend, PostgreSQL и Supabase/JWT/JWKS в этой frontend-сессии не проверены: нет конфигурации и аккаунтов.

Полная передача: [SELLER_FRONTEND_HANDOFF](../SELLER_FRONTEND_HANDOFF.md). Интерфейсы: [INTEGRATION](../SELLER_FRONTEND_INTEGRATION.md). Подтверждённые формы кандидата и список будущих изменений: [BACKEND_INTEGRATION_PLAN](../SELLER_BACKEND_INTEGRATION_PLAN.md). Следующий шаг — подтверждение капитана, затем согласованный merge и runtime mappings; до этого никаких новых live endpoints и demo-writes.
