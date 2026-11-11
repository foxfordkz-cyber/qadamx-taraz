import { expect, test } from "@playwright/test";
import { login, mockServices } from "./qa-fixtures";
import { navigateSeller } from "./helpers";

for (const kz of [false, true]) {
  test(`AI Retry-After keeps text/manual entry and sends no automatic retry (${kz ? "KZ" : "RU"})`, async ({
    page,
  }, info) => {
    const services = await mockServices(page);
    let attempts = 0;
    await page.route("**/api/v1/businesses/*/drafts", (route) => {
      attempts++;
      return route.fulfill({
        status: 503,
        headers: { "Retry-After": "30" },
        json: {
          error: {
            code: "AI_QUOTA_EXCEEDED",
            message: "synthetic private provider details",
            fields: {},
          },
        },
      });
    });
    await page.setViewportSize({ width: kz ? 390 : 1440, height: 900 });
    await login(page);
    await navigateSeller(page, "sale");
    if (kz) await page.getByRole("button", { name: "KZ", exact: true }).click();
    const text = page.getByLabel(kz ? "AI үшін мәтін" : "Текст для AI", {
      exact: true,
    });
    await text.fill("Айжанға 3000 теңгеге саттым, 1000 төледі");
    await page.clock.install();
    await page
      .getByRole("button", {
        name: kz ? "Жазбаны дайындау" : "Подготовить черновик",
        exact: true,
      })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      kz ? "Нақты себеп расталмаған" : "Точная причина не подтверждена",
    );
    const retry = page.getByRole("button", {
      name: kz ? "Қайталау" : "Повторить",
      exact: true,
    });
    await expect(retry).toBeDisabled();
    await expect(text).toHaveValue("Айжанға 3000 теңгеге саттым, 1000 төледі");
    await expect(
      page.getByRole("button", {
        name: kz ? "Қолмен толтыру" : "Заполнить вручную",
        exact: true,
      }),
    ).toBeEnabled();
    await page.screenshot({
      path: info.outputPath(
        `ai-rate-limit-${kz ? "kz-mobile" : "ru-desktop"}.png`,
      ),
      fullPage: true,
    });
    await page.clock.fastForward(31_000);
    await expect(retry).toBeEnabled();
    expect(attempts).toBe(1);
    expect(
      services.calls.filter(
        (c) => c.method === "POST" && c.path.endsWith("/operations"),
      ),
    ).toHaveLength(0);
    await retry.click();
    await expect.poll(() => attempts).toBe(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(services.unexpected).toEqual([]);
  });
}
