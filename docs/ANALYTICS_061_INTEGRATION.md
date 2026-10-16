# Seller Analytics + API 0.6.1 — интеграционная проверка

Проверенный merge: **94e2b7aff76dc18990e0f410174e6ca99e42faf6**, ветка `integration/seller-analytics-061`. Последующие изменения этого этапа — документация. Это отдельная интеграция для review, не main и не постоянный деплой.

Опубликован **[Draft PR #18](https://github.com/foxfordkz-cyber/qadamx-taraz/pull/18)** → `integration/livestock-https` (PR #17). Первый опубликованный head с отчётом — `b5a5b29b4f0109878a85112b6b6ecfcaca07dbd2`; фиксация этой ссылки меняет только документацию.

## Состав и история

- Первый родитель: PR #17, `integration/livestock-https`, **ca51bbf9bcf1a5e5379b7b8ced147e4114e01434**. Проверенный backend-код: **4f67e2c80a4e7cf9b5df59c6c022ac8ff036a3d5**.
- Второй родитель: PR #16, `feature/seller-analytics`, **ce68f01e3fe4a6b9898fd68be8e3ef2e4c467ad1**.
- Общий предок: **58d4eb47e0d5e6d06c8d4af1e56eedbe2fd65f76**. Новая ветка создана от актуального PR #17, затем выполнен обычный merge PR #16 с сохранением истории. Heads повторно сверены перед commit.
- Единственный конфликт — добавленные разделы `docs/DECISIONS.md`; сохранены оба. Код Analytics перенесён без переписывания работы автора. Ветки и PR команды не изменялись.
- `apps/api`, весь `packages/contracts`, `apps/web/src/shared/api/generated.ts`, `docs/FLUTTER_CONNECTION.md` побайтово совпадают с PR #17. API **0.6.1**, market/market_key, minimum и аналитика сохранены. Строка `api-0.6.0` в query key Analytics обозначает неизменившийся контракт этого endpoint, не откат версии сервера.

Общая Supabase read-only подтверждена на **0005_livestock_market**. В этом этапе нет миграций, seed, очистки или записи денежных операций. Работающие API8018, web5188 и cloudflared сохранены. Публичный Flutter-конфиг и условия временного HTTPS — [FLUTTER_CONNECTION](FLUTTER_CONNECTION.md); контракт [Мал базара](../packages/contracts/LIVESTOCK_API.md) и [OpenAPI0.6.1](../packages/contracts/openapi.json) не менялись.

## Фактические проверки 2026-10-16

**Настоящий Chromium + Supabase + HTTP API:** отдельный Vite5191, локальный same-origin proxy к существующему API8018; настоящий вход через форму с учебными аккаунтами A/B. Никаких intercepted responses в этом прогоне. Проверены `/me` (A6/B3 точки), UI Analytics7/30 дней, совпадение денежных карточек с серверным snapshot, суммы daily/hourly с карточками, смена точки, reload, logout→B, отсутствие точек A у B, чужая аналитика404 и закрытый маршрут после logout. На360/390px нет горизонтального переполнения документа. В приложение не отправлено ни одного изменяющего API-запроса. Сессии/пароли/токены/финансовые screenshots не сохранялись в артефакты.

Существующее поведение оболочки сохранено: смена точки пересоздаёт страницу и сбрасывает период на7 дней; reload выбирает первую доступную точку. Первый проверочный скрипт ошибочно ожидал сохранения30 дней/точки и остановился по timeout. После исправления только скрипта весь прогон прошёл; это не исправление или скрытая регрессия приложения.

**Настоящий внешний HTTPS с ПК капитана:** повторно проверены health и OpenAPI0.6.1 по адресу из Flutter-инструкции. API и cloudflared не перезапускались. Это не новая проверка с устройства Flutter-разработчика. Browser-прогон через локальный proxy не является проверкой CORS для нового прямого origin5191: рабочий CORS5188 оставлен прежним.

**Автоматические проверки с синтетическими ответами / Demo:**

```powershell
cd apps/web
npm run check:api
npm run lint
npm run build
npm test -- --maxWorkers=1
npm run format:check
npm run test:e2e -- --config e2e/analytics.playwright.config.ts --grep-invert "capture genuine"
npm run test:e2e -- --config e2e/qa.playwright.config.ts
```

- Unit/component: **207/207**,14 файлов. Проверены в том числе валидация контракта, scope/cache, отмены, поздний401, отрицательные поступления, пустые данные, RU/KZ.
- Chromium standard+Analytics: **23/23** на4181. QA: **21/21** на4175;8 seller-сценариев пересекаются, это **36 уникальных E2E**, а не44. Retry0. Ширины360/390/768/1440, keyboard, таблицы, ошибки/retry/no Demo fallback, интегрированные маршруты и WebGL fallback проверены с fixtures.
- `check:api`, lint, TypeScript (в build), build, format и `git diff --check`: PASS. Остались прежние предупреждения о большом3D chunk и пустом auth chunk при сборке без публичного env; ошибки сборки отсутствуют. Для живого прогона публичный env задан отдельно.
- Screenshot writer аналитики исключён: сохранены7 исходных Demo PNG из PR #16, desktop7/mobile30 осмотрены в этом review. Старый общий screenshot writer запускался; только его локальные изменения прежних PNG восстановлены. Случайные новые скриншоты в commit не включены.
- Backend pytest не повторялся: весь backend идентичен проверенному PR #17;238 PASS на отдельной PostgreSQL относятся к предыдущему этапу. Новых результатов живого Gemini/денежного сценария/Storage upload/Flutter-device этот этап не заявляет.

## Воспроизведение и просмотр без остановки текущих процессов

Получите ветку в отдельную рабочую копию; не переключайте рабочую ветку коллеги. Из её `apps/web` выполните `npm ci`. Для Demo достаточно `npm run dev -- --port 5191 --strictPort` и `/login` → «Посмотреть демо» → «Аналитика».

Для живого просмотра **на ПК капитана**, когда8018 уже работает, используйте отдельный локальный Vite proxy. В новом терминале из `apps/web`:

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:5191/api/v1'
$env:VITE_SUPABASE_URL = 'https://pdjjdqgoitnkpgkbqjtp.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = '<публичный publishable key из FLUTTER_CONNECTION.md>'
node --input-type=module -e "import {createServer} from 'vite'; const s = await createServer({server:{host:'127.0.0.1',port:5191,strictPort:true,proxy:{'/api/v1':{target:'http://127.0.0.1:8018'}}}}); await s.listen(); s.printUrls();"
```

Открыть `http://127.0.0.1:5191/login`. Это только dev proxy на loopback, JWT продолжает проверяться основным API. Не добавляйте серверные ключи в VITE_ env. Завершение этого терминала останавливает только проверочный web; API8018, web5188 и туннель трогать не требуется. Автоматический прогон закрыл свой5191 после проверки;5188 продолжает показывать прежнюю запущенную версию.

На **другом компьютере** локальный8018 капитана недостижим. В команде proxy замените только `target` на origin действующего HTTPS-туннеля **без `/api/v1`** из [Flutter-инструкции](FLUTTER_CONNECTION.md). VITE_API_BASE_URL остаётся локальным5191/api/v1, proxy сохраняет путь. Этот способ для удалённого web ещё требует проверки на компьютере разработчика; не выдаётся за выполненную внешнюю browser-проверку. Учебный аккаунт получать у капитана приватно. Никаких паролей/JWT в Git или сообщениях PR.

## Передача и ограничения

Новый Draft PR направляется **в `integration/livestock-https` (PR #17)**, чтобы review показывал Analytics поверхAPI0.6.1. Ветка уже содержит ancestry PR #16; не нужно повторно переносить его код. PR #17 зависит от PR #13, далее существующая цепочка. Порядок merge/retarget согласует капитан; ни один PR автоматически не сливается и не перенаправляется.

- Backend: поддерживать выданный временный HTTPS; market/minimum и аналитика уже на API0.6.1. Новая миграция не нужна.
- Seller frontend: review интегрированного Analytics и отдельное решение по дополнительным auth-защитам PR #14; UI аналитики больше не является отсутствующим модулем.
- Mobile: использовать неизменённый [конфиг](FLUTTER_CONNECTION.md), закончить market/minimum UI и живую приёмку на своём устройстве. Туннель требует работающего ПК/API/cloudflared и может сменить адрес при перезапуске.
- QA-G01 (нет собственного deadline у customer POST), физический телефон/аудио/performance и постоянный hosting остаются отдельными задачами. Нельзя автоматически повторять customer POST с неизвестным результатом. Платные услуги и постоянный deploy не запускались.
