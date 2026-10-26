# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final.acceptance.ts >> lost customer response resolves through real request lookup without a duplicate POST
- Location: e2e\final.acceptance.ts:127:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 201
```

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Новый клиент' })
Expected: not visible
Received: visible

Call log:
  - Expect "not toBeVisible" getByRole('dialog', { name: 'Новый клиент' }) with timeout 15000ms
  - waiting for getByRole('dialog', { name: 'Новый клиент' })
    4 × locator resolved to <dialog open="" class="" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="_r_7_">…</dialog>
      - unexpected value "visible"
  - Test ended.

```

```yaml
- dialog "Новый клиент":
  - heading "Новый клиент" [level=2]
  - button "Закрыть": ×
  - group "Язык интерфейса"
  - text: Имя
  - textbox "Имя" [disabled]: Synthetic Stage10 recovery
  - text: Заметка
  - textbox "Заметка" [disabled]
  - text: Например, павильон или примета — чтобы различать одинаковые имена. Контакт (необязательно)
  - textbox "Контакт (необязательно)" [disabled]
  - status: Отправляем запрос. Дождитесь подтверждения сохранения.
  - button "Проверить результат" [disabled]
  - button "Сохранение…" [disabled]
  - button "Отмена" [disabled]
```

# Test source

```ts
  55  |   const info = await (await request.get(api + "/__qa/info")).json();
  56  |   await login(page, info.empty);
  57  |   await navigateSeller(page, "sale");
  58  |   await page
  59  |     .getByRole("button", { name: "Заполнить вручную", exact: true })
  60  |     .click();
  61  |   await page
  62  |     .getByLabel("Описание", { exact: true })
  63  |     .fill("Synthetic Stage10 response loss");
  64  |   await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3400");
  65  |   await page.getByLabel("Получено, ₸", { exact: true }).fill("3400");
  66  |   const before = sql();
  67  |   const attempts: { key: string; body: string | null; operation: string }[] =
  68  |     [];
  69  |   await page.route("**/operations", async (route) => {
  70  |     if (route.request().method() !== "POST") return route.continue();
  71  |     const response = await route.fetch();
  72  |     expect(response.status()).toBe(200);
  73  |     const body = await response.json();
  74  |     attempts.push({
  75  |       key: route.request().headers()["idempotency-key"],
  76  |       body: route.request().postData(),
  77  |       operation: body.operation.id,
  78  |     });
  79  |     if (attempts.length === 1)
  80  |       await route.abort("failed"); // SQL committed, response intentionally lost.
  81  |     else await route.fulfill({ response });
  82  |   });
  83  |   await page
  84  |     .getByRole("button", { name: "Подтвердить запись", exact: true })
  85  |     .click({ clickCount: 2 });
  86  |   await expect(page.getByText(/Результат неизвестен/)).toBeVisible();
  87  |   await expect(
  88  |     page.getByText("Запись сохранена сервером", { exact: true }),
  89  |   ).toHaveCount(0);
  90  |   expect(attempts).toHaveLength(1);
  91  |   expect(sql().operations.length).toBe(before.operations.length + 1);
  92  |   await page.screenshot({
  93  |     path: evidence + "/lost-response-unknown.png",
  94  |     fullPage: true,
  95  |   });
  96  |   await page
  97  |     .getByRole("button", {
  98  |       name: "Проверить результат тем же запросом",
  99  |       exact: true,
  100 |     })
  101 |     .click();
  102 |   await expect(
  103 |     page.getByText("Запись сохранена сервером", { exact: true }),
  104 |   ).toBeVisible();
  105 |   expect(attempts).toHaveLength(2);
  106 |   expect(attempts[1]).toEqual(attempts[0]);
  107 |   const after = sql();
  108 |   expect(after.operations.length).toBe(before.operations.length + 1);
  109 |   expect(after.sales - before.sales).toBe(340000);
  110 |   expect(after.receipts - before.receipts).toBe(340000);
  111 |   expect(after.debt).toBe(before.debt);
  112 |   await writeFile(
  113 |     evidence + "/../response-loss-sql.json",
  114 |     JSON.stringify(
  115 |       {
  116 |         source: "Synthetic local SQL, actual browser request loss",
  117 |         attempts,
  118 |         before,
  119 |         after,
  120 |       },
  121 |       null,
  122 |       2,
  123 |     ) + "\n",
  124 |   );
  125 | });
  126 |
  127 | test("lost customer response resolves through real request lookup without a duplicate POST", async ({
  128 |   page,
  129 |   request,
  130 | }) => {
  131 |   const info = await (await request.get(api + "/__qa/info")).json();
  132 |   await login(page, info.empty);
  133 |   await navigateSeller(page, "customers");
  134 |   const before = sql();
  135 |   let posts = 0,
  136 |     lookups = 0;
  137 |   page.on("request", (r) => {
  138 |     if (r.url().includes("/customers/requests/")) lookups++;
  139 |   });
  140 |   await page.route("**/customers", async (route) => {
  141 |     if (route.request().method() !== "POST") return route.continue();
  142 |     posts++;
  143 |     const response = await route.fetch();
  144 |     expect(response.status()).toBe(200);
  145 |     await route.abort("failed");
  146 |   });
  147 |   await page.getByRole("button", { name: /Новый клиент/ }).click();
  148 |   const form = page.getByRole("dialog", { name: "Новый клиент" });
  149 |   await form
  150 |     .getByLabel("Имя", { exact: true })
  151 |     .fill("Synthetic Stage10 recovery");
  152 |   await form
  153 |     .getByRole("button", { name: "Создать клиента", exact: true })
  154 |     .click();
> 155 |   await expect(form).not.toBeVisible();
      |                          ^ Error: expect(locator).not.toBeVisible() failed
  156 |   await expect(
  157 |     page.getByRole("heading", {
  158 |       name: "Synthetic Stage10 recovery",
  159 |       exact: true,
  160 |     }),
  161 |   ).toBeVisible();
  162 |   expect(posts).toBe(1);
  163 |   expect(lookups).toBeGreaterThan(0);
  164 |   expect(sql().customers).toBe(before.customers + 1);
  165 |   expect(sql().all_business_ledger_sha256).toBe(
  166 |     before.all_business_ledger_sha256,
  167 |   );
  168 |   await writeFile(
  169 |     evidence + "/../customer-recovery-sql.json",
  170 |     JSON.stringify(
  171 |       {
  172 |         source: "Synthetic local SQL",
  173 |         posts,
  174 |         lookups,
  175 |         added_customers: 1,
  176 |         ledger_unchanged: true,
  177 |       },
  178 |       null,
  179 |       2,
  180 |     ) + "\n",
  181 |   );
  182 | });
  183 |
  184 | test("Research renders loading error retry 7/30 success and empty-business state with SQL unchanged", async ({
  185 |   page,
  186 |   request,
  187 | }) => {
  188 |   const info = await (await request.get(api + "/__qa/info")).json();
  189 |   await login(page, info.business);
  190 |   const before = sql().all_business_ledger_sha256;
  191 |   let release!: () => void;
  192 |   const held = new Promise<void>((resolve) => {
  193 |     release = resolve;
  194 |   });
  195 |   let calls = 0;
  196 |   await page.route("**/research/forecast?*", async (route) => {
  197 |     calls++;
  198 |     if (calls === 1) {
  199 |       await held;
  200 |       await route.fulfill({
  201 |         status: 503,
  202 |         contentType: "application/json",
  203 |         body: JSON.stringify({
  204 |           error: {
  205 |             code: "UNAVAILABLE",
  206 |             message: "Synthetic transport failure",
  207 |           },
  208 |         }),
  209 |       });
  210 |     } else await route.continue();
  211 |   });
  212 |   await navigateSeller(page, "research");
  213 |   await expect(page.locator("#forecast .spinner")).toBeVisible();
  214 |   await page.screenshot({
  215 |     path: evidence + "/research-loading.png",
  216 |     fullPage: true,
  217 |   });
  218 |   release();
  219 |   await expect(
  220 |     page
  221 |       .locator("#forecast")
  222 |       .getByRole("button", { name: "Повторить", exact: true }),
  223 |   ).toBeVisible();
  224 |   await page.screenshot({
  225 |     path: evidence + "/research-error.png",
  226 |     fullPage: true,
  227 |   });
  228 |   await page
  229 |     .locator("#forecast")
  230 |     .getByRole("button", { name: "Повторить", exact: true })
  231 |     .click();
  232 |   await expect(page.locator(".research-chart")).toBeVisible();
  233 |   const snapshots = [];
  234 |   for (const horizon of [7, 30]) {
  235 |     if (horizon === 30) {
  236 |       const response = page.waitForResponse((r) =>
  237 |         r.url().includes("/research/forecast?horizon=30"),
  238 |       );
  239 |       await page
  240 |         .getByLabel("Горизонт прогноза", { exact: true })
  241 |         .selectOption("30");
  242 |       snapshots.push(await (await response).json());
  243 |     }
  244 |     await expect(page.locator(".research-chart")).toBeVisible();
  245 |     await page.screenshot({
  246 |       path: evidence + "/research-" + horizon + "-days.png",
  247 |       fullPage: true,
  248 |     });
  249 |   }
  250 |   expect(snapshots[0].forecast).toHaveLength(30);
  251 |   expect(snapshots[0].evaluation).not.toBeNull();
  252 |   await page.getByLabel("Торговая точка").selectOption(info.empty);
  253 |   await expect(page.locator("#forecast")).toContainText(
  254 |     "Прогноз пока недоступен",
  255 |   );
```
