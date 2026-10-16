# Seller Analytics — browser screenshots

Настоящий Chromium, новый маршрут /seller/analytics, согласованная combined-база 58d4eb4 (API0.6.0). Все кадры явно обозначены как **Demo / синтетические данные**. Замороженный учебный snapshot — 16 октября 2026, Asia/Almaty; это не текущий серверный отчёт. Реальных запросов/записей денег нет. Проверка Live-клиента отдельными HTTP fixtures не выдаётся за живую БД и не используется для этих screenshots.

| Кадр | Размер viewport | Состояние |
|---|---|---|
| [Desktop 7 дней](analytics-desktop-7.png) | 1440×1000 | Четыре KPI, действующие продажи, почасовая регистрация |
| [Desktop 30 дней](analytics-desktop-30.png) | 1440×1000 | Другой период, текущий долг остаётся по всем датам |
| [Mobile 7 дней](analytics-mobile-7.png) | 390×844 | Локальная прокрутка графиков, значения по касанию |
| [Mobile 30 дней](analytics-mobile-30.png) | 390×844 | 30 дневных значений и 24 часа, без viewport overflow |
| [Empty](analytics-mobile-empty.png) | 390×844 | Нулевые значения, null среднего чека, все дни/часы |
| [Error desktop](analytics-desktop-error.png) | 1440×1000 | Явный локальный учебный сбой и retry без сервера |
| [Error mobile](analytics-mobile-error.png) | 390×844 | Тот же сценарий на мобильном viewport |

PNG сняты с fullPage: true. У мобильных полных снимков fixed bottom navigation остаётся на нижней границе исходного viewport внутри длинного изображения; в браузере она закреплена на экране, документ прокручивается. Это не склейка и не правка изображения.

Повтор из apps/web:

    npm run test:e2e -- --config e2e/analytics.playwright.config.ts analytics.spec.ts -g "capture genuine"

Функциональные тесты отдельно проверяют 360/390/768/1440, RU/KZ, keyboard/focus, reduced motion, таблицы, смену точки и отсутствие API writes.
