import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { login, mockServices } from "./qa-fixtures";
import { enterDemo, navigateSeller } from "./helpers";
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
async function prepare(page: Page) {
  const services = await mockServices(page);
  const state = {
    status: 200,
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
  await navigateSeller(page, "analytics");
  await expect(page.locator(".assistant")).toBeVisible();
  return { state, services };
}

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`assistant and analytics ${locale} ${width}: keyboard, clipboard and screenshot`, async ({
      page,
      context,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const { state, services } = await prepare(page);
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      expect(state.calls).toHaveLength(0);
      await expect(
        page.locator(".analytics-main-kpis .analytics-kpi:visible"),
      ).toHaveCount(3);
      await expect(page.locator(".analytics-details")).not.toHaveAttribute(
        "open",
        "",
      );
      const explain = page.getByRole("button", {
        name:
          locale === "ru"
            ? "Объяснить мои цифры"
            : "Көрсеткіштерімді түсіндіру",
      });
      await explain.focus();
      await explain.press("Enter");
      await expect(page.locator(".assistant-result")).toBeVisible();
      expect(state.calls).toEqual([
        {
          question:
            locale === "ru"
              ? "Кратко подведи итог периода"
              : "Кезеңнің қысқаша қорытындысын жаса",
          locale,
          days: 7,
        },
      ]);
      await page
        .getByRole("button", {
          name: locale === "ru" ? "Скопировать" : "Көшіру",
          exact: true,
        })
        .click();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).toContain("1 500 ₸");
      await expect(page.locator(".assistant-debtors li a")).toHaveAttribute(
        "href",
        /customer_id=/,
      );
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      const directory = path.resolve("../../docs/screenshots/ai-assistant");
      await mkdir(directory, { recursive: true });
      await page.evaluate(async () => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        window.scrollTo(0, 0);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
      await page.screenshot({
        path: path.join(directory, `${locale}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.locator(".assistant-questions > summary").click();
      const question = page.getByLabel(
        locale === "ru" ? "Ваш вопрос" : "Сұрағыңыз",
        { exact: true },
      );
      await question.fill("?");
      const targets = await page
        .locator(
          ".assistant button:visible, .assistant textarea:visible, .assistant summary:visible",
        )
        .evaluateAll((elements) =>
          elements.map((el) => el.getBoundingClientRect().height),
        );
      expect(targets.every((height) => height >= 44)).toBe(true);
      await page.locator(".analytics-details > summary").focus();
      await page.locator(".analytics-details > summary").press("Enter");
      await expect(page.locator(".analytics-hourly-bars")).toBeVisible();
      await page.locator(".analytics-period-switch button").nth(1).click();
      await expect(page.locator(".assistant-result")).toHaveCount(0);
      await expect(page.locator(".analytics-details")).not.toHaveAttribute(
        "open",
        "",
      );
      await expect(page.locator(".analytics-daily-bars button")).toHaveCount(
        30,
      );
      await page.setViewportSize({ width: 360, height: 844 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(360);
      expect(state.calls).toHaveLength(1);
      expect(services.unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test("fallback, explicit retry and daily limit remain distinguishable", async ({
  page,
}) => {
  const { state } = await prepare(page);
  state.status = 503;
  await page.getByRole("button", { name: "Объяснить мои цифры" }).click();
  await expect(page.locator(".assistant [role=alert]")).toBeVisible();
  expect(state.calls).toHaveLength(1);
  state.status = 200;
  state.source = "fallback";
  await page
    .locator(".assistant")
    .getByRole("button", { name: "Повторить" })
    .click();
  await expect(page.locator(".assistant-source")).toHaveText(
    "AI недоступен, показаны данные сервера",
  );
  state.status = 429;
  await page.getByRole("button", { name: "Объяснить мои цифры" }).click();
  await expect(page.locator(".assistant [role=alert]")).toContainText(
    "Лимит вопросов на сегодня",
  );
  expect(state.calls).toHaveLength(3);
  await expect(
    page.getByRole("button", { name: "Объяснить мои цифры" }),
  ).toBeDisabled();
});

test("demo asks no API and identifies the fixed teaching example", async ({
  page,
}) => {
  const apiCalls: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname.startsWith("/api/")
    ) {
      apiCalls.push(url.pathname);
      return route.abort();
    }
    await route.continue();
  });
  await enterDemo(page);
  await navigateSeller(page, "analytics");
  await page.getByRole("button", { name: "Объяснить мои цифры" }).click();
  await expect(page.locator(".assistant-source")).toHaveText(
    "Пример ответа в демо, без AI",
  );
  expect(apiCalls).toEqual([]);
});
