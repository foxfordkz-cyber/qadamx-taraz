import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { enterDemo, navigateSeller } from "./helpers";
import { prepareAssistant as prepare } from "./assistant-fixtures";

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
