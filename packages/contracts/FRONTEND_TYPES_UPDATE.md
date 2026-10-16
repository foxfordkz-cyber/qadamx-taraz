# Точное обновление generated.ts для PR #5

Актуальное дополнение 2026-10-16: API **0.6.0**, backend `cd655e96ec809bb8857666ad1fffa16e56e6d02a`. generated.ts уже содержит GET `/api/v1/businesses/{id}/analytics` и AnalyticsResponse/Cards/Day/Hour. Параметр days: 7|30 (default7), Bearer, UUID точки из /me; HTTP200 → AnalyticsResponse, ошибки общий envelope. [Контракт и правила отмен](ANALYTICS_API.md), [полные примеры](analytics-examples.json), [OpenAPI](openapi.json). Frontend добавляет binding через существующий api.request и query key user+business+days; UI и локализацию выполняет участник frontend. Никакого patch поверх актуального generated.ts: `npm run generate:api`, затем check:api/typecheck. Старые секции ниже — история переходов; ручные ledger/AI bindings не менялись.

В `integration/team-mvp` generated.ts уже обновлён из общего OpenAPI **0.4.0**: добавлены публичные venues/businesses/shop, InquiryReceipt/Response/Update и private GET/PATCH inquiries; ledger/AI schemas сохранены. Из `apps/web` выполнить `npm run generate:api`, `npm run check:api`, `npm run typecheck`. Старый patch ниже относится только к переходу 0.2→0.3 и поверх актуального файла не применяется. Новый runtime также содержит bindings заявок/каталога и использует общие envelopes/price_minor. [Единое подключение](../../docs/TEAM_INTEGRATION.md).

Исходный frontend: PR #3, **`9b4156122e22f12839f9f69384cb79a43e90c730`**. Контракт backend: PR #5, **`2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c`**. Изменения проверены только в отдельной интеграционной копии; ветка автора frontend не менялась.

- [OpenAPI проверенного backend](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/openapi.json)
- [JSON-примеры](https://github.com/foxfordkz-cyber/qadamx-taraz/blob/2d2fc56bc5a9c9cf2153b8285f166f7150d0bd4c/packages/contracts/examples.json)
- [Точный patch generated.ts](frontend-generated-ai.patch), **178 добавленных / 48 удалённых строк**, без изменения runtime-кода frontend.

## Что меняется

1. В `paths` появляется `"/api/v1/businesses/{id}/drafts"`, только POST, с operation `create_draft_api_v1_businesses__id__drafts_post`.
2. В `operations` появляется этот метод: обязательный UUID path `id`, обязательное multipart-тело с `text?`, `audio?`, `locale?: "ru" | "kk" | "auto"`; 200 → `DraftResponse`, 401/404/409/413/415/422/503/504 → `ErrorResponse`.
3. `CustomerCandidate` и `DraftResponse` **уже были** в generated.ts первого этапа как компоненты. Генератор перемещает их выше; их поля не меняются. Это объясняет 48 удалённых строк — типы не исчезают.
4. Типы `/me`, клиентов, SaleCreate/RepaymentCreate, OperationResponse, SummaryResponse и ручных методов не меняются. Существующие bindings `/me` и клиентов править для этого обновления не требуется.

Генератор отображает OpenAPI `oneOf/not` как `& (unknown | unknown)`: TypeScript сам не обеспечивает «ровно text либо audio». Форма и backend должны проверять это условие. `audio?: string` — представление binary в генераторе, а не требование отправлять URL/JSON; браузер отправляет `File`/`Blob` через `FormData`. Не править generated.ts вручную ради этого ограничения. Примеры — [AI_INTEGRATION.md](AI_INTEGRATION.md).

В общем `api.request` пути относительно Base URL, уже содержащего `/api/v1`: вызывать `/businesses/${business.id}/drafts`, не `/api/v1/businesses/...`. `Content-Type` для FormData выставляет браузер. API key Gemini не передаётся frontend.

## Воспроизведение владельцем frontend

После согласованного получения backend-контракта PR #5 в своей интеграционной ветке (не изменяя main):

```powershell
cd apps/web
npm ci
npm run generate:api
npm run check:api
npm run typecheck
npx vitest run src/test/bindings.test.ts src/test/client.test.ts src/test/errors.test.ts
git diff -- src/shared/api/generated.ts
```

Фактически выполнено в отдельной копии: **check:api PASS, typecheck PASS, 45 tests passed**. Проверка `git apply --reverse --check` подтвердила соответствие приложенного patch полученному файлу. Patch рассчитан на указанный frontend commit; если файл уже обновился, заново сгенерировать его из актуального согласованного OpenAPI и проверить diff.

Альтернатива повторной генерации — применить приложенный patch из корня репозитория после принятия того же OpenAPI:

```powershell
git apply --check packages/contracts/frontend-generated-ai.patch
git apply packages/contracts/frontend-generated-ai.patch
```

Это инструкция владельцу frontend, не выполненная правка его ветки. Ledger/AI-страницы и их runtime readers остаются задачей команды. Публикация patch не означает готовность отсутствующего UI.
