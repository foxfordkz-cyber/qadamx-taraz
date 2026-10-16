# Seller fixes — QA-001 / QA-003

2026-10-16. Ветка **fix/seller-auth-unicode** создана в отдельном worktree от актуальной **origin/integration/team-mvp**, точный base **3d009dc86c93debcab05dedda530b7d1fe62a304**. Репозиторий: https://github.com/foxfordkz-cyber/qadamx-taraz. Цель нового Draft PR — integration/team-mvp. PR #11 (design) и #12 (QA) не изменяются.

## Проблема и поведение после исправления

**QA-001.** Первая сессия A начинает запрос; пользователь переключается A→B→A. Раньше поздний 401 первой A проходил проверку user ID, очищал новый cache и требовал повторного входа. Теперь AuthProvider захватывает поколение сессии в callbacks. Монотонный ref обновляется синхронно при смене identity, logout и Demo, до публикации нового React scope. getToken проверяет поколение перед getSession и после await; старый markExpired не изменяет текущую сессию/cache. Завершение старого logout также не очищает более новую сессию. Текущий 401 по-прежнему требует reauth; TOKEN_REFRESHED одной identity сохраняет scope/cache и возвращает свежий token.

**QA-003.** CustomerCreate и bounded response text используют Unicode code points вместо UTF-16 .length. Лимиты сохранены из принятого контракта: имя 200, заметка 2000, контакт 200. Kazakh BMP, emoji/символы вне BMP и decomposed sequences считаются согласованно. Нормализация не добавлена; прежние trim и optional contact→null сохранены.

Форма создания использует тот же validator, что serializer. Native maxlength убран только у трёх клиентских полей, поскольку он обрезал допустимые non-BMP строки. Превышение лимита сохраняет полный ввод, показывает aria-invalid/описанные ошибки RU/KZ и не отправляет POST; после исправления поле можно сохранить. Shared response reader принимает допустимые границы и отклоняет max+1. CustomerPicker использует эту же форму.

## Состав изменений и границы

Production: apps/web/src/app/auth.tsx; features/seller/Customers.tsx; shared/api/bindings.ts; shared/unicode.ts; shared/i18n/ru.ts и kk.ts. Изменения не затрагивают CSS/дизайн, маршруты, app/modules/runtime, API transport/gateway/queries, Supabase SDK, financial/voice/summary/public feature-модули, assets или package/lock.

Backend, OpenAPI **0.4.0** и generated.ts не менялись. **QA-002/next_cursor остаётся без изменений** до решения капитана, не маскируется изменением reader/schema. Полная старая QA-ветка не объединялась: адаптировано только воспроизведение QA-001 через App, добавлены целевые Auth/Unicode tests. Старые утверждения QA/API 0.3 о неподключённых модулях не переносились.

Тесты: src/test/auth-epoch.test.tsx (9), customer-unicode.test.tsx (15), qa-001-app.test.tsx (1); e2e/auth-unicode.spec.ts (3) и fixes.playwright.config.ts. E2E config запускает все прежние spec вместе с новыми на отдельном порту 4177 с синтетическими Auth/API. Существующий screenshot-writer проверяется, его результаты не включаются в fix diff.

## Собственные проверки

Из apps/web выполнены npm ci (357 packages), связанные regression tests **25 passed**, затем полный **106 passed в 11 файлах**. check:api/typecheck/lint/build прошли, generated соответствует исходному OpenAPI 0.4. Targeted Prettier check всех изменённых TS/TSX также прошёл. Полный E2E прогон завершился: **11/11 passed** (8 прежних + 3 новых), 1 worker, retries 0. Все исходные spec, включая screenshot writer, выполнены. PNG screenshot-writer не имеют diff с исходным HEAD и не входят в fix: дизайн/screenshots сохранены.

Новые browser regressions отдельно прошли **3/3**: реальный SDK между двумя вкладками с A→logout→B→logout→A и поздним POST 401, а также Unicode input→POST→response на 390/1440. Unit/App regression проверяет прямой A→B→A без промежуточных logout. Использованы только синтетические tokens/ответы; это не live Supabase/БД.

Первый browser запуск не стартовал из-за тайм-аута automatic permission review; разрешённая повторная попытка запустилась. В новых E2E исправлен локатор диалога, привязанный к RU title после смены языка; для многошагового cross-tab сценария задан 60s budget после холодной загрузки. Production ради тестов не изменялся.

Команды из apps/web:

```powershell
npm ci
npm test -- src/test/auth-epoch.test.tsx src/test/customer-unicode.test.tsx src/test/qa-001-app.test.tsx
npm run check:api
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e -- --config e2e/fixes.playwright.config.ts
npx prettier --check src/app/auth.tsx src/features/seller/Customers.tsx src/shared/api/bindings.ts src/shared/unicode.ts src/shared/i18n/ru.ts src/shared/i18n/kk.ts src/test/auth-epoch.test.tsx src/test/customer-unicode.test.tsx src/test/qa-001-app.test.tsx e2e/auth-unicode.spec.ts e2e/fixes.playwright.config.ts
```

## Ограничения и продолжение

Live Backend/Supabase/JWT/JWKS/CORS/DB persistence в этой задаче не проверялись. Серверных credentials/test passwords нет; env/секреты не включены. Финансовые тесты используют сохранённые stubs и не пишут в общую БД. Физический Android не проверялся. npm ci сообщил 3 унаследованных dev audit findings; зависимости/lock не менялись. Build сохраняет warning о крупном 3D chunk и пустом auth chunk без локального live env.

Для продолжения прочитать AGENTS.md, TEAM_INTEGRATION.md, этот файл и собственный handoff. Работать только fix/seller-auth-unicode; безопасный fetch/pull --ff-only своей ветки, без merge/force push. QA-002 и live acceptance отдельно согласует капитан. Публикация/точные commits фиксируются после успешного push.

## Совместимость с design PR #11

Production diff отдельно проверен через git apply --check в чистой рабочей копии feature/seller-design-integration:c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b: применяется без конфликтов. Это только проверка патча, файлы/ветка/PR11 не менялись. Полный regression набор выполнен на указанной base Team MVP; отдельное применение дизайна остаётся за review капитана.
