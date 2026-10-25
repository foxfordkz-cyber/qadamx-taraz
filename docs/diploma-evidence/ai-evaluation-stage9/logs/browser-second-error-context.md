# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diploma.acceptance.ts >> complete seller workflow uses real SQL and explicit offline AI boundaries
- Location: e2e\diploma.acceptance.ts:58:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - waiting for navigation until "load"

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
      - generic "Ещё −" [ref=e35] [cursor=pointer]:
        - generic [ref=e38]: Ещё
        - text: −
      - navigation "Все разделы" [ref=e39]:
        - link "Клиенты" [ref=e40] [cursor=pointer]:
          - /url: /seller/customers
        - link "Каталог" [ref=e44] [cursor=pointer]:
          - /url: /seller/catalog
        - link "История" [ref=e48] [cursor=pointer]:
          - /url: /seller/history
        - link "Итог дня" [ref=e52] [cursor=pointer]:
          - /url: /seller/summary
        - link "Прогноз и обратная связь" [ref=e56] [cursor=pointer]:
          - /url: /seller/research
    - generic [ref=e60]:
      - strong [ref=e63]: Qadam · Taraz
      - generic [ref=e64]: Одна платформа для вашей точки и покупателей.
      - link "Публичная витрина" [ref=e65] [cursor=pointer]:
        - /url: /
        - text: Публичная витрина
        - generic [aria-hidden] [ref=e66]: ↗
  - generic [ref=e67]:
    - banner [ref=e68]:
      - generic [ref=e73]:
        - generic [ref=e74]: Торговая точка
        - combobox "Торговая точка" [ref=e75]:
          - option "Демо Кайкармет food"
          - option "Демо Ауыл Береке clothes"
          - option "Демо Кайкармет clothes"
          - option "Демо Ауыл Береке food"
          - option "OFFLINE QA · история 180 дней · AI stub"
          - option "OFFLINE Stage9 · synthetic provider" [selected]
      - generic [ref=e76]:
        - generic [ref=e77]: Рабочие данные
        - group "Язык интерфейса" [ref=e79]:
          - button "RU" [pressed] [ref=e80] [cursor=pointer]
          - button "KZ" [ref=e81] [cursor=pointer]
        - button "Выйти" [ref=e82] [cursor=pointer]
    - main [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e87]:
          - heading "Прогноз и обратная связь" [level=1] [ref=e88]
          - paragraph [ref=e89]: Исследовательские инструменты для вашей точки. Оценки не меняют продажи, долги или доступ клиентов.
        - navigation "Прогноз и обратная связь" [ref=e90]:
          - link "Прогноз продаж" [ref=e91] [cursor=pointer]:
            - /url: "#forecast"
          - link "Оценка риска долга" [ref=e92] [cursor=pointer]:
            - /url: "#risk"
          - link "Обратная связь" [ref=e93] [cursor=pointer]:
            - /url: "#feedback"
          - link "Аналитика" [ref=e94] [cursor=pointer]:
            - /url: /seller/analytics
        - article [ref=e95]:
          - generic [ref=e96]:
            - heading "Прогноз продаж" [level=2] [ref=e97]
            - generic [ref=e98]:
              - generic [ref=e99]: Горизонт прогноза
              - combobox "Горизонт прогноза" [ref=e100]:
                - option "7 дней" [selected]
                - option "30 дней"
          - generic [ref=e101]:
            - paragraph [ref=e102]: Продажи на конец каждого дня в Asia/Almaty. Сегодня и первый день учёта исключены из обучения. Поздние отмены не переписывают прошлые признаки; история может отличаться от текущей аналитики.
            - generic [ref=e103]: "Учебная торговая точка: эти метрики не доказывают качество на реальном бизнесе."
            - status [ref=e104]: "Недостаточно истории для сравнения: 0 полных дней из необходимых 98. Прогноз пока недоступен."
            - button "Скачать JSON" [ref=e105] [cursor=pointer]
        - article [ref=e106]:
          - heading "Оценка риска долга" [level=2] [ref=e107]
          - paragraph [ref=e108]: "Правила, не обученная модель. Балл — приоритет проверки, не вероятность невозврата. Сроков оплаты нет: возраст долга не означает просрочку."
          - paragraph [ref=e109]: "Приоритет проверки: низкий — 0–29, средний — 30–59, высокий — 60–100. Это шкала баллов, не проценты."
          - list [ref=e110]:
            - listitem [ref=e111]:
              - generic [ref=e112]:
                - strong [ref=e113]: QA Stage6 клиент
                - generic [ref=e114]: "Средний · Балл: 30/100"
              - paragraph [ref=e115]:
                - text: "Текущий долг:"
                - strong [ref=e116]: 2 000 ₸
                - text: "· Возраст старейшей продажи: 0 дней"
              - list "Факторы" [ref=e117]:
                - listitem [ref=e118]: "Старейшая открытая продажа: до 7 дней"
                - listitem [ref=e119]: Не погашено хотя бы 50% исходного долга (+20)
                - listitem [ref=e120]: По открытым продажам нет доплат за вычетом отмен (+10)
              - paragraph [ref=e121]:
                - link "Проверить открытые продажи" [ref=e122] [cursor=pointer]:
                  - /url: /seller/debts?customer_id=1509c2fa-4816-492f-b2eb-d72063b5b17a
                - generic [ref=e123]: · Сверьте остаток с клиентом. Оценка не запускает напоминание или списание.
        - article [ref=e124]:
          - heading "Обратная связь" [level=2] [ref=e125]
          - generic [ref=e126]:
            - paragraph [ref=e127]: Участие добровольное. Ответ связан с аккаунтом и точкой; он не публикуется и не виден другим продавцам. Команда использует его для улучшения Qadam и обезличенного анализа. Не вводите имена клиентов, контакты, суммы или секреты. Для отзыва согласия передайте команде номер ответа через согласованный канал. Срок хранения — до 90 дней, продление требует нового согласия.
            - group "Обратная связь" [ref=e128]:
              - group "Чем вы уже пользовались? Можно ничего не выбирать." [ref=e130]:
                - generic [ref=e132]:
                  - checkbox "Продажи" [disabled] [ref=e133]
                  - text: Продажи
                - generic [ref=e134]:
                  - checkbox "Долги" [disabled] [ref=e135]
                  - text: Долги
                - generic [ref=e136]:
                  - checkbox "Голос" [disabled] [ref=e137]
                  - text: Голос
                - generic [ref=e138]:
                  - checkbox "Аналитика" [disabled] [ref=e139]
                  - text: Аналитика
                - generic [ref=e140]:
                  - checkbox "Прогноз продаж" [disabled] [ref=e141]
                  - text: Прогноз продаж
                - generic [ref=e142]:
                  - checkbox "Оценка риска долга" [disabled] [ref=e143]
                  - text: Оценка риска долга
                - generic [ref=e144]:
                  - checkbox "Каталог" [disabled] [ref=e145]
                  - text: Каталог
                - generic [ref=e146]:
                  - checkbox "Заявки" [disabled] [ref=e147]
                  - text: Заявки
              - paragraph [ref=e148]: 1 — низкая оценка, 5 — высокая. Оцените только то, что пробовали.
              - generic [ref=e149]:
                - generic [ref=e150]: Насколько понятны продажи и долги?
                - combobox "Насколько понятны продажи и долги?" [disabled] [ref=e151]:
                  - option "Не пользовался / не могу оценить" [disabled] [selected]
                  - option "1" [disabled]
                  - option "2" [disabled]
                  - option "3" [disabled]
                  - option "4" [disabled]
                  - option "5" [disabled]
              - generic [ref=e152]:
                - generic [ref=e153]: Насколько прогноз полезен для ваших решений?
                - combobox "Насколько прогноз полезен для ваших решений?" [disabled] [ref=e154]:
                  - option "Не пользовался / не могу оценить" [disabled] [selected]
                  - option "1" [disabled]
                  - option "2" [disabled]
                  - option "3" [disabled]
                  - option "4" [disabled]
                  - option "5" [disabled]
              - generic [ref=e155]:
                - generic [ref=e156]: Насколько понятны объяснения риска?
                - combobox "Насколько понятны объяснения риска?" [disabled] [ref=e157]:
                  - option "Не пользовался / не могу оценить" [disabled] [selected]
                  - option "1" [disabled]
                  - option "2" [disabled]
                  - option "3" [disabled]
                  - option "4" [disabled]
                  - option "5" [disabled]
              - generic [ref=e158]:
                - generic [ref=e159]: Какая задача осталась нерешённой? (до 1500 символов)
                - textbox "Какая задача осталась нерешённой? (до 1500 символов)" [disabled] [ref=e160]
              - generic [ref=e161]:
                - generic [ref=e162]: Что улучшить первым? (обязательно, до 500 символов)
                - textbox "Что улучшить первым? (обязательно, до 500 символов)" [disabled] [ref=e163]: Synthetic Stage6 workflow — not a participant response
              - generic [ref=e164]:
                - generic [ref=e165]: Предложение, необязательно (до 2000 символов)
                - textbox "Предложение, необязательно (до 2000 символов)" [disabled] [ref=e166]
              - generic [ref=e167]:
                - checkbox "Готов к отдельному интервью. Команда согласует контакт через мой существующий канал общения." [disabled] [ref=e168]
                - text: Готов к отдельному интервью. Команда согласует контакт через мой существующий канал общения.
              - generic [ref=e169]:
                - checkbox "Согласен на описанную обработку ответа для исследования (версия v1)." [checked] [disabled] [ref=e170]
                - text: Согласен на описанную обработку ответа для исследования (версия v1).
            - status [ref=e171]: "Ответ сохранён сервером. Номер: 2b94057e-a3dd-4eeb-9f46-3506aaefb04a"
          - group [ref=e172]:
            - generic "Мои сохранённые ответы" [ref=e173] [cursor=pointer]
```

# Test source

```ts
  134 |     .getByRole("button", { name: "Подтвердить запись", exact: true })
  135 |     .click();
  136 |   await saved(page);
  137 |   expect(sql()).toMatchObject({
  138 |     sales: 300000,
  139 |     receipts: 150000,
  140 |     debt: 150000,
  141 |   });
  142 |
  143 |   await navigateSeller(page, "history");
  144 |   await expect(page.locator(".history-row")).toHaveCount(2);
  145 |   await page
  146 |     .locator(".history-row")
  147 |     .first()
  148 |     .getByRole("button", { name: "Исправить запись", exact: true })
  149 |     .click();
  150 |   await page
  151 |     .getByRole("dialog")
  152 |     .getByRole("button", { name: "Подтвердить запись", exact: true })
  153 |     .click();
  154 |   await expect(page.getByRole("dialog")).not.toBeVisible();
  155 |   await expect(page.locator(".history-row")).toHaveCount(3);
  156 |   expect(sql()).toMatchObject({
  157 |     sales: 300000,
  158 |     receipts: 100000,
  159 |     debt: 200000,
  160 |   });
  161 |   expect(sql().operations.map((o: { kind: string }) => o.kind)).toEqual([
  162 |     "sale",
  163 |     "repayment",
  164 |     "reversal",
  165 |   ]);
  166 |
  167 |   await navigateSeller(page, "sale");
  168 |   await page
  169 |     .getByLabel("Текст для AI", { exact: true })
  170 |     .fill("Продажа 1200, оплатили сразу полностью");
  171 |   await page
  172 |     .getByRole("button", { name: "Подготовить черновик", exact: true })
  173 |     .click();
  174 |   await expect(
  175 |     page.getByLabel("Сумма продажи, ₸", { exact: true }),
  176 |   ).toHaveValue("1200");
  177 |   await expect(page.getByLabel("Получено, ₸", { exact: true })).toHaveValue(
  178 |     "1200",
  179 |   );
  180 |   expect(sql().operations).toHaveLength(3); // Draft alone never writes money.
  181 |   await page
  182 |     .getByRole("button", { name: "Подтвердить запись", exact: true })
  183 |     .click();
  184 |   await saved(page);
  185 |   expect(sql()).toMatchObject({
  186 |     sales: 420000,
  187 |     receipts: 220000,
  188 |     debt: 200000,
  189 |   });
  190 |
  191 |   await navigateSeller(page, "analytics");
  192 |   await expect(
  193 |     page.locator(".analytics-period-summary .assistant-source"),
  194 |   ).toHaveText("По данным сервера");
  195 |   await page
  196 |     .getByRole("button", { name: "Спросить Qadam", exact: true })
  197 |     .click();
  198 |   const dialog = page.getByRole("dialog");
  199 |   await dialog.locator(".assistant-suggestions button").first().click();
  200 |   await expect(dialog.locator(".assistant-result")).toContainText("2 000 ₸");
  201 |   await expect(dialog.locator(".assistant-reminder")).toContainText(
  202 |     "QA Stage6 клиент",
  203 |   );
  204 |   expect(sql().operations).toHaveLength(4);
  205 |   await mkdir(evidence, { recursive: true });
  206 |   await page.screenshot({
  207 |     path: `${evidence}/assistant-sql-ru-1280.png`,
  208 |     fullPage: true,
  209 |   });
  210 |   await page.keyboard.press("Escape");
  211 |
  212 |   await navigateSeller(page, "research");
  213 |   await expect(page.locator("#forecast")).toContainText(
  214 |     "Прогноз пока недоступен",
  215 |   );
  216 |   await expect(page.locator("#risk")).toContainText("2 000 ₸");
  217 |   await page
  218 |     .getByRole("link", { name: "Проверить открытые продажи", exact: true })
  219 |     .click();
  220 |   await expect(page).toHaveURL(new RegExp(`customer_id=${created.id}`));
  221 |   await expect(page.locator(".debt-total")).toContainText("2 000 ₸");
  222 |   await expect(page.locator(".seller-secondary-nav")).not.toHaveAttribute(
  223 |     "open",
  224 |   );
  225 |   await navigateSeller(page, "research");
  226 |   const feedback = "Synthetic Stage6 workflow — not a participant response";
  227 |   await page.getByLabel(/Что улучшить первым/).fill(feedback);
  228 |   await page.getByLabel(/Согласен на описанную/).check();
  229 |   await page
  230 |     .getByRole("button", { name: "Отправить отзыв", exact: true })
  231 |     .click();
  232 |   await expect(page.getByText(/Ответ сохранён сервером/)).toBeVisible();
  233 |   expect(sql().feedback).toBe(1);
> 234 |   await page.reload();
      |              ^ Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
  235 |   await expect(page.getByLabel("Торговая точка")).toHaveValue(info.empty);
  236 |   await page.getByText("Мои сохранённые ответы", { exact: true }).click();
  237 |   await page
  238 |     .getByRole("button", { name: "Загрузить мои ответы", exact: true })
  239 |     .click();
  240 |   await expect(page.locator("#feedback li")).toContainText(feedback);
  241 |   await page.screenshot({
  242 |     path: `${evidence}/feedback-sql-ru-1280.png`,
  243 |     fullPage: true,
  244 |   });
  245 |   await page.getByRole("button", { name: "Выйти", exact: true }).click();
  246 |   await login(page, "b");
  247 |   await expect(page.getByLabel("Торговая точка")).not.toHaveValue(info.empty);
  248 |   await navigateSeller(page, "research");
  249 |   await expect(page.getByText(feedback, { exact: true })).toHaveCount(0);
  250 |   await page.getByRole("button", { name: "Выйти", exact: true }).click();
  251 |   await expect(page).toHaveURL(/\/login$/);
  252 |   await writeFile(
  253 |     `${evidence}/../workflow-sql.json`,
  254 |     JSON.stringify(sql(), null, 2) + "\n",
  255 |   );
  256 | });
  257 |
  258 | test("structured assistant uses current SQL facts, RU/KZ and fallback without financial writes", async ({
  259 |   page,
  260 |   request,
  261 | }) => {
  262 |   const info = await (await request.get(`${api}/__qa/info`)).json();
  263 |   const token = await login(page);
  264 |   const headers = { Authorization: `Bearer ${token}` };
  265 |   const before = sql();
  266 |   for (const locale of ["ru", "kk"]) {
  267 |     const response = await request.post(
  268 |       `${api}/api/v1/businesses/${info.business}/assistant`,
  269 |       {
  270 |         headers,
  271 |         data: { question: "Кто должен?", days: 30, locale, ai: true },
  272 |       },
  273 |     );
  274 |     expect(response.status()).toBe(200);
  275 |     const body = await response.json();
  276 |     expect(body.source).toBe("ai"); // Offline double; actual Stage 1 binds/render values.
  277 |     expect(body.answer).toContain("400 ₸");
  278 |     expect(
  279 |       body.actions.find((a: { kind: string }) => a.kind === "reminder_draft")
  280 |         .customer_id,
  281 |     ).toBe(info.customer);
  282 |     for (const question of ["QA malformed", "QA unknown metric"]) {
  283 |       const failed = await request.post(
  284 |         `${api}/api/v1/businesses/${info.business}/assistant`,
  285 |         { headers, data: { question, locale, ai: true } },
  286 |       );
  287 |       expect((await failed.json()).source).toBe("fallback");
  288 |     }
  289 |   }
  290 |   const counts = await (await request.get(`${api}/__qa/integration`)).json();
  291 |   const facts = await request.post(
  292 |     `${api}/api/v1/businesses/${info.business}/assistant`,
  293 |     { headers, data: { question: "Итог", ai: false } },
  294 |   );
  295 |   expect((await facts.json()).source).toBe("facts");
  296 |   expect(
  297 |     (await (await request.get(`${api}/__qa/integration`)).json()).assistant,
  298 |   ).toBe(counts.assistant);
  299 |   const foreign = await request.post(
  300 |     `${api}/api/v1/businesses/${info.other}/assistant`,
  301 |     { headers, data: { question: "Чужая точка", ai: true } },
  302 |   );
  303 |   expect(foreign.status()).toBe(404);
  304 |   expect(
  305 |     (await (await request.get(`${api}/__qa/integration`)).json()).assistant,
  306 |   ).toBe(counts.assistant);
  307 |   expect(sql()).toEqual(before);
  308 | });
  309 |
  310 | test("combined SQL research remains readable on mobile and desktop in RU/KZ", async ({
  311 |   page,
  312 |   request,
  313 | }) => {
  314 |   const info = await (await request.get(`${api}/__qa/info`)).json();
  315 |   const before = sql().all_business_ledger_sha256;
  316 |   await login(page);
  317 |   await page.getByLabel("Торговая точка").selectOption(info.business);
  318 |   await navigateSeller(page, "research");
  319 |   for (const width of [360, 1440]) {
  320 |     await page.setViewportSize({ width, height: 960 });
  321 |     for (const locale of ["ru", "kk"]) {
  322 |       await page
  323 |         .getByRole("button", {
  324 |           name: locale === "ru" ? "RU" : "KZ",
  325 |           exact: true,
  326 |         })
  327 |         .click();
  328 |       await expect(page.locator("#risk")).toContainText(
  329 |         locale === "ru"
  330 |           ? "Правила, не обученная модель."
  331 |           : "оқытылған модель емес",
  332 |       );
  333 |       await expect(
  334 |         page.locator(".research-risk-list li").first(),
```
