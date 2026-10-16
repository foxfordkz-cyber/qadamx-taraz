# Seller web — передача интегрированного дизайна

## 2026-10-16: AudioInput Playback / Cancel — ожидается единый исполнитель

Новая ветка `feature/voice-playback-cancel`, отдельный worktree `work/qadam-voice-playback-cancel`, от актуальной `origin/integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.
Это подготовка, **не завершённая реализация playback/cancel**. Полный [аудит и план продолжения](../VOICE_PLAYBACK_CANCEL.md) сохраняет границы изменений, точные refs, сравнение и тестовый план.

Обязательный fetch обнаружил активное пересечение: участник №4 обновил `feature/aidana-ai-assistant` до `880d7137f39648f0bbce355369ee3e755d981f02`; его root VoiceInput/recorder/Sale уже содержат playback, cancel и удаление. По разделу 3 нового ТЗ общие voice-файлы не редактируются до выбора одного исполнителя. Владелец уведомлён [в PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20#issuecomment-6215397726); подтверждения на момент аудита нет. Наличие старого каркаса у владельца не разрешает параллельную реализацию той же задачи.

После согласования: адаптировать только AudioInput, минимальную capture/file-связь Sale, RU/KZ и regression tests из #20. Не переносить root backend/API/финансовый код, автоматическое Stop→analyse, meter/device selection или второе приложение. Preview использует тот же File, что Prepare; Cancel/Delete сохраняют ручной текст. Защита всех callbacks — отдельная generation каждой попытки; cleanup tracks/timers/listeners/object URLs. Обязательны обычные passing playback/cancel tests после реализации, без скрытия остальных failures.

В этом этапе изменены только `docs/VOICE_PLAYBACK_CANCEL.md` и этот handoff. Production, tests, Backend/OpenAPI/generated.ts, финансовая логика и PR #19 не менялись. PR #20 не объединялся; добавлен только согласующий комментарий. Его прошлые тестовые результаты не являются новыми проверками этой ветки.

Команды из `apps/web`: `npm.cmd ci`, `npm.cmd run check:api`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test -- --no-file-parallelism`, `npm.cmd run build`, `npm.cmd run format:check`. Для исходного E2E без перезаписи чужих screenshots: `CI=1 npm run test:e2e -- seller.spec.ts integration-design.spec.ts` (в PowerShell временно установить `$env:CI='1'`, затем восстановить). Полный прогон и microphone acceptance выполнить после согласованных изменений; точные фактические результаты подготовки записаны в аудите.

Свежие проверки исходной базы в новой копии: npm ci, check:api, typecheck, lint, build, format:check — PASS; **142/142 unit/component**, **13/13 scoped seller/integration E2E**, ширины 360/390/768/1440. Новых playback/cancel tests здесь ещё нет; весь default/QA/microphone E2E не заявляется пройденным. Остались прежние 3 dependency audit findings и предупреждения build empty-auth/large-3D; зависимости не обновлялись.

Physical Android **Blocked**: свежая adb-проверка — 0 устройств, HTTPS frontend preview не предоставлен. Live Backend/AI/audio в этой задаче не проверялся. Следующее действие — согласовать с капитаном/участником №4 единственного исполнителя и исходный commit, затем повторить обязательный fetch/PR/instructions audit.

Аудит опубликован: commit `03226ff6f59a6eeae2338c8e5d000657b5400a82`, push успешен, local/remote совпали. [Draft PR #21](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/21): `feature/voice-playback-cancel` → `integration/local-combined-check`; конфликтов на первом published HEAD нет. Этот следующий docs commit фиксирует публикацию, production-кода не добавляет. Точный актуальный HEAD: `git log -1 --format=%H`; PR содержит актуальный hash. Реализация по-прежнему ожидает одного согласованного исполнителя.

2026-10-16. Рабочая ветка **feature/seller-design-integration**, отдельный worktree `../qadam-seller-design`. Base — `origin/integration/team-mvp`, точный исходный HEAD **3d009dc86c93debcab05dedda530b7d1fe62a304** (Draft PR #8). Источник готового дизайна — **a77f1a02b240dbf9e8c627937a5cb6445d92fb51**. Старую feature/seller-dashboard, ветку QA test/seller-regression и чужие PR не изменять.

## Что сделано

Ограниченным diff перенесены Manrope с локальным fallback для казахских букв, Qadam tokens/brand, зелёная палитра, карточки, кнопки, формы, dashboard и мобильное меню. До переноса проверено: затронутые production-файлы не менялись между общей seller-основой b3d0328 и интеграцией 3d009dc. Пакеты, контракты и финансовые модули старой seller-ветки не переносились.

Мобильное меню закрывается после перехода, Escape и browser Back/Forward, возвращает фокус. Поиск клиентов/заявок и локальные фильтры каталога, RU/KZ, CustomerPicker сохранены. В финансовом Demo нет записи и вымышленных итогов: для долгов/истории/summary показано явное пояснение отсутствия серверных данных. До 1100 px финансовые формы располагаются в одну колонку, серверные KPI — в две; на desktop сохраняются две/четыре колонки.

Публичная витрина получает согласованную палитру и Manrope через CSS aliases `.ex`, без изменения её файлов. В `apps/web/.gitattributes` зафиксированы LF для JS/MJS/HTML: исправлена исходная Windows-проблема format:check при core.autocrlf=true.

## Что сохранено из Team MVP

Без изменений: apps/api, OpenAPI 0.4.0 и generated.ts, API/bindings/gateway, auth/runtime/providers/router/modules.ts, queries, features/voice/ledger/summary/explore/inquiry, 3D assets, package/lock. Продажа, погашение, голос/ручной ввод, подтверждение, точное тело и Idempotency-Key при повторе, beforeunload money-pending guard, серверные балансы и итоги остаются кодом интеграции. Summary находится также на экране Sale; Dashboard не получает вымышленных KPI.

Работают все интегрированные маршруты: /login; /seller; /seller/{customers,inquiries,catalog,sale,debts,history,summary}; /; /venues/:slug; /shops/:slug. Live API требует окружения капитана; Demo не заменяет живой сервер. GET/PATCH заявок и каталог через public shop уже есть в 0.4.0 — старые утверждения об отсутствии этих API больше не актуальны.

## Проверки и ограничения

Из apps/web: npm ci; npm run check:api; npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; npm run format:check. Фактические итоговые результаты фиксируются в [основном handoff](../SELLER_FRONTEND_HANDOFF.md) после завершения прогона. Чужие результаты backend/live не выдаются за собственные.

Новые настоящие screenshots запущенного приложения: [team-mvp-design](../screenshots/team-mvp-design). Seller screenshots — явно read-only Demo, публичные — явно обозначенные API test fixtures. Финансовые операции не имитировались как успешные.

Собственный live acceptance **Blocked**: на 127.0.0.1:8000 connection refused, в новой рабочей копии нет apps/api/.env, apps/web/.env.local и паролей тестовых владельцев. Публичные настройки восстановить из защищённо переданного окружения; секреты/JWT не записывать в документы/Git. Общую БД не мигрировать и не очищать. Физический Android недоступен, выполнена только Chromium browser emulation.

npm audit сообщает 3 унаследованных dev findings в Vitest/@vitest/mocker/Tinypool (1 moderate, 2 critical); audit --omit=dev — 0. Обновление тестового стека требует отдельной задачи; package/lock сохранены. Build сохраняет предупреждение о большом 3D chunk и пустом auth chunk при отсутствии публичной auth-конфигурации. Это не ошибки сборки.

## Продолжение и Git

Не делать merge в main или integration/team-mvp, не использовать force. Новый Draft PR должен иметь base integration/team-mvp, head feature/seller-design-integration, название `feat(seller): integrate merchant redesign into team MVP`. Итоговый commit/push/PR записаны в основном handoff; текущий точный HEAD — `git log -1 --format=%H`.

Следующий шаг: review нового Draft PR капитаном, затем собственная live-приёмка Supabase login, /me, разрешённые точки, customers/create/reload/logout/cache и финансовых/публичных сценариев на согласованных учебных данных. Физический Android и настоящий микрофон проверить отдельно. QA-ветку и PR второго Codex не объединять автоматически.

Полный состав файлов, команды и статус: [SELLER_FRONTEND_HANDOFF](../SELLER_FRONTEND_HANDOFF.md). Визуальные решения: [SELLER_DESIGN_NOTES](../SELLER_DESIGN_NOTES.md). История старых seller-этапов сохранена в Git (b3d0328 / a77f1a0), текущая база — Team MVP.

## Проверено в новой design integration ветке

Финальный прогон: npm ci, check:api, typecheck, lint, build, format:check — passed; **84 unit/component (8 файлов), 14 Chromium E2E**. Ширины360/390/768/1440, 20 новых PNG. История тестового WebGL stub/Windows LF исправлена без изменения production API/финансовых функций. Финальные Git refs/PR и подробные ограничения — в основном handoff. Это новые собственные результаты; live-результаты капитана не включены в эти числа.

## Опубликовано

Проверенный code commit **3faa4b23e6c973836ba1099e7695546ec427eb65**, push успешен и local/remote hash совпал; fetch/pull --ff-only своей ветки — Already up to date. Base повторно проверен:3d009dc86c93debcab05dedda530b7d1fe62a304. Новый **open Draft PR #11**: https://github.com/foxfordkz-cyber/qadamx-taraz/pull/11, base integration/team-mvp. Эта запись отдельным docs commit дополняет проверенный код; актуальный итоговый HEAD — git log -1 --format=%H. Новому Codex продолжать только feature/seller-design-integration. Merge не выполнялся.
