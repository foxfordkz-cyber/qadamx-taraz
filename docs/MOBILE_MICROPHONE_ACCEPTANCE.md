# Mobile Microphone Acceptance Preparation

2026-10-16. Задача — подготовить проверяемые регрессии и приёмку существующего голосового ввода. **Физический Android: Blocked.** Production voice/ledger/AI, Backend, OpenAPI и финансовая логика не изменяются; PR #19 остаётся отдельно.

## База и проверка Git

Выполнены `git fetch origin --prune`, проверка чистого рабочего дерева, remote HEAD и связанных Draft PR. Отдельная ветка `test/mobile-microphone-acceptance`, worktree `work/qadam-microphone-acceptance`, от `origin/integration/local-combined-check:58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76`.

| Remote branch | HEAD при начале задачи | Связанный PR / base |
|---|---|---|
| main | `8c932dd49b8defa8456fd3b7015ed7828ddae3b7` | main не меняется |
| integration/team-mvp | `3d009dc86c93debcab05dedda530b7d1fe62a304` | #8 → main |
| integration/local-combined-check | `58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76` | #13 → backend/livestock |
| feature/seller-design-integration | `c9e099e2ce2b0d5c25552542f72b9b369f5d7b5b` | #11 → integration/team-mvp |
| feature/seller-analytics | `ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1` | #16 → integration/local-combined-check |
| fix/seller-auth-unicode | `28960f21e13c9c38077bf68b7bb5449eb9aa824d` | #14 → integration/team-mvp |
| fix/customer-post-unknown-result | `99ed2c03c8c4d75987ad5e41119055c2bb5142c6` | #19 → integration/local-combined-check |
| integration/livestock-https | `ca51bbf9bcf1a5e5379b7b8ced147e4114e01434` | #17 → integration/local-combined-check |
| integration/seller-analytics-061 | `5ab11b146778698f54164057974fc81c397192dc` | #18 → integration/livestock-https |

Связанные PR #11/#13/#14/#16/#17/#18/#19 — open Draft при проверке. Source `features/voice`, `features/ledger`, `features/summary` не отличается между базой и #17/#18; новую цепочку API/Analytics автоматически не объединяли. Прочитаны AGENTS, TEAM_INTEGRATION, seller/ledger handoff, задания seller/ledger и AI_INTEGRATION. Параллельные проверки используют отдельные detached worktree.

## Владение и согласование

Участник №4 (`ledger-web`) владеет voice/ledger/summary. Исходный [PR #7](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/7) опубликован `sarsenbaevaaidana07`. В [Draft PR #20](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/20) размещён конкретный запрос согласования и через GitHub запрошен review этого владельца. **Явное согласование production-изменений пока не получено.** Здесь добавляются тесты вне его модуля и отчёт; его source и handoff не редактируются.

Предлагаемый владельцу отдельный scope: `AudioInput.tsx`, минимальная связь capture-state в `Sale.tsx`, ledger RU/KZ и тесты. Нужны поколения capture, logical cancel pending permission, доступная Stop, cleanup при disabled/route/account, проверка пустого/слишком большого clip, обработка recorder/track errors, preview/clear с revokeObjectURL, countdown и краткое AI-пояснение. Не менять денежные data/write методы или AI-протокол. До подтверждения этот scope не применяется.

## Контракт и текущая реализация

Источники: [AudioInput](../apps/web/src/features/voice/AudioInput.tsx), [Sale](../apps/web/src/features/voice/Sale.tsx), [AI protocol](../packages/contracts/AI_INTEGRATION.md), [требования участника №4](team5/06_TEAM_LEDGER_FRONTEND.md).

- MIME priority: `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg;codecs=opus`, проверка `isTypeSupported`.
- Начало только по нажатию; `getUserMedia({audio:true})`. Синхронный lock защищает повторный start, пока permission promise ожидается.
- Stop и 30-секундный timer останавливают recorder/tracks. Unmount снимает callback/timer и останавливает tracks; поздний grant после unmount также освобождается.
- Выбор файла ограничен 8 MiB. Backend проверяет содержимое/MIME и длительность до 30 секунд. Multipart содержит ровно text либо audio и locale; boundary выставляет браузер.
- Запись/выбор файла сами по себе не загружают аудио. Upload — отдельное «Подготовить черновик», деньги — отдельное подтверждение. Есть text/manual fallback.

### Найденные gaps — не исправлены в этой задаче

| ID | Наблюдение / source evidence на базе 58d4eb4 | Последствие |
|---|---|---|
| MIC-01 | AudioInput 49–53 проверяет только unmount; нет pending cancel/disabled generation | Поздний grant может включить capture после перехода к fallback/disabled |
| MIC-02 | AudioInput 95 отключает и Stop; Sale 70–71 включает disabled при parsing/write | Capture может продолжаться с недоступной Stop |
| MIC-03 | AudioInput 61–69 → Sale 173–175 заменяет file и очищает text | Поздний clip может затереть более новый ввод |
| MIC-04 | AudioInput 55–73 не обрабатывает recorder error / track ended | Ошибка может оставить recording UI и передать неполный clip |
| MIC-05 | AudioInput 58–69 не проверяет recorded size; guard 90 только у file picker | Пустой или >8 MiB clip передаётся дальше, хотя Backend остаётся защитой |
| MIC-06 | AudioInput 88–91 использует общий micError | Oversize называется ошибкой микрофона; ошибка не очищается новым valid file |
| MIC-07 | AudioInput 83–102 и Sale 178: только record/stop/status/filename | Нет отдельной отмены, playback, countdown и полного pre-record AI notice из ТЗ |

Это анализ и воспроизводимые тестовые цели, а не заявление о дефекте физического Chrome. Некоторые gaps должны подтвердиться отдельными acceptance-regressions. Отсутствие исправления отмечается явно, unsafe behavior не считается успешной приёмкой.

## Среда и HTTPS

- Node `v24.21.0`, npm `11.19.0`, Windows. Зависимости устанавливаются по lock, package/lock не меняются.
- SDK adb найден вне PATH. Первая sandbox-проверка не смогла перечислить устройства; повторная разрешённая проверка завершилась: **0 authorized devices/emulators, 0 unauthorized/offline**. Device IDs не сохранялись. Физическая приёмка **Blocked: устройство отсутствует в доступной среде**.
- Read-only GET health опубликованного капитаном временного HTTPS API — **HTTP 200**; OpenAPI — **0.6.1**. Без login, audio upload, финансовых запросов или изменения БД. Это API connectivity, не Android browser acceptance.
- Достижимый HTTPS preview frontend не предоставлен/не найден в актуальных инструкциях. Loopback HTTP в тестах является локальным secure context, но не внешним HTTPS preview. Новый tunnel/deploy не создаётся.

Физическая приёмка требует одновременно устройства, доверенного HTTPS frontend origin, достижимого API/CORS и разрешённого учебного аккаунта. HTTPS API не делает HTTP LAN frontend безопасным origin для микрофона.

## План реальных regression tests

Компонентные тесты рендерят настоящий AudioInput, подменяют только browser media boundary; проверяют MIME, allow/deny/missing API, pending double-start, stop/30 секунд/unmount/late grant, file boundary и недопустимые состояния. Known gaps выделяются отдельно и не выдаются за passed acceptance.

Browser-тесты запускают настоящее приложение и Chromium MediaRecorder с синтетическим fake audio device, без человеческого голоса и реального микрофона. SDK/API boundaries локально перехватываются, внешние запросы и денежные writes запрещены. Проверяются native recording/stop/MIME/30 секунд, multipart upload, denial/file/manual fallback, RU/KZ/mobile viewport. Это desktop Chromium automation, не физический Android и не живой AI.

### Этап 2 — компонентные регрессии

Добавлены [обычные регрессии](../apps/web/src/test/microphone-acceptance.test.tsx), [browser boundary doubles](../apps/web/src/test/microphone-fixtures.tsx) и [отдельные известные gaps](../apps/web/src/test/microphone-known-gaps.test.tsx). Из `apps/web`:

```powershell
npm test -- src/test/microphone-acceptance.test.tsx src/test/microphone-known-gaps.test.tsx --no-file-parallelism
```

Результат: **22 обычные регрессии passed и 5 явно expected failures распознаны**, exit 0. Vitest выводит 27 passed, но пять из них — `.fails`, а не исправленные требования. Отдельный strict-прогон подтверждает реальные отказы:

```powershell
$env:QADAM_MIC_STRICT_KNOWN_GAPS = '1'
npm test -- src/test/microphone-known-gaps.test.tsx --no-file-parallelism
Remove-Item Env:QADAM_MIC_STRICT_KNOWN_GAPS
```

**Exit 1, ровно 5 assertion failures:** MIC-01 late permission, MIC-02 active capture при disabled, MIC-05a oversized recorded clip, MIC-05b empty clip, MIC-04 recorder error cleanup. Setup не падал. Это воспроизводимые неисправленные дефекты, не passed acceptance. При исправлении `.fails` нужно удалить; неожиданное прохождение сейчас само ломает этот diagnostic guard. Prettier новых файлов — PASS. Browser и полный web прогон ещё ожидаются.

## Физическая Android acceptance matrix

Все строки пока **Blocked**. Заполнять фактами, не переносить сюда успех mock/browser тестов.

| Проверка | Требуемое подтверждение |
|---|---|
| Устройство / OS / Chrome / origin | Версии без device IDs, `isSecureContext=true`, HTTPS frontend/API/CORS |
| Permissions | Allow, deny, повторное разрешение, pending prompt и cancel |
| MIME / recorder | Фактические MIME/file size, успешный start, runtime error fallback |
| Capture | Stop, cancel, 30 секунд, фон/экран/звонок, route/account cleanup |
| Playback | Локально прослушать разрешённый synthetic/consented clip; текущий UI gap |
| Upload | Явное действие, корректный multipart, supported file, oversize/invalid и API error |
| Fallback | Текст и ручной ввод после deny/unavailable/error без потери нового ввода |
| Mobile UX | RU/KZ, touch/keyboard, portrait/landscape, navigation |

Реальные записи — только с согласия говорящего; не публиковать аудио, JWT, storage state, HAR/trace/video с личными данными. Используемые в automation аудиоданные синтетические и не уходят в живой API. Серверные/AI результаты капитана отделяются от наших.

## Основания browser-проверок

Permission promise может оставаться pending; cancel должен логически инвалидировать попытку, а не обещать закрытие browser prompt: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). MIME support не гарантирует успешной записи: [isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static). Error может сопровождаться final data/stop: [recorder error](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/error_event). Background/Android screen lock может задержать chunks; timer не доказывает жёсткий предел длительности на устройстве: [dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event). Backend duration validation сохраняется.

## Продолжение и ограничения

Подтверждение участника №4 необходимо до любых production-изменений его voice-модуля. После tests/report review — отдельное решение по исправлениям; физическая acceptance только при наличии устройства и HTTPS preview. Customer POST продолжает Backend-first в отдельном PR #19. Не менять main/чужие ветки, не merge/rebase/force; при FF-only divergence остановиться и сообщить.
