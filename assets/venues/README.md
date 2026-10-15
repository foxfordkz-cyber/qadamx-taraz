# Исходники и проверка 3D-площадок

Три оригинальные стилизованные модели для Qadam: MART, Кайкармет и Ауыл Береке. MART — подробный фасад с арками и геометрическим экраном; Кайкармет — низкие параллельные павильоны и открытые фермы; Ауыл Береке — входной портик и двор с павильонами. Все размеры и размещение учебных точек концептуальные.

## Файлы

- `blend/mart.blend`, `blend/kaikarmet.blend`, `blend/auyl-bereke.blend` — редактируемые части с именами, материалы, студийный свет и камера для превью. Только Blender использует Z вверх.
- `../../apps/web/public/models/*.glb` — веб-экспорт с +Y вверх, фасадом к +Z, origin `[0,0,0]` и основанием при Y=0. Scale/rotation применены, геометрия сгруппирована по материалам.
- `../../apps/web/public/previews/*.webp` — изображения именно этих моделей, 1024×768, из Cycles. HTML должен содержать название и пометку «Концептуальная модель»; текст не запечён в геометрию.
- `../../apps/web/public/venue-assets.json` — manifest v1 по существующему fixture, измеренные bounds, камера и девять hotspot.
- `../../apps/web/public/asset-sources.md` — референсы, авторство, ограничения.
- `validation.json` и `gltf-validation.json` — измерения и независимая проверка Khronos; `browser-validation.json` — фактически выполненная браузерная проверка.

Студийный фон, свет и камеры в `.blend` помечены `RENDER ONLY`. Они не экспортируются в GLB. В GLB нет текстур, внешних URI, анимаций, Draco/Meshopt и обязательных расширений. Достаточно обычного GLTFLoader и стандартного освещения Three.js.

## Воспроизведение

Проверенная версия — Blender 4.5.9 LTS. Python 3.13 + Pillow 12.0.0 использованы для WebP; другой совместимый Python/Pillow также подходит. Node.js нужен только для необязательной независимой проверки и установки Three.js для просмотрщика. Все команды ниже выполняются из корня репозитория.

```powershell
blender --background --factory-startup --threads 8 --python tools/assets/build_venues.py -- --samples 48
python tools/assets/package_venues.py
python -B tools/assets/validate_assets.py --report assets/venues/validation.json
```

Если `blender` не в PATH, указать полный путь к официальному executable. Генератор пишет `.blend`, GLB, manifest и временные PNG в `tmp/asset-renders`. Если Pillow есть в Blender Python, WebP пишутся сразу; иначе вторая команда конвертирует PNG системным Python с Pillow. `--venue mart` пересобирает только одну площадку, `--no-render` пропускает рендер (после изменения геометрии превью всё равно надо обновить).

Проверка Khronos и просмотрщик без изменения зависимостей приложения:

```powershell
npm install --prefix tmp/asset-qa --no-audit --no-fund three@0.180.0 gltf-validator@2.0.0-dev.3.10
node tools/assets/validate_gltf.cjs --validator tmp/asset-qa/node_modules/gltf-validator --report assets/venues/gltf-validation.json
python tools/assets/serve_assets.py --vendor tmp/asset-qa/node_modules --port 8765 --bind 127.0.0.1
```

Открыть `http://127.0.0.1:8765/`. Параметры `?venue=kaikarmet`, `?width=360` (только ширина сцены) и `?fallback=1` помогают повторить проверку. Для полной проверки responsive менять viewport самого браузера. Просмотрщик — инструмент приёмки ассетов, не второе React-приложение и не реализация публичного каталога/API.

## Интеграция public-web

Скопировать содержимое web-архива в `apps/web/public` с сохранением путей либо получить эту ветку. Manifest уже находится по `/venue-assets.json`. Загружать один подробный GLB при выборе площадки, при переключении освобождать старую геометрию и материалы. В приложении оставить HTML-карточки и `poster_url` при недоступном WebGL/ошибке файла.

Не применять дополнительный поворот −90° или множитель 100: экспорт уже в метрах и +Y вверх. `center` — origin на земле, не середина высоты. `bounds_min/max` измерены по экспортированной геометрии, включая основание и благоустройство.

`camera_position`, `camera_target` и дополнительное `camera_fov_degrees=45` задают начальное направление и дистанцию. При узком aspect отодвинуть камеру, чтобы все восемь углов bounds попадали в кадр с отступом; пример расчёта — `fitCamera()` в `tools/assets/viewer.html`. Не ограничиваться копированием камеры для desktop. Ограничить zoom и полярный угол, чтобы камера не проходила под основание.

Hotspot: `id` — стабильный ID маркера по fixture, `business_slug` — публичный slug, дополнительный `business_id` — UUID из текущего `packages/contracts/demo-seed.json`. Перед подключением сверить с актуальным API. Координаты `position` — локальные XYZ модели; HTML-кнопки должны выбирать ту же сущность, что и список. В `.blend` и GLB маркеры/надписи намеренно не запечены.

## Граница готовности

Проверка самостоятельного просмотрщика подтверждает загрузку GLB, кадрирование и выбор учебных точек. Полная приёмка в React/R3F-приложении и замер на реальном телефоне остаются у public-web: на момент этой поставки frontend-каркас отсутствует. Никакие FPS, мобильная скорость и готовность живого API здесь не заявлены.
