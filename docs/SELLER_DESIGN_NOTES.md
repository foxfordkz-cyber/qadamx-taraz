# Qadam merchant redesign — этап B

Референс: [официальный Polaris](https://shopify.dev/docs/api/polaris). Из принципов взяты ясная иерархия, последовательные интервалы, предсказуемые формы и адаптивная плотность. Семантические подписи, клавиатурная навигация и фокус соответствуют подходу из [раздела Accessibility](https://shopify.dev/docs/api/polaris/using-polaris-web-components#accessibility); реализация остаётся собственной React/CSS.

Shopify API, Auth, App Bridge и Polaris React/Web Components не устанавливались. Массовой миграции и заимствованного брендинга нет. Auth по-прежнему Supabase; бизнес-логика и exports общих компонентов сохранены.

## Изменения

- `shared/merchant.css` — отдельный слой поверх существующих токенов и UI: радиусы 8/12 px, интервалы 12/16/24/32, спокойные разделители, уменьшенная высота шапки и единая плотность карточек. Палитра #F7F3EB / #172A27 / #B32918 / #D9EEDB сохранена.
- Dashboard: один основной CTA, компактная выбранная точка, четыре понятных действия и дополнительные разделы, полезный блок о клиентах. Финансовых KPI без данных нет.
- Клиенты: визуальные колонки на desktop и компактные карточки на mobile, видимые различающие заметки/UUID, серверный balance_minor, поиск с debounce, полезное действие пустого списка, общая форма и CustomerPicker. Прочерк означает отсутствие значения, а не нулевой долг.
- Заявки: поиск по загруженным имени/контакту/тексту вместе со статусным фильтром; никаких придуманных API params. Live-изменения отключены до endpoint, Demo только read-only.
- Каталог: аккуратные карточки с ценой/наличием и Demo label, условная иконка без вымышленных API-фотографий.
- Мобильные проверки: 360/390/768/1440, нижняя навигация не меньше 44×44, dialogs/focus/reduced-motion и RU/KZ сохранены. Необрезанный контент проверяется сравнением scrollWidth с viewport.

## Контраст и QA

Рассчитаны отношения относительной яркости: white/#B32918 — 6.47, #172A27/#F7F3EB — 13.58, muted #53615b/#F7F3EB — 5.88, green text/background — 7.66, red status text/background — 6.56. Это проверка выбранных текстовых пар, не заявление о полном аудите всех состояний.

71 unit/component и 8 Chromium E2E прошли. Визуально просмотрены все 6 кадров; после уточнения цветов и мобильных карточек browser-проверки повторены. Источник воспроизводимых снимков — `apps/web/e2e/screenshots.spec.ts`. Все снимки с учебными данными и явным Demo banner:

| Экран | Размер | Файл |
|---|---|---|
| Dashboard Desktop | 1440×1000 | [dashboard-desktop](screenshots/dashboard-desktop.png) |
| Dashboard Mobile | 390×844 | [dashboard-mobile](screenshots/dashboard-mobile.png) |
| Customers Desktop | 1440×1000 | [customers-desktop](screenshots/customers-desktop.png) |
| Customers Mobile | 390×844 | [customers-mobile](screenshots/customers-mobile.png) |
| Inquiries Desktop | 1440, full page | [inquiries-desktop](screenshots/inquiries-desktop.png) |
| Catalog Mobile | 390×844 | [catalog-mobile](screenshots/catalog-mobile.png) |

Живая авторизация/БД не изображаются этими screenshots: серверное окружение отсутствует, health-проверка дала ECONNREFUSED. Для live-acceptance нужны API/PostgreSQL и тестовые пароли от капитана. Это зафиксировано в основном handoff.
