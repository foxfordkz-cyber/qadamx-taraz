import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login, mockServices } from "./qa-fixtures";
import { navigateSeller } from "./helpers";
import {
  makeDemoAnalyticsSnapshot,
  DEMO_ANALYTICS_BUSINESS,
} from "../src/features/seller/analytics/demo";
import type {
  AssistantRequest,
  AssistantResponse,
} from "../src/features/assistant/model";

const examples = JSON.parse(
  readFileSync(
    new URL("../../../packages/contracts/examples.json", import.meta.url),
    "utf8",
  ),
);
export async function prepareAssistant(page: Page, navigate = true) {
  const services = await mockServices(page);
  const state = {
    status: 200,
    gate: null as Promise<void> | null,
    response: {} as Partial<AssistantResponse>,
    calls: [] as AssistantRequest[],
    source: "ai" as "ai" | "fallback",
  };
  await page.route("**/api/v1/businesses/*/analytics?*", async (route) => {
    const url = new URL(route.request().url());
    const snapshot = makeDemoAnalyticsSnapshot(
      DEMO_ANALYTICS_BUSINESS,
      Number(url.searchParams.get("days")) as 7 | 30,
      "empty",
    );
    snapshot.cards = {
      sales_minor: 300000,
      receipts_minor: 150000,
      outstanding_minor: 150000,
      sales_count: 1,
      average_ticket_minor: 300000,
      debtors_count: 1,
    };
    snapshot.daily.at(-1)!.sales_minor = 300000;
    snapshot.daily.at(-1)!.receipts_minor = 150000;
    snapshot.daily.at(-1)!.sales_count = 1;
    snapshot.hourly[12].sales_count = 1;
    await route.fulfill({
      json: {
        ...snapshot,
        business_id: url.pathname.split("/").at(-2),
      },
    });
  });
  await page.route("**/api/v1/businesses/*/assistant", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const request = route.request().postDataJSON() as AssistantRequest;
    state.calls.push(request);
    const response: AssistantResponse = {
      ...structuredClone(examples.AssistantResponse),
      business_id: new URL(route.request().url()).pathname.split("/").at(-2),
      days: request.days,
      locale: request.locale,
      source: state.source,
    };
    if (request.locale === "kk") {
      response.answer =
        "Демо Асқардың қарызы — 1 500 ₸. Сыпайы еске салу мәтінін көшіріп алуға болады.";
      response.facts = [
        {
          key: "debtor",
          label: "Демо Асқар",
          customer_id: response.actions[0].customer_id,
          value_minor: 150000,
        },
      ];
      response.actions[0].text =
        "Асқар, сәлеметсіз бе! 1 500 ₸ қарызыңыз туралы еске салғым келеді. Рақмет!";
    }
    Object.assign(response, state.response);
    if (state.gate) await state.gate;
    await route.fulfill({
      status: state.status,
      json:
        state.status === 200
          ? response
          : {
              error: {
                code: state.status === 429 ? "ASSISTANT_LIMIT" : "UNAVAILABLE",
              },
            },
    });
  });
  await login(page);
  if (navigate) {
    await navigateSeller(page, "analytics");
    await expect(page.locator(".assistant")).toBeVisible();
  }
  return { state, services };
}
