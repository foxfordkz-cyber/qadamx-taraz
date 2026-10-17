# Аналитика: до / после

Снято реальным Chromium в изолированном Demo: синтетические суммы, фиксированный
снимок 16 октября 2026, без живых запросов и записей. До — неизменённый `ad63a00`.
После — `feature/seller-analytics-readability` поверх `6e8bd1b`.

| Состояние | До | После |
|---|---|---|
| Desktop 1440, 7 дней | [PNG](before/seller-analytics/analytics-desktop-7.png) | [PNG](after/seller-analytics/analytics-desktop-7.png) |
| Desktop 1440, 30 дней | [PNG](before/seller-analytics/analytics-desktop-30.png) | [PNG](after/seller-analytics/analytics-desktop-30.png) |
| Mobile 390, 7 дней | [PNG](before/seller-analytics/analytics-mobile-7.png) | [PNG](after/seller-analytics/analytics-mobile-7.png) |
| Mobile 390, 30 дней | [PNG](before/seller-analytics/analytics-mobile-30.png) | [PNG](after/seller-analytics/analytics-mobile-30.png) |
| Mobile 390, пустой период | [PNG](before/seller-analytics/analytics-mobile-empty.png) | [PNG](after/seller-analytics/analytics-mobile-empty.png) |
| Mobile 390, ошибка | [PNG](before/seller-analytics/analytics-mobile-error.png) | [PNG](after/seller-analytics/analytics-mobile-error.png) |
| Desktop 1440, ошибка | [PNG](before/seller-analytics/analytics-desktop-error.png) | [PNG](after/seller-analytics/analytics-desktop-error.png) |

Дополнительно после: [отрицательные поступления, RU 1440](after/seller-analytics/analytics-desktop-negative.png),
[отрицательные поступления и null среднего чека, KZ 360](after/seller-analytics/analytics-mobile-kk-negative.png).
На полном мобильном снимке нижняя фиксированная навигация показана у нижней границы
первого viewport; это поведение full-page screenshot, а не положение меню в документе.

Повторный захват из `apps/web`:

```powershell
$env:QADAM_SCREENSHOT_ROOT='./test-results/analytics-final-shots'
npm.cmd run test:e2e -- --config e2e/analytics.playwright.config.ts analytics.spec.ts --grep 'capture genuine' --trace off
```

Для повторения «до» нужна отдельная копия ad63a00 с его исходным screenshot-тестом.
Прежние галереи репозитория не перезаписывались. Физический телефон не проверялся.
