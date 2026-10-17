# Передача работы публичной витрины

Роль: public-web. Обновлено: 2026-10-17. Ветка: `feature/public-inquiry-form`; базовая ветка `integration/seller-analytics-061` на SHA `13248851fd2b2a502aff211a506f71e85c2b0ab1`. База совпадает с актуальной сводкой и remote; integration-agent в сессиях недоступен, прямого подтверждения агента не было. Текущий commit и проверки — в истории ветки.

## Сделано

- Страница `/shops/:slug` показывает название, категорию, описание и доступные от API название/подпись площадки. Обратный переход использует `venue_slug` из найденной по `venue_id` площадки; для некорректной/неизвестной связи ссылка ведёт на главную, не придумывая адрес.
- Основное действие ведёт к форме заявки конкретного магазина. Его API `businessId` и название передаются из загруженного `ShopResponse`.
- Каталог оформлен карточками с именем, ценой в KZT, статусом `available`, отдельной пометкой каждого учебного товара и доступным пустым состоянием.
- Фото магазина и товаров в публичном контракте отсутствуют: показываются явно подписанные нейтральные placeholders, не выданные за реальные фотографии. Статические товары/демо fallback не добавлялись.
- Учебные магазины помечены только по `is_demo`; учебные товары помечаются отдельно по `is_demo`. Сбой Live API отображает ошибку и retry, не включает Demo.
- Витрина и форма локализованы на RU/KZ; адаптивная карточная сетка проверена на 360/390/768/1440 px. Успех формы отображается лишь после квитанции API. Повтор после потерянного/неопределённого ответа использует прежний payload и `client_request_id`.
- Проверена согласованность всех девяти hotspot UUID/slug с API demo seed; несовпадающий ID не может перенаправить на другую точку. В браузерном тесте все девять точек открываются по карточке, reload сохраняет маршрут, POST использует ID именно загруженного магазина.

## Файлы и контракт

- `apps/web/src/features/explore/ShopPage.tsx`, `explore.css`, `i18n.ts`
- `apps/web/src/features/explore/api.ts`, `types.ts`, `hotspots.ts`, `VenueScene.tsx`
- `apps/web/src/features/inquiry/InquiryForm.tsx`
- `apps/web/src/test/hotspots.test.ts`, `apps/web/src/test/inquiry.test.tsx`
- `apps/web/e2e/public-design.spec.ts`
- `docs/screenshots/team-mvp-design/public-shop-api-stub-desktop.png`
- `docs/screenshots/team-mvp-design/public-shop-api-stub-mobile.png`

Используется существующий публичный контракт: `GET /businesses/{slug}`, `GET /venues`, `POST /businesses/{id}/inquiries`. Квитанция не содержит контакт покупателя. Уникальный `client_request_id` и повтор квитанции уже реализованы backend; товарное поле и поля фото магазина/каталога отсутствуют. Изменения backend/OpenAPI не нужны для нынешней компоновки; настоящие изображения потребуют отдельного согласованного контрактного расширения.

## Проверки

Из `apps/web`:

- `npm test -- src\test\hotspots.test.ts src\test\inquiry.test.tsx` — **PASS**, 6 unit-тестов.
- `npx playwright test public-design.spec.ts --config=playwright.config.ts` — **PASS**, 3 браузерных теста; все API-запросы перехватывались локальными синтетическими fixtures, POST не доходил до backend.
- `npm run build` — **PASS**; сохраняется предупреждение Vite о крупном чанке `OrbitControls` (>500 kB).
- `npm run typecheck` — **PASS**.
- Точечный `npx eslint ... --max-warnings 0` для изменённых TS/TSX/E2E-файлов — **PASS**.
- `npx prettier --check ...` для изменённых исходников и тестов — **PASS**.
- `git diff --check` — **PASS**.

## Ограничения и следующий шаг

- Прямой живой запрос, реальный inbox, production/live API, а также получение заявки продавцом A и отказ продавцу B не проверялись: не создавали лишние учебные заявки. Backend изолирующий сценарий уже описан в `apps/api/tests/test_public.py::test_inquiry_replay_scope_summary_and_status`, но для него нужна отдельная пустая PostgreSQL `*_test`; этот тест здесь не запускался.
- Playwright проверил WebGL fallback, каталожные карточки и hotspot-to-seed binding; реальное нажатие WebGL-кнопок на GPU-девайсе и физический телефон не проверялись.
- Скриншоты — только API-stub/demo fixture, не живой магазин или реальные товары.
- В GitHub обнаружен PR #48 для текущего SHA `3fb16ce5f65f9c3c26b7556d56defed3e056b0ca`, но он направлен в `main`, не Draft, а описание оставлено с placeholder-текстом шаблона. Это не соответствует задаче; не сливать. Проверено, что feature содержит три коммита поверх `integration/seller-analytics-061` (`13248851fd2b2a502aff211a506f71e85c2b0ab1`), без коммитов из более новой `main`. Для смены base на integration, перевода PR в Draft и заполнения шаблона требуется авторизованная GitHub-сессия; доступные GitHub-инструменты только читают PR.
- Vercel preview из комментария PR требует SSO и недоступен в открытой браузерной сессии. Скриншоты в репозитории — доступный локальный API-stub показ.
- Следующий шаг: авторизоваться в GitHub, исправить PR #48 (base `integration/seller-analytics-061`, Draft, описание по шаблону); затем выполнить согласованный изолированный API smoke до inbox и проверить запрет чтения заявки вторым owner.
