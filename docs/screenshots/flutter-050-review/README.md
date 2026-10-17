# Flutter 0.5.0 и сайт — галерея к review

Галерея к отчёту [FLUTTER_050_VISUAL_REVIEW](../../FLUTTER_050_VISUAL_REVIEW.md). 2026-10-17, роль №6.

- `apk/` — APK `qadam-0.5.0-7b3a8ba-internal.apk` (SHA256 `14f3f145…3eccf`) на Android Emulator Pixel 6, Android 16, ≈411 dp. Публичный production API только на чтение, без входа. Кадры уменьшены в 2 раза. **Это эмулятор, не физическая приёмка.**
- `render/` — копии рендеров автора из `apps/mobile/docs/reports/visual-050` @ `7b3a8ba`: `flutter test`, синтетические данные, на каждом кадре подпись «синтетические данные».
- `site/` — production `qadamx-taraz.vercel.app`, Chrome 390×740 (KZ 360×780). Только GET; кабинет в режиме «Посмотреть демо».

## Пары для сравнения

| Экран | Приложение | Сайт |
|---|---|---|
| Площадки | [apk/01-venues](apk/01-venues.webp), [apk/02-venues-scrolled](apk/02-venues-scrolled.webp), [render/venues-ru-390-x1.0](render/venues-ru-390-x1.0.webp) | [site-home-ru-390](site/site-home-ru-390.webp), [site-home-venues-ru-390](site/site-home-venues-ru-390.webp) |
| Площадка, 3D | [apk/03-venue-kaikarmet](apk/03-venue-kaikarmet.webp), [render/venue-ru-390-x1.0](render/venue-ru-390-x1.0.webp) (fallback-картинка) | [site-venue-kaikarmet-ru-390](site/site-venue-kaikarmet-ru-390.webp) |
| Список магазинов | [apk/04-venue-list](apk/04-venue-list.webp) | [site-venue-kaikarmet-list-ru-390](site/site-venue-kaikarmet-list-ru-390.webp) |
| Магазин | [apk/05-shop](apk/05-shop.webp), [render/shop-ru-390-x1.0](render/shop-ru-390-x1.0.webp) | [site-shop-ru-390](site/site-shop-ru-390.webp) |
| Заявка | [apk/06-shop-inquiry](apk/06-shop-inquiry.webp), [render/inquiry-ru-390-x1.0](render/inquiry-ru-390-x1.0.webp) | [site-inquiry-ru-390](site/site-inquiry-ru-390.webp) |
| Магазин KZ | [apk/07-shop-kk](apk/07-shop-kk.webp), [render/shop-kk-320-x2.0-long](render/shop-kk-320-x2.0-long.webp) | [site-shop-kk-360](site/site-shop-kk-360.webp) |
| Главная продавца | [render/dashboard-ru-390-x1.0](render/dashboard-ru-390-x1.0.webp), [render/dashboard-kk-320-x2.0-long](render/dashboard-kk-320-x2.0-long.webp), [apk/10-business-kk](apk/10-business-kk.webp) (без входа) | [site-dashboard-ru-390](site/site-dashboard-ru-390.webp), [site-dashboard-2-ru-390](site/site-dashboard-2-ru-390.webp) |
| Аналитика | [render/analytics-ru-390-x1.0](render/analytics-ru-390-x1.0.webp), [render/analytics-ru-390-x1.0-daily](render/analytics-ru-390-x1.0-daily.webp) | [site-analytics-ru-390](site/site-analytics-ru-390.webp), [site-analytics-2-ru-390](site/site-analytics-2-ru-390.webp) |
| Продажа | [render/sale-ru-390-x1.0](render/sale-ru-390-x1.0.webp) | — |
| Ошибка загрузки | [render/venues-ru-360-x1.3-error](render/venues-ru-360-x1.3-error.webp) | — |
| Мал базар | [apk/09-mal-bazar-kk](apk/09-mal-bazar-kk.webp), [render/market-ru-390-x1.0](render/market-ru-390-x1.0.webp) | — |
| Площадки KZ | [apk/08-venues-kk](apk/08-venues-kk.webp) | — |

На [render/market-ru-390-x1.0](render/market-ru-390-x1.0.webp) у FAB толстая чёрная обводка. Это подсветка фокуса в тестовом окружении: на эмуляторе её нет ([apk/09-mal-bazar-kk](apk/09-mal-bazar-kk.webp)), поэтому замечанием она не считается.
