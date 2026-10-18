import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { prepareAssistant as prepare } from "./assistant-fixtures";

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`assistant panel ${locale} ${width}: keyboard, clipboard and focus`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const { state, services } = await prepare(page);
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      const summary = page.locator(".analytics-period-summary");
      await expect(summary.locator(".assistant-source")).toHaveText(
        locale === "ru" ? "По данным сервера" : "Сервер деректері бойынша",
      );
      expect(state.calls.every((call) => call.ai === false)).toBe(true);
      await expect(page.locator(".analytics-details")).not.toHaveAttribute(
        "open",
        "",
      );
      await expect(page.locator(".assistant-reminder")).toHaveCount(0);
      const open = page.getByRole("button", {
        name: locale === "ru" ? "Спросить Qadam" : "Qadam-нан сұрау",
        exact: true,
      });
      await open.focus();
      await open.press("Enter");
      const dialog = page.getByRole("dialog");
      expect(state.calls.filter((call) => call.ai)).toHaveLength(0);
      await dialog.locator(".assistant-suggestions button").nth(1).click();
      const result = dialog.locator(".assistant-result");
      await expect(result).toBeVisible();
      expect(state.calls.filter((call) => call.ai)).toEqual([
        {
          question: locale === "ru" ? "Как прошла неделя?" : "Апта қалай өтті?",
          locale,
          days: 7,
          ai: true,
        },
      ]);
      if (width === 390) await expect(result).toBeFocused();
      await dialog
        .getByRole("button", {
          name: locale === "ru" ? "Скопировать" : "Көшіру",
          exact: true,
        })
        .click();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).toContain("1 500 ₸");
      const targets = await dialog
        .locator("button:visible, textarea:visible")
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      expect(targets.every((height) => height >= 44)).toBe(true);
      const directory = path.resolve(
        "../../docs/screenshots/analytics-redesign",
      );
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: path.join(directory, `panel-${locale}-${width}.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(open).toBeFocused();
      await page.locator(".analytics-details > summary").click();
      await expect(page.locator(".analytics-hourly-bars")).toBeVisible();
      await page.locator(".analytics-period-switch button").nth(1).click();
      await expect(page.locator(".analytics-daily-bars button")).toHaveCount(
        30,
      );
      await expect(page.locator(".analytics-details")).not.toHaveAttribute(
        "open",
        "",
      );
      expect(state.calls.at(-1)).toMatchObject({ days: 30, locale, ai: false });
      expect(state.calls.filter((call) => call.ai)).toHaveLength(1);
      expect(services.unexpected).toEqual([]);
    });
  }
}

test("summary fallback, explicit retry and daily limit remain distinguishable", async ({
  page,
}) => {
  const { state } = await prepare(page);
  const summary = page.locator(".analytics-period-summary");
  state.status = 503;
  await page.getByRole("button", { name: "Объяснить с AI" }).click();
  await expect(summary.locator("[role=alert]")).toBeVisible();
  state.status = 200;
  state.source = "fallback";
  await summary.getByRole("button", { name: "Повторить" }).click();
  await expect(summary.locator(".assistant-source")).toHaveText(
    "AI недоступен, показаны данные сервера",
  );
  state.status = 429;
  await page.getByRole("button", { name: "Объяснить с AI" }).click();
  await expect(summary.locator("[role=alert]")).toContainText(
    "Лимит вопросов на сегодня",
  );
  await expect(
    page.getByRole("button", { name: "Объяснить с AI" }),
  ).toBeDisabled();
  expect(state.calls.filter((call) => call.ai)).toHaveLength(3);
});

test("demo summary and panel never call the API", async ({ page }) => {
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
  await expect(
    page.locator(".analytics-period-summary .assistant-source"),
  ).toHaveText("Пример ответа в демо, без AI");
  await page.getByRole("button", { name: "Объяснить с AI" }).click();
  await expect(page.locator(".analytics-period-answer")).toContainText(
    "74 000",
  );
  await page.getByRole("button", { name: "Спросить Qadam" }).click();
  await page
    .getByRole("dialog")
    .locator(".assistant-suggestions button")
    .first()
    .click();
  await expect(
    page.getByRole("dialog").locator(".assistant-source"),
  ).toHaveText("Пример ответа в демо, без AI");
  expect(apiCalls).toEqual([]);
});
