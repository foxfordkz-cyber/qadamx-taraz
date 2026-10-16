# Qadam Seller — единый стиль витрины и кабинета

Обновлено 2026-10-16. UX-референс: [официальный Polaris](https://shopify.dev/docs/api/polaris), [accessibility/layout guidance](https://shopify.dev/docs/api/polaris/using-polaris-web-components#accessibility). Применены иерархия действий, плотные списки, понятные формы/состояния и keyboard navigation. Собственные React-компоненты и Supabase сохранены; Shopify API/Auth/App Bridge и сторонний UI framework не добавлялись.

## Источник визуального стиля Qadam

Реальная публичная витрина найдена в `feature/public-storefront`, точный commit **8818e8b73ecc2e2dd2f517f18796782b10d1872f**. Источники: [explore.css](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/8818e8b73ecc2e2dd2f517f18796782b10d1872f/apps/web/src/features/explore/explore.css), [ExplorePage.tsx](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/8818e8b73ecc2e2dd2f517f18796782b10d1872f/apps/web/src/features/explore/ExplorePage.tsx), [font setup](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/8818e8b73ecc2e2dd2f517f18796782b10d1872f/apps/web/index.html). Ветка изучена read-only, её код/CSS не объединялся и не изменялся.

Новый запрос согласует seller с этой актуальной темой, поэтому предыдущая красно-зелёная тема этапа B заменена общими зелёными/lime токенами. `shared/tokens.css` — канонический слой; прежние --bg/--text/--primary/--secondary/--border aliases сохранены для соседних модулей.

| Токен | Значение | Использование |
|---|---|---|
| paper | #F5F3EB | Фон кабинета |
| ink | #172A26 | Основной текст |
| green / green-deep | #164C3E / #103B31 | Навигация, hero, действия |
| lime | #D7F36A | Главный CTA, знак Qadam |
| orange | #F0A94B | Декоративные акценты |
| white / line | #FFFEFA / #E1E2D8 | Карточки, разделители |
| semantic muted | #58685F | Читаемый вспомогательный текст |

Manrope и ступенчатый знак qadam соответствуют витрине. Исходный muted #64736C даёт около 4.49:1 на paper; semantic muted намеренно затемнён. Сетка отступов 4/8/12/16/24/32/48, control radius 12, card radius 20, hero 28, pills 999. Плотность адаптирована для кабинета, исходный CSS витрины не импортируется целиком из-за глобальных class selectors.

## Изменения интерфейса

- Dashboard: зелёный hero с lime CTA, контекст выбранной разрешённой точки, четыре рабочих действия, дополнительные разделы и блок клиентов; без выдуманных KPI.
- Клиенты: семантический список, desktop колонки/mobile карточки, поиск с иконкой, note/полный UUID для одноимённых клиентов, server balance без расчётов. CustomerPicker, форма и exports сохранены.
- Заявки: спокойная иерархия status/time/message, локальные search/filter и загруженные страницы сохранены; реального HTTP API нет, изменение статуса в live не активируется.
- Каталог: локальный поиск и наличие по загруженным items, счётчик, no-results/reset, сохранение фильтров при смене языка. Никаких новых API params, картинок якобы с сервера или кнопок сохранения.
- Mobile: компактнее шапка и Demo notice, убраны дублирующие разделы над содержимым. В нижней панели четыре ссылки и «Ещё»; диалог открывает все прежние маршруты. Escape/focus restore, активный раздел и действия минимум 44×44.
- RU/KZ, защищённые маршруты, Supabase identity/cache boundaries и contracts не менялись. Данные всех screenshots — явно read-only Demo.

## Проверки доступности и визуальный QA

Выбранные текстовые пары: green/lime 7.91, ink/paper 13.54, white/green 9.74, muted/paper 5.31, Demo notice 5.70, декоративная стрелка 5.60. Hero имеет lime focus outline; main использует scroll-margin для sticky topbar. Это проверка выбранных состояний, не полный WCAG-аудит.

Четыре обязательные ширины 360/390/768/1440, RU/KZ, диалоги, CustomerPicker, меню, отсутствие overflow проверяются в Playwright. Существующие auth/API тесты сохранены, добавлены сценарии локальной фильтрации и меню без дополнительных gateway calls. Команды и окончательные результаты — [handoff](SELLER_FRONTEND_HANDOFF.md).

Скриншоты создаёт `apps/web/e2e/screenshots.spec.ts` из реального браузера, с локальными шрифтами, отключёнными анимациями и указателем вне навигации. Основной набор: Dashboard, Customers, Inquiries, Catalog — desktop 1440 и mobile 390; дополнительно Dashboard 768 и Catalog KZ 360. Скриншоты не подтверждают живые Supabase/DB/CORS запросы.


## Галерея текущего дизайна (Demo)

| Экран | Desktop | Mobile |
|---|---|---|
| Dashboard | [1440](screenshots/dashboard-desktop.png) | [390](screenshots/dashboard-mobile.png) |
| Customers | [1440](screenshots/customers-desktop.png) | [390](screenshots/customers-mobile.png) |
| Inquiries | [1440](screenshots/inquiries-desktop.png) | [390](screenshots/inquiries-mobile.png) |
| Catalog | [1440](screenshots/catalog-desktop.png) | [390](screenshots/catalog-mobile.png) |

Дополнительно: [Dashboard 768](screenshots/dashboard-tablet.png), [Catalog KZ 360](screenshots/catalog-mobile-kk.png). Desktop снят при viewport1440×1000 с full-page; mobile — реальные viewport390×844 и360×844. Финальные проверки:74 unit/component,9 Chromium E2E, TypeScript/lint/build/check:api/format:check passed.

Шрифты и лицензии: [public/fonts/README](../apps/web/public/fonts/README.md). У Manrope нет части Kazakh glyphs; неизменённые официальные Noto subsets с ограниченными unicode-range закрывают этот пробел. Browser-тест проверяет загрузку всех трёх faces для латиницы/ӘҒҚҢҰ. Font files self-hosted, без runtime внешнего font request.
