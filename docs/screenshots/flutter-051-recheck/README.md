# Flutter 0.5.0 → 0.5.1 (PR #60 @ `640d0ef`) — до и после

Галерея к [FLUTTER_050_RECHECK](../../FLUTTER_050_RECHECK.md).

- **До** — снимки первого review: `../flutter-050-review/apk` (APK 0.5.0 на эмуляторе) и `../flutter-050-review/render` (рендеры `visual-050`).
- **После, APK** — `after-apk-051/`: `qadam-0.5.1-640d0ef-internal.apk` (SHA256 `bce1d35b…eb29f`) на Android Emulator Pixel 6, Android 16, production API только на чтение, без входа. Кадры уменьшены в 2 раза. Файлы 08b–11 сняты при `font_scale 2.0` и ≈320 dp (временная настройка эмулятора, затем возвращена), язык KZ. **Это эмулятор, не физическая приёмка.**
- **После, рендеры** — `after-render-640d0ef/`: рендеры автора `apps/mobile/docs/reports/visual-051` @ `640d0ef` (`flutter test`, синтетические данные), в webp.

| Экран | До (0.5.0) | После: APK 0.5.1 | После: рендер | Что видно |
|---|---|---|---|---|
| Главная | [apk/01-venues](../flutter-050-review/apk/01-venues.webp) | [01-home](after-apk-051/01-home.webp) | [home-ru-390](after-render-640d0ef/home-ru-390-x1.0.webp) | Зелёный блок, lime «Найти магазин»; подписи карточек без «адрес не подтверждён» (N1) |
| Площадки | [apk/02-venues-scrolled](../flutter-050-review/apk/02-venues-scrolled.webp) | [02-venues](after-apk-051/02-venues.webp) | [venues-ru-390](after-render-640d0ef/venues-ru-390-x1.0.webp) | Компактные карточки, Мал базар — четвёртая; сноска «Схемы площадок условные» внизу (N1) |
| Площадка, 3D | [apk/03-venue-kaikarmet](../flutter-050-review/apk/03-venue-kaikarmet.webp) | [03-venue-kaikarmet](after-apk-051/03-venue-kaikarmet.webp) | [venue-ru-390](after-render-640d0ef/venue-ru-390-x1.0.webp) | Без изменений: нет рамки и пометки у сцены (№4) |
| Список магазинов | [apk/04-venue-list](../flutter-050-review/apk/04-venue-list.webp) | [04-venue-list](after-apk-051/04-venue-list.webp) | — | Без изменений: 3, 2, 1 (№3) |
| Магазин | [apk/05-shop](../flutter-050-review/apk/05-shop.webp) | [05-shop](after-apk-051/05-shop.webp) | [shop-ru-390](after-render-640d0ef/shop-ru-390-x1.0.webp) | Без изменений: тёмно-зелёная «Оставить заявку», нейтральная «Учебная точка» (№2, кнопки) |
| Заявка | [apk/06-shop-inquiry](../flutter-050-review/apk/06-shop-inquiry.webp) | [06-shop-inquiry](after-apk-051/06-shop-inquiry.webp) | [inquiry-ru-390](after-render-640d0ef/inquiry-ru-390-x1.0.webp) | Без изменений: шапка без отступов, нет `*` (№7) |
| Магазин KZ ×2, ≈320 dp | [render/shop-kk-320-x2.0-long](../flutter-050-review/render/shop-kk-320-x2.0-long.webp) | [08b-shop-kk-320-x2-top](after-apk-051/08b-shop-kk-320-x2-top.webp) | [shop-kk-320 ×2](after-render-640d0ef/shop-kk-320-x2.0-long.webp) | APK: разрыва нет при коротком production-названии; рендер с длинным названием: «Кайкармет / тің» (№9) |
| Площадки KZ ×2 | — | [09-venues-kk-320-x2](after-apk-051/09-venues-kk-320-x2.webp) | [venues-kk-320 ×2](after-render-640d0ef/venues-kk-320-x2.0-long.webp) | Без разрывов |
| Главная KZ ×2 | — | [10-home-kk-320-x2](after-apk-051/10-home-kk-320-x2.webp) | [home-kk-320 ×2](after-render-640d0ef/home-kk-320-x2.0-long.webp) | Исправлено: короткий заголовок «Тараздағы дүкендер» |
| Кабинет KZ ×2 | [render/dashboard-kk-320-x2.0-long](../flutter-050-review/render/dashboard-kk-320-x2.0-long.webp) | [11-cabinet-kk-320-x2](after-apk-051/11-cabinet-kk-320-x2.webp) (без входа) | [dashboard-kk-320 ×2](after-render-640d0ef/dashboard-kk-320-x2.0-long.webp) | Рендер: №9 остался, новый разрыв «Жұмысың / ыз» (N2); на APK блок кабинета без входа не виден |
| Кабинет | [render/dashboard-ru-390](../flutter-050-review/render/dashboard-ru-390-x1.0.webp) | — (нужен вход) | [dashboard-ru-390](after-render-640d0ef/dashboard-ru-390-x1.0.webp) | Зелёный блок, lime «Новая запись» |
| Ошибка | [render/venues-ru-360-x1.3-error](../flutter-050-review/render/venues-ru-360-x1.3-error.webp) | — | [venues-ru-360-x1.3-error](after-render-640d0ef/venues-ru-360-x1.3-error.webp) | Без изменений (№8) |
| Аналитика «По дням» | [render/analytics-ru-390-x1.0-daily](../flutter-050-review/render/analytics-ru-390-x1.0-daily.webp) | — (нужен вход) | [analytics-ru-390-daily](after-render-640d0ef/analytics-ru-390-x1.0-daily.webp) | Без изменений (№5, №6) |
| Мал базар | [render/market-ru-390](../flutter-050-review/render/market-ru-390-x1.0.webp) | — | [market-ru-390](after-render-640d0ef/market-ru-390-x1.0.webp) | Кнопка «назад» к площадкам |
