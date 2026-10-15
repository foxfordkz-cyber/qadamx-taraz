# Контракты Qadam Business

Источник схем — `apps/api/app/schemas`, примеров — `apps/api/app/examples.py`. Генерация из `apps/api`: `uv run python -m app.export_contracts`. Проверка актуальности: та же команда с `--check`.

- `openapi.json`: OpenAPI работающего каркаса; в `paths` пока только health. В `components/schemas` присутствуют семь схем первого этапа и discriminated union `OperationCreate` для будущего `POST operations`.
- `examples.json`: валидируемые учебные запросы/ответы, не результат живых API или AI.
- `demo-seed.json`: синтетические UUID и slug для локального seed и согласования frontend/3D. Учебные владельцы не являются Supabase-аккаунтами.

Плановые маршруты и правила: `docs/team5/02_ARCHITECTURE_API.md`. Закрытые и денежные методы пока отсутствуют. Генерацию TypeScript-типов подключает владелец seller-web.
