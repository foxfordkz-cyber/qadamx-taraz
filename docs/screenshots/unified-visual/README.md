# Единый визуальный стиль и 3D — до и после

**До:** база `integration/seller-analytics-061` @ `1324885` (код `5ab11b1`), 16.10.2026, живой публичный API команды через прежний временный HTTPS.
**После:** локальная проверочная сборка `integration/voice-preview-061` @ `0737439` + этапы A–D (`feature/unified-visual-3d-d`), 16.10.2026, живой публичный API через восстановленный временный HTTPS (только GET).

Кабинет продавца на всех снимках — явный read-only Demo: вход не выполнялся, денежных и других записей не было. Headless Chrome с программным WebGL, ширины эмулированы; это не снимки физического телефона. Снимки во всю высоту: на 360 px закреплённое нижнее меню кабинета попадает в середину кадра, в приложении оно внизу экрана.

| Экран | 1440 до | 1440 после | 360 до | 360 после |
|---|---|---|---|---|
| Главная | [до](before/1440-p-home.webp) | [после](after/1440-p-home.webp) | [до](before/360-p-home.webp) | [после](after/360-p-home.webp) |
| Площадка MART (3D) | [до](before/1440-p-venue-mart.webp) | [после](after/1440-p-venue-mart.webp) | [до](before/360-p-venue-mart.webp) | [после](after/360-p-venue-mart.webp) |
| Магазин «Демо MART home» | [до](before/1440-p-shop-mart-home.webp) | [после](after/1440-p-shop-mart-home.webp) | [до](before/360-p-shop-mart-home.webp) | [после](after/360-p-shop-mart-home.webp) |
| Вход | [до](before/1440-s-00-login.webp) | [после](after/1440-s-00-login.webp) | [до](before/360-s-00-login.webp) | [после](after/360-s-00-login.webp) |
| Главная кабинета (Demo) | [до](before/1440-s-01-dashboard.webp) | [после](after/1440-s-01-dashboard.webp) | [до](before/360-s-01-dashboard.webp) | [после](after/360-s-01-dashboard.webp) |
| Продажа (Demo) | [до](before/1440-s-02-sale.webp) | [после](after/1440-s-02-sale.webp) | [до](before/360-s-02-sale.webp) | [после](after/360-s-02-sale.webp) |
| Аналитика (Demo) | [до](before/1440-s-06-analytics.webp) | [после](after/1440-s-06-analytics.webp) | [до](before/360-s-06-analytics.webp) | [после](after/360-s-06-analytics.webp) |
| Заявки (Demo) | [до](before/1440-s-07-inquiries.webp) | [после](after/1440-s-07-inquiries.webp) | [до](before/360-s-07-inquiries.webp) | [после](after/360-s-07-inquiries.webp) |

«Мал базар — демонстрационная схема», 3D по кнопке (нового раздела «до» нет): [1440](after/1440-p-mal-bazar-3d.webp), [390](after/390-p-mal-bazar-3d.webp). Сняты на этапе C с фикстурой seed для витрины; схема от данных API не зависит.

Отчёт приёмки и инструкция интеграции — [VISUAL_ACCEPTANCE](../../VISUAL_ACCEPTANCE.md).
