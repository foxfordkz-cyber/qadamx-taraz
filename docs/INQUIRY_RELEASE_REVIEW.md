# Следующий выпуск: публичная заявка, регистрация и APK

2026-10-17. Основа **8ee78ae58e529e3e32c11082a425576b558b0f9e**: main/deploy-062/deploy/permanent-062 повторно сверены. PR41/42 уже включены, повторного merge нет. Отдельная ветка `integration/public-inquiry-release`.

## Принято для web

Из `feature/public-inquiry-form:e6c9ddba207eed9c0ec9d4b69924de9647cc560f` перенесены **только** компонент и тесты, без старой базы1324885 и перезаписи общего public-web handoff. Подключены `businessName={b.name}` и сохранён `key={b.id}`. Review исправил unknown→4xx→новый key, добавил внутреннюю изоляцию по businessId, игнорирование поздних ответов и Unicode code-point validation. [Компонентная передача](handoffs/public-inquiry.md).

Проверенный опубликованный APK0.2.2+5 заменяет устаревшую ссылку0.2.1 в витрине. Пометка **тестовой сборки** сохраняется; это не завершённая Android-приёмка и не merge PR45. Общие Auth, API0.6.2/OpenAPI/generated, customer recovery, денежные правила, аналитика, GLB и backend e699158 не изменены.

## Фактические проверки кандидата

| Набор | Результат |
|---|---|
| `npm ci --no-audit --no-fund` | PASS, неизменный lock |
| `npm run test -- --maxWorkers=1` | **333/333**,23файла;14проверок формы входят сюда |
| `npm run typecheck`, `lint`, `build`, `check:api` | PASS |
| Recovery Chromium | **5/5**, synthetic API |
| QA кабинет/Auth | **21/21**, synthetic |
| Voice/ledger/analytics journey | **1/1**, synthetic |
| Microphone | **18/18**, synthetic device |
| General Analytics/Seller/public | **24/24**, synthetic |
| Auth | **7/7**, synthetic; не email confirmation |

Наборы пересекаются, не складывать в уникальный итог. Первый general-прогон23PASS/1FAIL ожидал старые подписи «Заявка продавцу/Имя посетителя»; тест обновлён под утверждённые RU/KZ поля, добавлена проверка настоящего имени магазина. Повтор24PASS. После правки E2E повторены typecheck/lint. Приложение ради старого селектора не откатывалось. Сохранилось предупреждение крупного3Dчанка.

**Живое до release:** local dist кандидата подставлен только как статика в изолированном Chrome на разрешённом Vercel origin, настоящий Supabase+Render. Это ещё не production-размещение кандидата. LoginA6/B3; hotspot MART→правильный shop/name; RU/KZ360/390/1440; один POST сохранён, его ответ локально скрыт, явный повтор same client_request_id/body вернул тот же id. В inbox владельца ровно одна запись, в другой точке нет, B foreign inbox404. Production API не повреждался. [Артефакт](qa/inquiry-release/live-candidate.json).

Учебная заявка **e77aa7d2-1799-4139-be37-728642d0925d**, магазин **ad6203bc-7320-5b36-982b-135504c5af68**, `mart-demo-clothes`. Имя «Учебная заявка интеграции 2026-10-17 657774», контакт «Учебный контакт — не связываться». Одна новая запись плюс replay; оставлена в БД. Нет денежных операций, AI, seed, очистки или миграций. Локальная редкая гонка/unknown→4xx подтверждены изолированными тестами, не дополнительными заявками.

## Отдельные этапы

- **Регистрация PR43 eba0f91**: новый код не появился, callback/PKCE/exchange отсутствуют. [Review по уже согласованному контракту и точные настройки](REGISTRATION_43_CONTRACT_REVIEW.md). Email включён/confirmation required подтверждены public settings; Site URL/allowlist/template не доступны без management, их применение не подтверждено. Ничего не перенастроено. Владелец frontend реализует callback; капитан фиксирует/сохраняет текущие настройки и обеспечивает настоящую email-приёмку. Автоматических memberships нет.
- **Mobile PR45 cbb4d0c**, APK0.2.2+5/source96ef1c4: [собственная проверка файла/hash/config и checklist](MOBILE_022_ARTIFACT_REVIEW.md). Native shell/Auth/business/livestock; CRM — системный браузер с отдельной сессией. PR45 остаётся отдельным Draft, физическое устройство не принято, новый APK не собирался.
- **Новые ветки во время приёмки:** `frontend/public-inquiry-safe:721da4ea1140086c21fd093219497862eee57836` (PR46) — расширенный альтернативный компонент/API adapter/стили и harness. Review подтвердил собственную sticky-unknown защиту и reset boundary, но whole-branch не переносился поверх уже проверенного согласованного e6c9dd-кандидата. Его общий build по handoff блокирует непереданный обязательный businessName; наш выпуск это подключение уже исправляет. Автору следующий шаг — сравнить с новым main, переносить только оставшиеся изменения (deadline/receipt validation/shared UI), повторить общую приёмку, не повторно заменять форму вслепую. Его34/7результаты — авторские, не наши333/E2E.
- `feature/cabinet-catalog-polish:d010f5e9d6bc85995ded9201f7817a3debd4ca37` меняет seller Catalog и общий merchant.css, **не ShopPage**; это отдельная полировка вне согласованного выпуска формы. Нового подтверждённого ShopPage SHA нет. Старый public-storefront8818e8b и его каркасы не переносились.

## Выпуск, откат и границы доказательств

После успешной приёмки разрешён обычный merge/push кандидата в main и обе deploy-ветки. Production Vercel запускается отdeploy-062; факт deployment подтверждается отдельно статусом точногоSHA и байтами production. Не считать push обновлением сайта.

Точка отката — предыдущая сборка **8ee78ae**; перед push фиксируются GitHub Vercel event и текущие публичные хеши. При web-регрессии капитан может Promote прежний deployment, либо создать обычный revert frontend commit. Никакого DB downgrade или отката backend recovery. Render auto-deploy отключён по действующей конфигурации; apps/api равен e699158, Render restart/deploy не запускается. Process SHA e699158 — последнее подтверждение капитана из панели, а не новое собственное management-чтение; публичный API commit не раскрывает.

Состояние inquiry только в памяти экземпляра: после закрытия/reload отдельного receipt lookup нет; контакты не сохраняются в localStorage. Customer recovery остаётся прежним durable механизмом. Реального Android, аппаратного WebGL и физического микрофона этот этап не принимает. Исходный recording.webm отсутствует, его старый инцидент не закрывается. Платных AI-проб0.
