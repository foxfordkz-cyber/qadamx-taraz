# Flutter 0.5.1 → 0.5.2 (`79a29b9`) — до и после

Галерея к [FLUTTER_052_RECHECK](../../FLUTTER_052_RECHECK.md).

- **После, APK** — `after-apk-052/`: `qadam-0.5.2-79a29b9-internal.apk` (SHA256 `3ff67b9b…a334d6`) на Android Emulator Pixel 6, Android 16, production API только на чтение, без входа. Кадры уменьшены в 2 раза. Файлы 09–12 сняты при `font_scale 2.0` и ≈320 dp (временная настройка эмулятора, затем возвращена), язык KZ. **Это эмулятор, не физическая приёмка.**
- **После, рендеры** — `after-render-79a29b9/`: рендеры автора `apps/mobile/docs/reports/visual-052` @ `8fb9be2` (`flutter test`, синтетические данные), в webp.
- **До** — `../flutter-051-recheck/after-apk-051` (APK 0.5.1) и `../flutter-050-review`.

| Экран | До: APK 0.5.1 | После: APK 0.5.2 | После: рендер | P2 |
|---|---|---|---|---|
| Главная | [01-home](../flutter-051-recheck/after-apk-051/01-home.webp) | [01-home](after-apk-052/01-home.webp) | — | №2 исправлено; N1, N5 |
| Площадки | [02-venues](../flutter-051-recheck/after-apk-051/02-venues.webp) | [02-venues](after-apk-052/02-venues.webp) | [venues-error](after-render-79a29b9/venues-ru-360-x1.3-error.webp) | №2 исправлено; №8 в рендере; N1 |
| Площадка, 3D | [03-venue-kaikarmet](../flutter-051-recheck/after-apk-051/03-venue-kaikarmet.webp) | [03-venue-kaikarmet](after-apk-052/03-venue-kaikarmet.webp) | [venue-ru-390](after-render-79a29b9/venue-ru-390-x1.0.webp) | №4 исправлено |
| Список магазинов | [04-venue-list](../flutter-051-recheck/after-apk-051/04-venue-list.webp) (3, 2, 1) | [04-venue-list](after-apk-052/04-venue-list.webp) (1, 2, 3) | — | №3 исправлено |
| Магазин | [05-shop](../flutter-051-recheck/after-apk-051/05-shop.webp) | [05-shop](after-apk-052/05-shop.webp) | — | №2, кнопки исправлены |
| Заявка | [06-shop-inquiry](../flutter-051-recheck/after-apk-051/06-shop-inquiry.webp) | [06-shop-inquiry](after-apk-052/06-shop-inquiry.webp) | [inquiry-ru-390](after-render-79a29b9/inquiry-ru-390-x1.0.webp) | №7, кнопки исправлены |
| Мал базар | [render/market-ru-390](../flutter-050-review/render/market-ru-390-x1.0.webp) | [07-mal-bazar](after-apk-052/07-mal-bazar.webp) | — | «Учебное объявление» — янтарный (№2) |
| Главная KZ ×2, ≈320 dp | [10-home-kk-320-x2](../flutter-051-recheck/after-apk-051/10-home-kk-320-x2.webp) | [09-home-kk-320-x2-venues](after-apk-052/09-home-kk-320-x2-venues.webp) | [home-kk-320 ×2](after-render-79a29b9/home-kk-320-x2.0-long.webp) | №9 частично: «алаңдар / ы» (N4) |
| Площадки KZ ×2 | [09-venues-kk-320-x2](../flutter-051-recheck/after-apk-051/09-venues-kk-320-x2.webp) | [10-venues-kk-320-x2](after-apk-052/10-venues-kk-320-x2.webp) | — | без разрывов |
| Площадка KZ ×2 | — | [11-venue-kk-320-x2](after-apk-052/11-venue-kk-320-x2.webp), [12-…-list](after-apk-052/12-venue-kk-320-x2-list.webp) | — | без разрывов; «Шартты сызба, карта емес» |
| Магазин KZ ×2 (длинное имя) | [render/shop-kk-320-x2.0-long](../flutter-050-review/render/shop-kk-320-x2.0-long.webp) | — (у production короткое имя) | [shop-kk-320 ×2](after-render-79a29b9/shop-kk-320-x2.0-long.webp) | №9 исправлено в рендере |
| Кабинет KZ ×2 | [dashboard-kk (0.5.1)](../flutter-051-recheck/after-render-640d0ef/dashboard-kk-320-x2.0-long.webp) | — (нужен вход) | [dashboard-kk-320 ×2](after-render-79a29b9/dashboard-kk-320-x2.0-long.webp) | №9 исправлено в рендере |
| Кабинет | [dashboard-ru (0.5.1)](../flutter-051-recheck/after-render-640d0ef/dashboard-ru-390-x1.0.webp) | — (нужен вход) | [dashboard-ru-390](after-render-79a29b9/dashboard-ru-390-x1.0.webp) | N5 |
| Аналитика «По дням» | [analytics-daily (0.5.1)](../flutter-051-recheck/after-render-640d0ef/analytics-ru-390-x1.0-daily.webp) | — (нужен вход) | [analytics-ru-390-daily](after-render-79a29b9/analytics-ru-390-x1.0-daily.webp) | №5, №6 исправлены в рендере |
