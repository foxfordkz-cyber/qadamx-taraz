# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final.acceptance.ts >> lost financial response: SQL commits once and explicit retry reuses exact key and body
- Location: e2e\final.acceptance.ts:51:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 0
Received array:  []
```

```
Error: apiResponse.json: Response has been disposed
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Перейти к содержимому" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - complementary [ref=e5]:
    - link "Qadam Business" [ref=e6] [cursor=pointer]:
      - /url: /seller
      - generic [ref=e10]:
        - text: qadam
        - generic [ref=e11]: business
    - paragraph [ref=e12]: Кабинет продавца
    - navigation "Кабинет продавца" [ref=e13]:
      - link "Главная" [ref=e14] [cursor=pointer]:
        - /url: /seller
      - link "Продажа" [ref=e18] [cursor=pointer]:
        - /url: /seller/sale
      - link "Мне должны" [ref=e22] [cursor=pointer]:
        - /url: /seller/debts
      - link "Аналитика" [ref=e26] [cursor=pointer]:
        - /url: /seller/analytics
      - link "Заявки" [ref=e30] [cursor=pointer]:
        - /url: /seller/inquiries
    - group [ref=e34]:
      - generic "Ещё +" [ref=e35] [cursor=pointer]:
        - generic [ref=e38]: Ещё
        - text: +
    - generic [ref=e39]:
      - strong [ref=e42]: Qadam · Taraz
      - generic [ref=e43]: Одна платформа для вашей точки и покупателей.
      - link "Публичная витрина" [ref=e44] [cursor=pointer]:
        - /url: /
        - text: Публичная витрина
        - generic [aria-hidden] [ref=e45]: ↗
  - generic [ref=e46]:
    - banner [ref=e47]:
      - generic [ref=e52]:
        - generic [ref=e53]: Торговая точка
        - combobox "Торговая точка" [ref=e54]:
          - option "Демо Кайкармет food"
          - option "Демо Ауыл Береке clothes"
          - option "Демо Кайкармет clothes"
          - option "Демо Ауыл Береке food"
          - option "OFFLINE AI · SYNTHETIC · история 180 дней"
          - option "OFFLINE AI · SYNTHETIC · чистая точка" [selected]
      - generic [ref=e55]:
        - generic [ref=e56]: Рабочие данные
        - group "Язык интерфейса" [ref=e58]:
          - button "RU" [pressed] [ref=e59] [cursor=pointer]
          - button "KZ" [ref=e60] [cursor=pointer]
        - button "Выйти" [ref=e61] [cursor=pointer]
    - main [ref=e63]:
      - heading "Новая запись" [level=1] [ref=e66]
      - generic [ref=e67]:
        - article [ref=e68]:
          - paragraph [ref=e69]: Продажи
          - strong [ref=e70]: 7 200 ₸
        - article [ref=e71]:
          - paragraph [ref=e72]: Поступления
          - strong [ref=e73]: 3 200 ₸
        - article [ref=e74]:
          - paragraph [ref=e75]: Общий долг
          - strong [ref=e76]: 4 000 ₸
        - article [ref=e77]:
          - paragraph [ref=e78]: Заявки за день
          - strong [ref=e79]: "0"
      - list "Шаги записи" [ref=e80]:
        - listitem [ref=e81]:
          - generic [aria-hidden] [ref=e82]: "1"
          - text: Ввод
        - listitem [ref=e83]:
          - generic [aria-hidden] [ref=e84]: "2"
          - text: Проверка
        - listitem [ref=e85]:
          - generic [aria-hidden] [ref=e86]: "3"
          - text: Подтверждение
      - generic [ref=e87]:
        - article [ref=e88]:
          - heading "Голосом или текстом" [level=2] [ref=e89]
          - group [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]: Текст для AI
              - textbox "Текст для AI" [disabled] [ref=e93]
            - generic [ref=e94]:
              - generic [ref=e95]:
                - generic [ref=e96]: Аудиофайл (до 30 секунд, 8 МБ)
                - button "Аудиофайл (до 30 секунд, 8 МБ)" [disabled] [ref=e97]
              - button "Записать голос" [disabled] [ref=e99]
              - paragraph [ref=e100]: Запишите → остановите → прослушайте → нажмите «Подготовить черновик». Без этого аудио не отправляется.
            - generic [ref=e101]:
              - generic [ref=e102]: Язык записи
              - combobox "Язык записи" [disabled] [ref=e103]:
                - option "Авто · RU / KZ / смешанная речь" [disabled]
                - option "Русский" [disabled] [selected]
                - option "Қазақша" [disabled]
            - button "Подготовить черновик" [disabled] [ref=e104]
          - button "Заполнить вручную" [disabled] [ref=e105]
        - article [ref=e106]:
          - heading "Проверка и подтверждение" [level=2] [ref=e107]
          - paragraph [ref=e108]: Проверьте суммы, оплату и клиента. AI не записывает деньги. Неизвестная оплата не равна нулю.
          - alert [ref=e109]:
            - paragraph [ref=e110]: Результат неизвестен. Повтор сохранит исходный ключ и тело. Не создавайте другую операцию.
            - button "Проверить результат тем же запросом" [disabled] [ref=e111]
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { execFileSync } from "node:child_process";
  3   | import { fileURLToPath } from "node:url";
  4   | import { mkdir, writeFile } from "node:fs/promises";
  5   | import { navigateSeller } from "./helpers";
  6   |
  7   | const api = process.env.QADAM_QA_API_ORIGIN!;
  8   | const evidence = process.env.QADAM_QA_EVIDENCE_DIR!;
  9   | const apiDir = fileURLToPath(new URL("../../api", import.meta.url));
  10  | function sql() {
  11  |   return JSON.parse(
  12  |     execFileSync(
  13  |       apiDir +
  14  |         "/.venv/" +
  15  |         (process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
  16  |       ["tests/final_browser_server.py", "--verify"],
  17  |       {
  18  |         cwd: apiDir,
  19  |         env: { ...process.env, PYTHONPATH: "." },
  20  |         encoding: "utf8",
  21  |       },
  22  |     ),
  23  |   );
  24  | }
  25  | async function login(page: Page, business: string) {
  26  |   await page.route("**/*", (route) =>
  27  |     new URL(route.request().url()).hostname === "127.0.0.1"
  28  |       ? route.continue()
  29  |       : route.abort(),
  30  |   );
  31  |   await page.goto("/login");
  32  |   await page
  33  |     .getByLabel("Электронная почта", { exact: true })
  34  |     .fill("a@research.example.test");
  35  |   await page.getByLabel("Пароль", { exact: true }).fill("synthetic-local-only");
  36  |   await page.getByRole("button", { name: "Войти", exact: true }).click();
  37  |   await expect(page.locator(".app-shell")).toBeVisible();
  38  |   await page.getByLabel("Торговая точка").selectOption(business);
  39  | }
  40  | async function noOverflow(page: Page) {
  41  |   expect(
  42  |     await page.evaluate(
  43  |       () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  44  |     ),
  45  |   ).toBe(true);
  46  | }
  47  | test.beforeAll(async () => {
  48  |   await mkdir(evidence, { recursive: true });
  49  | });
  50  |
  51  | test("lost financial response: SQL commits once and explicit retry reuses exact key and body", async ({
  52  |   page,
  53  |   request,
  54  | }) => {
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
> 73  |     const body = await response.json();
      |                                 ^ Error: apiResponse.json: Response has been disposed
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
  155 |   await expect(form).not.toBeVisible();
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
```
