# Pages: выпуск 2ba2c09, 18 октября 2026

## Итог после deployment

Капитан выполнил одну ручную загрузку и сообщил Success в09:55 GMT+5:
`f89a486c-72e6-4188-bea8-9db5d8e15813`,
https://f89a486c.qadamx-taraz.pages.dev. На основном домене
https://qadamx-taraz.pages.dev независимо проверен source
`2ba2c09ea2e5d154c8f9b305614d9da33c462b83` по совпадению index.html и всех трёх
JS-ассетов с локальным dist. Сам ID/Success получен из панели капитана;
management-доступ CLI отсутствует. Environment variables=0 нормально для Direct Upload:
публичные build-настройки уже встроены, серверных ключей в сборке нет.

### Шаг 5 — Node, основной домен

Из корня проверочной копии выполнен `node scripts/verify-pages.mjs` — exit0,
все9 результатов `ok=true`, status200:

| Маршрут/ассет | Результат |
| --- | --- |
| /, /login, /register, /auth/callback, /seller, /seller/analytics | 6 × 200/ok, без редиректов |
| index-Bnzy6twA.js, auth-CB7MGzWB.js, index-DOcOg911.css | 3 × 200/ok |

Отдельный Node-fetch скачал index.html и все assets/*.js, включая ленивый
VenueScene-CGUKWdmZ.js. Все SHA256 совпали с dist. В JS найдены
mobile-v0.5.2-review68.1 и «Спросите Qadam»; mobile-v0.3.0 отсутствует.
Полные результаты: [verify-pages](reports/pages-assistant-20261018/verify-pages.json),
[JS/hash checks](reports/pages-assistant-20261018/remote.json).

### Шаг 6 — настоящий браузер, опубликованный сайт

- Главная RU/KZ открылась; Android-ссылка указывает на релиз0.5.2.
- Площадка Кайкармет загрузилась, hotspot2 открыл Демо Кайкармет food;
  заголовок, каталог и получатель формы соответствуют магазину. Заявка не отправлялась.
- Сохранённая обычная учебная сессия открыла новую главную; затем выполнен выход
  и явный `/login` → «Посмотреть демо».
- «Скажите о продаже» и «Спросите Qadam» видны. В Demo открыта панель, выбран
  фиксированный пример; показаны «Пример ответа в демо, без AI» и учебный ответ.
  В опубликованном source ветка auth.demo вызывает локальный assistantDemo,
  минуя api.request. Контрольный вопрос настоящему AI не отправлялся.
- Console error:0 на проверенном маршруте. Ошибка локатора при уже завершившемся
  переходе hotspot была проверена через URL/DOM: магазин открылся корректно.

Шаги3/4/5 прошли; откат не выполнялся. Возврат при необходимости — Pages deployment
`0a3a135b-7af1-4bbf-8d2d-92cf873b3f99`, затем / и /login200. Render/API0.7.0,
Environment, Supabase и миграции не менялись. Ни денежных, ни платных AI-вызовов нет.

Не проверено этим выпуском: реальный ответ помощника (контроль капитана), физический
микрофон/Safari/Android, установка APK и повторная полноценная Auth/денежная приёмка.
Ниже сохранена подготовка до upload; её pending-статус теперь исторический.

Source: `2ba2c09ea2e5d154c8f9b305614d9da33c462b83`, точное совпадение с origin/main
после fetch. Оба deploy ref продвинуты fast-forward с b0f0ea0 на этот SHA без force.
Работа выполнена в отдельной `release/pages-assistant-20261018`.
Render/API 0.7.0, Supabase, Environment и миграции не изменялись.
Заявление ASSISTANT_ENABLED=true принято от капитана; скрытые настройки Render
в рамках web-выпуска не читались и не менялись. Контрольный вопрос AI не задавался.

## Точка отката и доступ

Ожидаемый production ID по заданию капитана:
`0a3a135b-7af1-4bbf-8d2d-92cf873b3f99` (сборка34250ed).
Основной домен и https://0a3a135b.qadamx-taraz.pages.dev отдают побайтово одинаковый
index.html, / и /login — 200, без редиректа. Точный current production ID через
management API независимо не подтверждён: CLI авторизован в другом аккаунте,
ошибка аутентификации10000. Загрузка CLI не предпринималась; существующий сайт сохранён.

## Сборка и Node-проверки (шаг 3)

`npm ci`, затем `npm run build:hosted` — PASS. Публичные API/Supabase настройки
взяты из прежнего локального источника без вывода значений ключей; ids=true,
VITE_ASSISTANT_ENABLED=true. Серверные переменные в frontend не передавались.

- 23 локальных файла: 22 статических asset и служебный `_headers` для Pages.
- Нет .map/.env; проверка известных серверных секретов — PASS.
- В объединённом содержимом dist/assets/*.js есть mobile-v0.5.2-review68.1 и «Спросите Qadam»;
  mobile-v0.3.0 отсутствует. Проверки выполнены Node, не grep/bash.
- `index-Bnzy6twA.js`, `auth-CB7MGzWB.js`, `VenueScene-CGUKWdmZ.js`, `index-DOcOg911.css`.
- ZIP `tmp/qadam-pages-2ba2c09-assistant.zip`: 1 483 749 байт;
  SHA256 `bb793312321453cdee9954973b4825a7d2f6503dd430db2d86d429695c93b936`.
  Файлы после распаковки совпадают с исходным dist по SHA256.

npm ci сообщил 3 audit findings (1 moderate, 2 critical); зависимости и lock
не обновлялись в этом выпуске. Сохранилось предупреждение Vite о chunk >500 kB.

## Статус публикации

Пока ожидается одна ручная загрузка капитаном в существующий Production-проект.
Новый deployment ID отсутствует. Предварительный verify-pages на старом сайте:
6 маршрутов и 3 entry-assets — ok/200; это НЕ проверка нового deployment.

После Success: из корня сборочной копии `node scripts/verify-pages.mjs`, Node-fetch
index.html и всех трёх assets/*.js, те же string checks и сравнение SHA256 с dist;
браузер: главная → площадка → магазин, Android0.5.2, login → Demo → новая главная
и пример помощника без AI. При сбое шагов3/4/5 — вернуть указанный deployment,
проверить / и /login, остановиться без повторной публикации.
