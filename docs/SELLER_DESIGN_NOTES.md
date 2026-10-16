# Qadam — дизайн Seller в Team MVP

Интеграция 2026-10-16 из a77f1a02 в отдельную feature/seller-design-integration от integration/team-mvp:3d009dc. Это перенос готового UI ограниченным diff, без cherry-pick старой архитектуры. Подробности и команды — [handoff](SELLER_FRONTEND_HANDOFF.md).

## Визуальная система

Референс — [официальный Polaris](https://shopify.dev/docs/api/polaris): последовательные формы, ясная иерархия и адаптивная плотность. Реализация остаётся React/CSS Qadam без Shopify API/Auth/App Bridge.

Токены shared/tokens.css: paper #F5F3EB, ink #172A26, green #164C3E, deep green #103B31, lime #D7F36A, orange #F0A94B, white #FFFEFA, line #E1E2D8, muted #58685F. Spacing 4/8/12/16/24/32/48; controls12, cards20, hero28. Семантические aliases совместимы с существующими общими UI.

Manrope локально, недостающие казахские буквы дополняются локальными NotoSans unicode-range. Источники и OFL лицензии — apps/web/public/fonts/README.md. Нет внешнего font CDN. Brand соответствует подготовленному seller-дизайну и палитре витрины. Текстовые контрастные пары рассчитаны: white/green 9.74, ink/paper 13.54, muted/paper 5.31, lime/green 7.91. Это проверка этих пар, не полный аудит WCAG.

Dashboard, карточки клиентов, поиск/фильтры заявок и каталога, диалоги и меню перенесены вместе с keyboard/focus/reduced-motion. Зелёный активный пункт, lime основной CTA, orange вторичные акценты. Суммы tabular-nums, значения исключительно серверные.

## Адаптация соседних модулей

Файлы voice/ledger/summary не изменены. Shared UI и scoped .app-shell .ledger-\* CSS объединяют оформление; breakpoint1100 устраняет узкие две формы/четыре KPI рядом с sidebar на планшете. Финансовые Demo страницы поясняют отсутствие серверных данных без фиктивных нулей/записей. Native Back/Forward больше не открывает закрытое меню повторно.

Public explore/inquiry/3D source сохранён. CSS .ex переназначает его существующие aliases на Qadam tokens и Manrope; hotspot border согласован. Сохранены публичные сетки/брейкпоинты, предупреждения, WebGL fallback и маршруты.

## Проверка и screenshots

Browser emulation 360/390/768/1440 проверяет все seller routes, overflow, финансовые поля, RU/KZ, 44px navigation/language controls, выбор точки/logout, menu Escape/focus/history, шрифты и skip-link. Public fixture test проверяет root→venue→shop, каталог, форму/валидацию, RU/KZ и WebGL fallback, перехватывая API и запрещая writes. Физический Android/микрофон не проверены.

Новые реальные снимки запущенного приложения — [screenshots/team-mvp-design](screenshots/team-mvp-design). Для dashboard/customers/sale/debts/history/summary/inquiries/catalog сняты desktop1440 и mobile390. Seller — явный read-only Demo; public home/shop — подписанные API test fixtures. Это не доказательство живого Supabase/backend или финансового сохранения. Воспроизводятся npm run test:e2e, копия по QADAM_SCREENSHOT_OUTPUT.

Итоговые test counts и commit/push/PR — в [основной передаче](SELLER_FRONTEND_HANDOFF.md). Старые screenshots и история предыдущих этапов не выдаются за текущую интеграцию.
