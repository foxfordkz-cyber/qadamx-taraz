# Pages: кандидат 2ba2c09, 18 октября 2026

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
