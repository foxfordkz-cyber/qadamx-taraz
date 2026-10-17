import { expect, test, type Page } from "@playwright/test";
import type { components } from "../src/shared/api/generated";
import { navigateSeller } from "./helpers";
import {
  customers,
  login,
  mockServices,
  newCustomer,
  qaIds,
} from "./qa-fixtures";

type Schemas = components["schemas"];
const saleId = "30000000-0000-4000-8000-000000000001";
const repaymentId = "30000000-0000-4000-8000-000000000002";
const timestamp = "2026-10-16T10:00:00Z";
const sale: Schemas["Operation"] = {
  id: saleId,
  business_id: qaIds.shopA,
  customer_id: qaIds.created,
  sale_id: saleId,
  kind: "sale",
  sales_delta_minor: 300000,
  receipts_delta_minor: 100000,
  reversal_of: null,
  description: "Synthetic acceptance sale",
  created_at: timestamp,
  created_by: qaIds.a,
};
const repayment: Schemas["Operation"] = {
  ...sale,
  id: repaymentId,
  kind: "repayment",
  sales_delta_minor: 0,
  receipts_delta_minor: 50000,
  description: "Synthetic acceptance repayment",
};
// Canned server snapshots, NOT a second financial engine or server-idempotency proof.
const snapshots = [
  { sales: 0, receipts: 0, debt: 0, operations: [] },
  { sales: 300000, receipts: 100000, debt: 200000, operations: [sale] },
  {
    sales: 300000,
    receipts: 150000,
    debt: 150000,
    operations: [sale, repayment],
  },
];
function analytics(stage: number, businessId: string, days: 7 | 30) {
  const snapshot = snapshots[stage];
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(timestamp);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const last = index === days - 1;
    return {
      date: date.toISOString().slice(0, 10),
      sales_minor: last ? snapshot.sales : 0,
      receipts_minor: last ? snapshot.receipts : 0,
      sales_count: last && stage > 0 ? 1 : 0,
      is_partial: last,
    };
  });
  return {
    business_id: businessId,
    days,
    timezone: "Asia/Almaty",
    currency: "KZT",
    as_of: timestamp,
    period_from: daily[0].date,
    period_to: "2026-10-16",
    today_incomplete: true,
    cards: {
      sales_minor: snapshot.sales,
      receipts_minor: snapshot.receipts,
      outstanding_minor: snapshot.debt,
      sales_count: stage > 0 ? 1 : 0,
      average_ticket_minor: stage > 0 ? 300000 : null,
      debtors_count: stage > 0 ? 1 : 0,
    },
    daily,
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sales_count: stage > 0 && hour === 15 ? 1 : 0,
    })),
  } satisfies Schemas["AnalyticsResponse"];
}

async function syntheticLedger(page: Page) {
  let stage = 0;
  let releaseFirst!: () => void;
  const firstResponse = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const requests: { key: string; body: string }[] = [];
  const reads: { stage: number; business: string; days: number }[] = [];
  await page.route("**/api/v1/businesses/*/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const business = url.pathname.split("/")[4];
    const resource = url.pathname.split("/")[5];
    if (!["operations", "summary", "analytics"].includes(resource))
      return route.fallback();
    expect(url.origin).toBe("http://127.0.0.1:4201");
    const authorization = request.headers().authorization;
    expect(authorization).toMatch(/^Bearer /);
    const subject = JSON.parse(
      Buffer.from(authorization.split(".")[1], "base64url").toString("utf8"),
    ) as { sub: string };
    expect(subject.sub).toBe(qaIds.a);
    expect([qaIds.shopA, qaIds.shopA2]).toContain(business);
    const current = business === qaIds.shopA ? stage : 0;
    const snapshot = snapshots[current];
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "POST") {
      expect(resource).toBe("operations");
      expect(business).toBe(qaIds.shopA);
      const key = request.headers()["idempotency-key"];
      expect(key).toMatch(/^[\da-f-]{36}$/i);
      const body = request.postData()!;
      requests.push({ key, body });
      if (requests.length <= 2) {
        expect(JSON.parse(body)).toEqual({
          kind: "sale",
          draft_id: null,
          description: sale.description,
          customer_id: qaIds.created,
          total_minor: 300000,
          received_minor: 100000,
        });
        if (requests.length === 1) {
          stage = 1; // Synthetic persistence before a lost acknowledgement.
          await firstResponse;
          return route.abort("failed");
        }
        expect(requests[1]).toEqual(requests[0]);
      } else {
        expect(requests).toHaveLength(3);
        expect(key).not.toBe(requests[0].key);
        expect(JSON.parse(body)).toEqual({
          kind: "repayment",
          draft_id: null,
          description: repayment.description,
          sale_id: saleId,
          amount_minor: 50000,
        });
        stage = 2;
      }
      return send(
        {
          operation: stage === 1 ? sale : repayment,
          sale_balance_minor: snapshots[stage].debt,
          customer_balance_minor: snapshots[stage].debt,
          created_at: timestamp,
        } satisfies Schemas["OperationResponse"],
        201,
      );
    }
    expect(request.method()).toBe("GET");
    if (resource === "analytics") {
      const days = Number(url.searchParams.get("days"));
      expect([7, 30]).toContain(days);
      reads.push({ stage: current, business, days });
      return send(analytics(current, business, days as 7 | 30));
    }
    if (resource === "summary")
      return send({
        date: url.searchParams.get("date")!,
        timezone: "Asia/Almaty",
        currency: "KZT",
        sales_minor: snapshot.sales,
        receipts_minor: snapshot.receipts,
        outstanding_minor: snapshot.debt,
        new_inquiries_count: 0,
      } satisfies Schemas["SummaryResponse"]);
    if (url.searchParams.get("outstanding_only") === "true")
      return send({
        items:
          current === 0
            ? []
            : [
                {
                  id: saleId,
                  customer_id: qaIds.created,
                  description: sale.description,
                  total_minor: 300000,
                  received_minor: snapshot.receipts,
                  balance_minor: snapshot.debt,
                  created_at: timestamp,
                } satisfies Schemas["OpenSale"],
              ],
        next_cursor: null,
      });
    return send({ items: snapshot.operations, next_cursor: null });
  });
  return { requests, reads, releaseFirst: () => releaseFirst() };
}

async function stats(page: Page, receipts: string, debt: string) {
  await expect(page.locator(".ledger-stats strong")).toHaveText([
    "3 000 ₸",
    receipts,
    debt,
    "0",
  ]);
}
async function report(page: Page, receipts: string, debt: string) {
  await expect(page.locator(".analytics-kpi-value")).toHaveText([
    "3 000 ₸",
    receipts,
    "3 000 ₸",
    debt,
  ]);
  await expect(page.locator(".analytics-hourly-bars button")).toHaveCount(24);
}

test("verified voice build preserves customer, money retry and Analytics refresh through real UI writes", async ({
  page,
}) => {
  const services = await mockServices(page);
  const ledger = await syntheticLedger(page);
  await login(page);
  await customers(page);
  const form = await newCustomer(page);
  await form
    .getByRole("button", { name: "Создать клиента", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  expect(services.created).toHaveLength(1);
  await navigateSeller(page, "analytics");
  await expect(page.locator(".analytics-kpi-value").first()).toHaveText("0 ₸");
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  await page.getByRole("button", { name: "7 дней", exact: true }).click();
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(7);
  await navigateSeller(page, "sale");
  await page.getByLabel("Описание", { exact: true }).fill(sale.description);
  await page.getByLabel("Сумма продажи, ₸", { exact: true }).fill("3000");
  await page.getByLabel("Получено, ₸", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Выбрать клиента", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /QA Новый/ })
    .click();
  // Two synchronous clicks exercise the existing useWrite lock before rerender.
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => ledger.requests.length).toBe(1);
  const retry = page.getByRole("button", {
    name: "Проверить результат тем же запросом",
    exact: true,
  });
  await expect(retry).toBeDisabled();
  ledger.releaseFirst();
  await expect(retry).toBeEnabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "Результат неизвестен" }),
  ).toBeVisible();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).not.toBeVisible();
  expect(ledger.requests).toHaveLength(1);
  await retry.click();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  expect(ledger.requests).toHaveLength(2);
  await stats(page, "1 000 ₸", "2 000 ₸");
  await navigateSeller(page, "analytics");
  await report(page, "1 000 ₸", "2 000 ₸");
  expect(ledger.reads).toContainEqual({
    stage: 1,
    business: qaIds.shopA,
    days: 7,
  });
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await report(page, "1 000 ₸", "2 000 ₸");
  expect(ledger.reads).toContainEqual({
    stage: 1,
    business: qaIds.shopA,
    days: 30,
  });
  await navigateSeller(page, "debts");
  await expect(
    page.getByText("Остаток: 2 000 ₸", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Принять оплату" }).click();
  await expect(page.getByLabel("Неоплаченная продажа")).toHaveValue(saleId);
  await page
    .getByLabel("Описание", { exact: true })
    .fill(repayment.description);
  await page.getByLabel("Доплата, ₸", { exact: true }).fill("500");
  await page
    .getByRole("button", { name: "Подтвердить запись", exact: true })
    .click();
  await expect(
    page.getByText("Запись сохранена сервером", { exact: true }),
  ).toBeVisible();
  await stats(page, "1 500 ₸", "1 500 ₸");
  await navigateSeller(page, "history");
  await expect(page.locator("main h2")).toHaveText([
    sale.description,
    repayment.description,
  ]);
  await navigateSeller(page, "summary");
  await stats(page, "1 500 ₸", "1 500 ₸");
  await navigateSeller(page, "analytics");
  await report(page, "1 500 ₸", "1 500 ₸");
  expect(ledger.reads).toContainEqual({
    stage: 2,
    business: qaIds.shopA,
    days: 7,
  });
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await report(page, "1 500 ₸", "1 500 ₸");
  await expect(page.locator(".analytics-daily-bars button")).toHaveCount(30);
  expect(ledger.reads).toContainEqual({
    stage: 2,
    business: qaIds.shopA,
    days: 30,
  });
  await expect(
    page.locator(".analytics-daily-bars button").last(),
  ).toHaveAttribute("aria-label", /3 000 ₸/);
  await page.reload();
  await report(page, "1 500 ₸", "1 500 ₸");
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".analytics-kpi-value")).toHaveText([
    "0 ₸",
    "0 ₸",
    "Нет продаж",
    "0 ₸",
  ]);
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA);
  await report(page, "1 500 ₸", "1 500 ₸");
  expect(ledger.requests).toHaveLength(3);
  expect(
    services.calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/customers"),
    ),
  ).toHaveLength(1);
  expect(services.unexpected).toEqual([]);
});
