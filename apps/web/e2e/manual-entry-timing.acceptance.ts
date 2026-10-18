import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import type { components } from "../src/shared/api/generated";
import { login, mockServices, qaIds } from "./qa-fixtures";

type Schemas = components["schemas"];
const origin = "http://127.0.0.1:4287";
const createdAt = "2026-10-18T06:00:00Z";
const sale1 = "30000000-0000-4000-8000-000000000001";
const scenarios = [
  {
    n: 1,
    language: "KZ",
    locale: "kk",
    description: "Асқарға үш мың теңгеге тауар бердім, мыңын төледі",
    total: 300000,
    received: 100000,
    balance: 200000,
  },
  {
    n: 2,
    language: "RU",
    locale: "ru",
    description: "Продал Айгуль платье за 4500, получил 2000",
    total: 450000,
    received: 200000,
    balance: 250000,
  },
  {
    n: 3,
    language: "RU",
    locale: "ru",
    description: "Продажа 1200, оплатили сразу полностью",
    total: 120000,
    received: 120000,
    balance: 0,
  },
  {
    n: 4,
    language: "KZ",
    locale: "kk",
    description: "Асқар тағы бес жүз теңге қайтарды",
    total: 0,
    received: 50000,
    balance: 150000,
  },
  {
    n: 5,
    language: "RU/KZ",
    locale: "ru",
    description: "Ерланға екі мың теңгеге сатым, остальное потом",
    total: 200000,
    received: 70000,
    balance: 130000,
  },
];
// Fixed response snapshots, not an implementation of backend financial rules.
const snapshots = [
  [0, 0, 0],
  [300000, 100000, 200000],
  [750000, 300000, 450000],
  [870000, 420000, 450000],
  [870000, 470000, 400000],
  [1070000, 540000, 530000],
];
const labels = {
  ru: {
    manual: "Заполнить вручную",
    kind: "Тип операции",
    description: "Описание",
    total: "Сумма продажи, ₸",
    received: "Получено, ₸",
    customer: "Выбрать клиента",
    open: "Неоплаченная продажа",
    amount: "Доплата, ₸",
    confirm: "Подтвердить запись",
    success: "Запись сохранена сервером",
  },
  kk: {
    manual: "Қолмен толтыру",
    kind: "Операция түрі",
    description: "Сипаттама",
    total: "Сатылым сомасы, ₸",
    received: "Алынған ақша, ₸",
    customer: "Клиентті таңдау",
    open: "Ашық сатылым",
    amount: "Төлем сомасы, ₸",
    confirm: "Жазбаны растау",
    success: "Сервер жазбаны сақтады",
  },
};

test("Automated Playwright Timing — five synthetic manual scenarios", async ({
  page,
  browser,
}, testInfo) => {
  const services = await mockServices(page);
  const posts: { scenario: number; body: unknown; key: string }[] = [];
  const operations: Schemas["Operation"][] = [];
  let stage = 0;
  let current = scenarios[0];
  await page.route("**/api/v1/businesses/*/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const resource = url.pathname.split("/")[5];
    if (!["operations", "summary"].includes(resource)) return route.fallback();
    // Fail closed: never forward a write to a real host or backend.
    expect(url.origin).toBe(origin);
    expect(url.pathname.split("/")[4]).toBe(qaIds.shopA);
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (req.method() === "POST") {
      expect(resource).toBe("operations");
      const body = req.postDataJSON();
      const key = req.headers()["idempotency-key"];
      expect(key).toMatch(/^[\da-f-]{36}$/i);
      expect(posts.some((p) => p.key === key)).toBe(false);
      posts.push({ scenario: current.n, body, key });
      if (current.n === 4) {
        expect(operations.some((op) => op.id === sale1)).toBe(true);
        expect(body).toEqual({
          kind: "repayment",
          draft_id: null,
          description: current.description,
          sale_id: sale1,
          amount_minor: 50000,
        });
      } else {
        expect(body).toEqual({
          kind: "sale",
          draft_id: null,
          description: current.description,
          customer_id: current.balance > 0 ? qaIds.customer : null,
          total_minor: current.total,
          received_minor: current.received,
        });
      }
      const id = `30000000-0000-4000-8000-${String(current.n).padStart(12, "0")}`;
      const operation: Schemas["Operation"] = {
        id,
        business_id: qaIds.shopA,
        customer_id: current.balance > 0 ? qaIds.customer : null,
        sale_id: current.n === 4 ? sale1 : id,
        kind: current.n === 4 ? "repayment" : "sale",
        sales_delta_minor: current.total,
        receipts_delta_minor: current.received,
        reversal_of: null,
        description: current.description,
        created_at: createdAt,
        created_by: qaIds.a,
      };
      operations.push(operation);
      stage = current.n;
      return send(
        {
          operation,
          sale_balance_minor: current.balance,
          customer_balance_minor: current.balance,
          created_at: createdAt,
        } satisfies Schemas["OperationResponse"],
        201,
      );
    }
    expect(req.method()).toBe("GET");
    if (resource === "summary")
      return send({
        date: url.searchParams.get("date") ?? "2026-10-18",
        timezone: "Asia/Almaty",
        currency: "KZT",
        sales_minor: snapshots[stage][0],
        receipts_minor: snapshots[stage][1],
        outstanding_minor: snapshots[stage][2],
        new_inquiries_count: 0,
      } satisfies Schemas["SummaryResponse"]);
    if (url.searchParams.get("outstanding_only") === "true")
      return send({
        items: operations.some((op) => op.id === sale1)
          ? [
              {
                id: sale1,
                customer_id: qaIds.customer,
                description: scenarios[0].description,
                total_minor: 300000,
                received_minor: stage >= 4 ? 150000 : 100000,
                balance_minor: stage >= 4 ? 150000 : 200000,
                created_at: createdAt,
              } satisfies Schemas["OpenSale"],
            ]
          : [],
        next_cursor: null,
      });
    return send({ items: operations, next_cursor: null });
  });
  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[:.]/g, "-");
  const evidence = fileURLToPath(
    new URL("../../../docs/qa/evidence/voice-20261018/", import.meta.url),
  );
  mkdirSync(evidence, { recursive: true });
  const file = `${evidence}automated-timing-${runId}.json`;
  const results: {
    n: number;
    language: string;
    status: string;
    seconds: number | null;
    elapsedUntilFailureSeconds?: number;
    error?: string;
    startedAt?: string;
    syntheticPosts: number;
    paymentClarifiedMinor?: number;
  }[] = [];
  const persist = () =>
    writeFileSync(
      file,
      JSON.stringify(
        {
          classification:
            "Automated Playwright Timing — synthetic Auth/API; NOT human speed or live voice",
          startedAt,
          sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          browser: browser.version(),
          node: process.version,
          os: process.platform,
          viewport: testInfo.project.use.viewport,
          retries: 0,
          timer:
            "process.hrtime.bigint; immediately before Manual click to asserted saved UI after verified synthetic POST",
          realFinancialPosts: 0,
          paidAiRequests: 0,
          externalRequestsBlocked: services.unexpected,
          results,
        },
        null,
        2,
      ),
    );
  await login(page);
  for (const scenario of scenarios) {
    current = scenario;
    let tick: bigint | undefined;
    const before = posts.length;
    const result: (typeof results)[number] = {
      n: scenario.n,
      language: scenario.language,
      status: "NOT_RUN",
      seconds: null,
      syntheticPosts: 0,
    };
    results.push(result);
    try {
      // Navigation/login/language selection are setup, excluded consistently.
      await page.goto("/seller/sale");
      await expect(page.locator(".app-shell")).toBeVisible();
      await page
        .getByRole("button", {
          name: scenario.locale === "kk" ? "KZ" : "RU",
          exact: true,
        })
        .click();
      const l = labels[scenario.locale as "kk" | "ru"];
      const manual = page.getByRole("button", { name: l.manual, exact: true });
      await expect(manual).toBeEnabled();
      await expect(page.getByLabel(l.description, { exact: true })).toHaveValue(
        "",
      );
      result.startedAt = new Date().toISOString();
      tick = process.hrtime.bigint();
      await manual.click();
      await page
        .getByLabel(l.description, { exact: true })
        .fill(scenario.description);
      if (scenario.n === 4) {
        await page
          .getByLabel(l.kind, { exact: true })
          .selectOption("repayment");
        await page.getByLabel(l.open, { exact: true }).selectOption(sale1);
        await page.getByLabel(l.amount, { exact: true }).fill("500");
      } else {
        await page
          .getByLabel(l.total, { exact: true })
          .fill(String(scenario.total / 100));
        if (scenario.n === 5) {
          await expect(
            page.getByLabel(l.received, { exact: true }),
          ).toHaveValue("");
          await page
            .getByRole("button", { name: l.confirm, exact: true })
            .click();
          await expect(
            page.getByText(
              "Заполните сумму, оплату и клиента при долге; для погашения выберите продажу и допустимую сумму.",
              { exact: true },
            ),
          ).toBeVisible();
          expect(posts).toHaveLength(before);
          await expect(
            page.getByLabel(l.received, { exact: true }),
          ).toHaveValue("");
          result.paymentClarifiedMinor = 70000; // Explicit synthetic answer, never guessed zero.
        }
        await page
          .getByLabel(l.received, { exact: true })
          .fill(String(scenario.received / 100));
        if (scenario.balance > 0) {
          await page
            .getByRole("button", { name: l.customer, exact: true })
            .click();
          await page
            .getByRole("dialog")
            .getByRole("button", { name: /QA Клиент A/ })
            .click();
        }
      }
      await page.getByRole("button", { name: l.confirm, exact: true }).click();
      await expect(
        page.getByRole("status").filter({ hasText: l.success }),
      ).toBeVisible();
      expect(posts).toHaveLength(before + 1);
      expect(posts.at(-1)?.scenario).toBe(scenario.n);
      result.seconds = Number(process.hrtime.bigint() - tick) / 1e9;
      result.status = "PASS";
    } catch (error) {
      result.status = "FAIL";
      if (tick !== undefined)
        result.elapsedUntilFailureSeconds =
          Number(process.hrtime.bigint() - tick) / 1e9;
      result.error = String(error)
        .replace(/\x1b\[[0-9;]*m/g, "")
        .slice(0, 2500);
      await page
        .screenshot({
          path: testInfo.outputPath(`synthetic-failure-${scenario.n}.png`),
          fullPage: true,
        })
        .catch(() => {});
    } finally {
      result.syntheticPosts = posts.length - before;
      persist();
    }
  }
  await testInfo.attach("automated-timing-json", {
    path: file,
    contentType: "application/json",
  });
  expect(
    services.calls.filter((c) => /\/(drafts|assistant)$/.test(c.path)),
  ).toEqual([]);
  expect(services.unexpected).toEqual([]);
  expect(
    results.filter((r) => r.status !== "PASS"),
    "All failed attempts are retained in JSON; no automatic retry",
  ).toEqual([]);
});
