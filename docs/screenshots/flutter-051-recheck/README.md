# Flutter 0.5.0 → 0.5.1 (PR #60 @ `640d0ef`) — до и после

Галерея к [FLUTTER_050_RECHECK](../../FLUTTER_050_RECHECK.md). «До» — снимки первого review (`../flutter-050-review`). «После» — `after-render-640d0ef/`: рендеры автора из `apps/mobile/docs/reports/visual-051` @ `640d0ef` (`flutter test`, синтетические данные), переведённые в webp. Нового APK нет, поэтому снимков с эмулятора «после» нет. Это не снимки телефона.

| Экран | До (0.5.0) | После (0.5.1) | Что видно |
|---|---|---|---|
| Главная | [apk/01-venues](../flutter-050-review/apk/01-venues.webp) | [home-ru-390](after-render-640d0ef/home-ru-390-x1.0.webp), [home-kk-320 ×2](after-render-640d0ef/home-kk-320-x2.0-long.webp) | Новый зелёный блок, lime «Найти магазин»; KZ-заголовок без разрыва |
| Площадки | [render/venues-ru-390](../flutter-050-review/render/venues-ru-390-x1.0.webp) | [venues-ru-390](after-render-640d0ef/venues-ru-390-x1.0.webp), [venues-kk-320 ×2](after-render-640d0ef/venues-kk-320-x2.0-long.webp) | Компактные карточки; «адрес не подтверждён» убран из подписи (N1) |
| Кабинет | [render/dashboard-ru-390](../flutter-050-review/render/dashboard-ru-390-x1.0.webp) | [dashboard-ru-390](after-render-640d0ef/dashboard-ru-390-x1.0.webp) | Зелёный блок, lime «Новая запись» (вопрос по кнопкам — частично) |
| Кабинет KZ ×2 | [render/dashboard-kk-320-x2.0-long](../flutter-050-review/render/dashboard-kk-320-x2.0-long.webp) | [dashboard-kk-320 ×2](after-render-640d0ef/dashboard-kk-320-x2.0-long.webp) | №9 остался; новый разрыв «Жұмысың / ыз» |
| Магазин | [render/shop-ru-390](../flutter-050-review/render/shop-ru-390-x1.0.webp) | [shop-ru-390](after-render-640d0ef/shop-ru-390-x1.0.webp) | Без изменений: тёмно-зелёная «Оставить заявку», нейтральный «Учебная точка» (№2) |
| Магазин KZ ×2 | [render/shop-kk-320-x2.0-long](../flutter-050-review/render/shop-kk-320-x2.0-long.webp) | [shop-kk-320 ×2](after-render-640d0ef/shop-kk-320-x2.0-long.webp) | №9 без изменений |
| Заявка | [render/inquiry-ru-390](../flutter-050-review/render/inquiry-ru-390-x1.0.webp) | [inquiry-ru-390](after-render-640d0ef/inquiry-ru-390-x1.0.webp) | №7 без изменений |
| Ошибка | [render/venues-ru-360-x1.3-error](../flutter-050-review/render/venues-ru-360-x1.3-error.webp) | [venues-ru-360-x1.3-error](after-render-640d0ef/venues-ru-360-x1.3-error.webp) | №8 без изменений |
| Аналитика «По дням» | [render/analytics-ru-390-x1.0-daily](../flutter-050-review/render/analytics-ru-390-x1.0-daily.webp) | [analytics-ru-390-daily](after-render-640d0ef/analytics-ru-390-x1.0-daily.webp) | №5 и №6 без изменений |
| Площадка | [render/venue-ru-390](../flutter-050-review/render/venue-ru-390-x1.0.webp) | [venue-ru-390](after-render-640d0ef/venue-ru-390-x1.0.webp) | Fallback-картинка; 3D в рендере не проверяется (№4) |
| Мал базар | [render/market-ru-390](../flutter-050-review/render/market-ru-390-x1.0.webp) | [market-ru-390](after-render-640d0ef/market-ru-390-x1.0.webp) | Кнопка «назад» к площадкам |
