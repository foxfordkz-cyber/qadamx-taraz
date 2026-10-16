# Передача работы: единый визуальный стиль и 3D

Роль: участник №6, визуальная согласованность web и 3D-площадок. Последнее обновление: 2026-10-16.

Ветка `feature/unified-visual-3d`, отдельный worktree `../qadam-visual`. Base — `origin/integration/seller-analytics-061` @ `13248851fd2b2a502aff211a506f71e85c2b0ab1` (наследник проверенной сборки `5ab11b1`, PR #18; отличие только docs). Main и ветки участников не меняются.

## Затрагиваемые пути (координация)

Изменено в этапе A:

- `apps/web/src/shared/tokens.css` — только новые токены.
- `apps/web/src/shared/merchant.css` — высота выбора точки.
- `apps/web/src/features/explore/explore.css`, `VenueScene.tsx`, `VenuePage.tsx` — стили витрины, кадр 3D, порядок карточек.

Планируется в этапе B (визуальные правки без изменения логики):

- `apps/web/src/shared/{tokens,styles,merchant}.css`, `apps/web/src/shared/ui/*` — общие компоненты, состояния, статусы. Владелец каркаса — seller-web.
- `apps/web/src/features/explore/explore.css` — public-web.
- `apps/web/src/features/seller/analytics/analytics.css` — только замена цветовых литералов на токены, разметку и расчёты не трогаю.

Планируется в этапе C:

- `apps/web/public/models/*`, `public/previews/*`, `public/venue-assets.json`, `public/asset-sources.md`, `assets/venues/*`, `tools/assets/*` — assets-3d.
- `apps/web/src/features/explore/{Scene,VenueScene}.tsx` — свет, камера, fallback.

Не трогаю: `apps/api`, миграции, OpenAPI, `generated.ts`, Auth, API-клиент, bindings/gateway, денежные формулы и идемпотентность, `features/voice` (адаптацию voice ведёт Айдана), маршруты и идентификаторы hotspot, `apps/mobile`. При пересечении с активными правками сначала согласую исполнителя.

## Сделано

Этап A: аудит 13 страниц на 1440/768/390/360, токены направления, единая палитра и шрифт витрины с казахским fallback, touch-цели 44 px на витрине и в выборе точки, вписывание камеры площадки по габаритам, порядок карточек по маркерам. Подробности и метрики — [VISUAL_AUDIT](../VISUAL_AUDIT.md).

Этап B (`feature/unified-visual-3d-b`, поверх A): токены вместо 137 цветовых литералов, единые радиусы и тени, нижние границы шрифта 12/11 px, читаемые disabled, общий фокус витрины, стиль выбора файла. Изменены только `shared/{tokens,styles,merchant}.css`, `features/explore/explore.css`, `features/seller/analytics/analytics.css`; разметка и логика не менялись. Подробности — раздел «Этап B» в [VISUAL_AUDIT](../VISUAL_AUDIT.md).

Этап C (`feature/unified-visual-3d-c`, поверх B): маркеры и подписи сцен — DOM-слой поверх canvas вместо drei `<Html>` (исправлена пропажа точки 1), силуэты площадок на главной, свет и цвета сцен из токенов, пределы зума по размеру площадки и «Общий вид», раздел «Мал базар — демонстрационная схема» с планом и 3D по кнопке. Изменены только файлы `features/explore` и `public/asset-sources.md`; GLB не менялись. Подробности — раздел «Этап C» в [VISUAL_AUDIT](../VISUAL_AUDIT.md).

Этап D (`feature/unified-visual-3d-d`, поверх C): сквозная приёмка итоговой сборки `integration/voice-preview-061` + A–D (слияние без конфликтов), исправлен запрос кадра проектора при позднем приходе данных, галерея до/после. Результаты и инструкция интеграции — [VISUAL_ACCEPTANCE](../VISUAL_ACCEPTANCE.md).

## Проверки

typecheck, lint, format:check, build — passed. Unit/component 207 passed. E2E в установленном Chrome: Analytics-конфиг 24 passed, QA-конфиг 21 passed. Снимки до/после — локально в игнорируемой `tmp/screenshots/{before,after}`; физический телефон не проверялся, только эмуляция ширин в headless Chrome.

## Модели сейчас

| GLB | Байт |
|---|---:|
| `mart.glb` | 1 312 516 |
| `kaikarmet.glb` | 712 724 |
| `auyl-bereke.glb` | 745 044 |

Все в пределах ориентира 5 МБ. Модели в этапе A не менялись.

## Ограничения и блокеры

- Пересборка моделей требует Blender 4.5 LTS (`tools/assets/build_venues.py`); на рабочем компьютере его нет.
- Web-маршрута «Мал базар» нет; лента и цены только из API, фиктивной ленты не будет.
- Физический Android и реальный WebGL телефона не проверены.

## Следующий шаг

Review цепочки #24 → #26 → #27 → D и решение капитана о слиянии. Дальше по роли: пересборка GLB по референсам после установки Blender 4.5 LTS, проверка на физическом Android (FPS, память, касания), web-лента «Мал базар» из публичного API — по согласованию с владельцами витрины и mobile.
