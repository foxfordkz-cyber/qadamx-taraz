import { expect, test } from "@playwright/test";
import { enterDemo, navigateSeller } from "./helpers";

for (const width of [360, 390, 768, 1440]) {
  test(`integrated financial forms remain read-only and within ${width}px`, async ({
    page,
  }) => {
    const backendTraffic: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        ["fetch", "xhr"].includes(request.resourceType()) &&
        /\/api\/|supabase/.test(request.url())
      )
        backendTraffic.push(`${request.method()} ${request.url()}`);
    });
    await page.setViewportSize({ width, height: 900 });
    await enterDemo(page);
    await navigateSeller(page, "sale");
    await expect(
      page.getByText("Учебный просмотр: денежная запись отключена", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Текст для AI", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Аудиофайл (до 30 секунд, 8 МБ)", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Записать голос", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Заполнить вручную", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Подтвердить запись", exact: true }),
    ).toBeDisabled();
    for (const control of await page
      .locator(
        "#main-content input, #main-content textarea, #main-content select",
      )
      .all()) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await expect(
      page.getByText("Запись сохранена сервером", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Жаңа жазба", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Жазбаны растау", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Сатылым сомасы, ₸", { exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "RU", exact: true }).click();
    for (const route of ["debts", "history", "summary"]) {
      await navigateSeller(page, route);
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.locator(".demo-banner")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByLabel("Дата (Asia/Almaty)", { exact: true })
      .fill("2026-10-15");
    await expect(
      page.getByLabel("Дата (Asia/Almaty)", { exact: true }),
    ).toHaveValue("2026-10-15");
    await expect(page.locator(".ledger-stats .card")).toHaveCount(0);
    expect(backendTraffic).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("integrated mobile menu closes on Escape and route change; shared fonts and touch controls load", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await enterDemo(page);
  const more = page.locator('.bottom-nav button[aria-haspopup="dialog"]');
  await more.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("dialog", { name: "Все разделы", exact: true });
  await expect(menu).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(
    menu.getByRole("link", { name: /Публичная витрина/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(more).toBeFocused();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await menu.getByRole("link", { name: "Мне должны", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(page).toHaveURL(/\/seller\/debts$/);
  await expect(more).toHaveClass(/is-active/);
  await more.click();
  await expect(menu).toBeVisible();
  await page.goBack();
  await expect(menu).not.toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/seller\/debts$/);
  await expect(menu).not.toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByLabel("Торговая точка", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeVisible();
  const targets = await page
    .locator(
      ".bottom-nav a, .bottom-nav button, .topbar .language-switch button",
    )
    .evaluateAll((elements) =>
      elements.map((element) => ({
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
  expect(targets).toHaveLength(7);
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  const fonts = await page.evaluate(async () => {
    const manrope = await document.fonts.load('600 16px "Manrope"', "Qadam");
    const kazakh = await document.fonts.load(
      '600 16px "Qadam Kazakh"',
      "ӘҒҚҢҰ",
    );
    return {
      manrope: manrope.length,
      kazakh: kazakh.length,
      loaded: [...manrope, ...kazakh].every((font) => font.status === "loaded"),
    };
  });
  expect(fonts).toEqual({ manrope: 1, kazakh: 2, loaded: true });
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const main = (await page.locator("#main-content").boundingBox())!;
  const header = (await page.locator(".topbar").boundingBox())!;
  expect(main.y).toBeGreaterThanOrEqual(header.y + header.height);
});
