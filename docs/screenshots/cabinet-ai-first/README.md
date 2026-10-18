# Кабинет Qadam: browser acceptance и галерея

Снимки ветки `feature/cabinet-ai-first`, 18 октября 2026 года. Точный source SHA
и итоговые команды общего выпуска фиксируются в [seller-web handoff](../../handoffs/seller-web.md).

Это **локальная проверка с синтетическими данными**, а не снимки production.
Настоящие React-компоненты, Supabase SDK и HTTP-клиент работают в Chromium;
авторизация, membership, summary, операции, имена и ответы помощника перехвачены
Playwright. Имена `QA MART` и `QA Клиент` обозначают фикстуру. Денежные записи,
платные AI-вызовы и внешние сообщения не выполнялись. В production кабинет этим
прогоном не публиковался; физический телефон и настоящий микрофон не проверялись.

Среда: Windows, Playwright Chromium Headless Shell 156.0.8078.4 (revision 1248),
один worker. Обычные снимки сняты при viewport 390×1000 и 1440×1000 CSS px.
Это кадры viewport: фиксированная нижняя навигация сохраняет настоящее положение.
Для списка долгов на телефоне добавлен отдельный кадр после прокрутки.

Итог: **10/10** browser-сценариев с включённым флагом и **1/1** с выключенным
флагом прошли. После добавления точной проверки доступности последнего долга
над нижней навигацией повторены все четыре визуальных RU/KZ-прогона: **4/4**.
Итоговые снимки просмотрены. Обнаруженные на первом прогоне проблемы Tab-цикла
и reflow KZ при 200% исправлены и перепроверены; техническая ошибка отсутствующего
Chromium была устранена установкой требуемой версии, не изменением приложения.

| Экран | RU, 390 px | KZ, 390 px | RU, 1440 px | KZ, 1440 px |
|---|---|---|---|---|
| Главная: два действия и три серверных показателя | [Снимок](dashboard-ru-390.png) | [Снимок](dashboard-kk-390.png) | [Снимок](dashboard-ru-1440.png) | [Снимок](dashboard-kk-1440.png) |
| Панель помощника до явного вопроса | [Снимок](assistant-ru-390.png) | [Снимок](assistant-kk-390.png) | [Снимок](assistant-ru-1440.png) | [Снимок](assistant-kk-1440.png) |
| Три первых долга, после прокрутки | [Снимок](debts-ru-390.png) | [Снимок](debts-kk-390.png) | На кадре главной | На кадре главной |

[KZ, 360×740 px, увеличенный текст](assistant-kk-360-text200.png): панель прокручена
к последнему действию. В тесте `html { font-size: 200% }` проверяет browser reflow;
это не доказательство системного font scale Android. Горизонтальная прокрутка
страницы и внутри панели запрещена проверкой, последнее действие должно целиком
помещаться в viewport и иметь высоту не менее 44 px.

## Воспроизведение

Из `apps/web`, с установленными зависимостями и Chromium Playwright:

```powershell
node node_modules/@playwright/test/cli.js install chromium --only-shell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='tmp/cabinet-enabled-results.json'
node node_modules/@playwright/test/cli.js test --config e2e/cabinet-ai-first.playwright.config.ts --workers=1 --reporter=list,json
$env:CABINET_ASSISTANT_ENABLED='false'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='tmp/cabinet-disabled-results.json'
node node_modules/@playwright/test/cli.js test --config e2e/cabinet-ai-first.playwright.config.ts --workers=1 --reporter=list,json
Remove-Item Env:CABINET_ASSISTANT_ENABLED
Remove-Item Env:PLAYWRIGHT_JSON_OUTPUT_NAME
```

Playwright разрешает этот относительный путь от каталога конфигурации:
JSON-отчёты находятся в `apps/web/e2e/tmp/` и не включаются в Git.

Конфигурация поднимает только локальный Vite на 127.0.0.1:4232. Внешние host
блокируются фикстурой. Значение publishable key в конфигурации синтетическое;
настоящих учётных данных нет.

Набор проверяет три суммы из summary и первые три продажи в серверном порядке;
отсутствие AI-запроса при открытии панели; явный вопрос; fullscreen на телефоне
и правую панель на desktop; Tab/Shift+Tab, Escape и возврат фокуса; переход к
готовому вводу записи без автоматического микрофона или AI; abort и отсечение
позднего ответа после закрытия, смены языка или точки; скрытие недоступного
помощника после серверного `ASSISTANT_DISABLED`; ошибку summary без нулевых
показателей; сохранение долгов при ошибке имён; выключенный build-флаг.

Проверка не заменяет живую приёмку авторизации, качества AI, голосовой записи,
финансовой операции или телефона. Отображаемые 3 000 / 1 500 / 4 500 ₸ — независимые
значения серверной фикстуры; экран не вычисляет общий долг из трёх видимых строк.
