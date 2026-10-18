import { expect, test, type Page, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { login, mockServices, qaIds } from "./qa-fixtures";
import { enterDemo, navigateSeller } from "./helpers";

async function assertLink(link: Locator) {
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  const rect = await link.boundingBox();
  expect(rect!.height).toBeGreaterThanOrEqual(44);
  expect(rect!.width).toBeGreaterThanOrEqual(44);
  await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
}
async function setup(page: Page) {
  const service = await mockServices(page);
  const calls: string[] = [];
  await page.route("**/api/v1/businesses/*/summary?*", (route) =>
    route.fulfill({
      json: {
        sales_minor: 300000,
        receipts_minor: 150000,
        outstanding_minor: 150000,
        new_inquiries_count: 0,
      },
    }),
  );
  await page.route("**/api/v1/businesses/*/operations?*", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({
      json: {
        items: [
          {
            id: "30000000-0000-4000-8000-000000000001",
            customer_id: qaIds.customer,
            description: "Учебная продажа",
            total_minor: 300000,
            received_minor: 100000,
            balance_minor: 150000,
            created_at: "2026-10-18T05:00:00Z",
          },
        ],
        next_cursor: null,
      },
    });
  });
  await page.route("**/api/v1/businesses/*/customers?*", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({
      json: {
        items: [
          {
            id: qaIds.customer,
            business_id: qaIds.shopA,
            display_name: "Асқар",
            note: "Учебный клиент",
            contact: "+7 (701) 123-45-67",
            balance_minor: 150000,
          },
        ],
        next_cursor: null,
      },
    });
  });
  await page.route("**/api/v1/businesses/*/assistant", (route) => {
    const body = route.request().postDataJSON();
    calls.push(body.question);
    return route.fulfill({
      json: {
        business_id: qaIds.shopA,
        days: body.days,
        locale: body.locale,
        timezone: "Asia/Almaty",
        currency: "KZT",
        source: "facts",
        as_of: "2026-10-18T05:00:00Z",
        answer: body.locale === "ru" ? "Учебный ответ" : "Оқу жауабы",
        facts: [
          {
            key: "debtor",
            label: "Асқар",
            customer_id: qaIds.customer,
            value_minor: 150000,
            count: null,
          },
        ],
        actions: [
          {
            kind: "reminder_draft",
            customer_id: qaIds.customer,
            text:
              body.locale === "ru"
                ? "Асқар, здравствуйте! Остаток 1 500 ₸. Спасибо!"
                : "Асқар, сәлеметсіз бе! Қалдық — 1 500 ₸. Рақмет!",
          },
        ],
      },
    });
  });
  await login(page);
  return { service, calls };
}
for (const locale of ["ru", "kk"] as const)
  for (const width of [360, 390, 1440]) {
    test(`debts and draft links, no sending: ${locale} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const { service, calls } = await setup(page);
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await navigateSeller(page, "debts");
      const debt = page.getByRole("link", {
        name:
          locale === "ru"
            ? "Напомнить в WhatsApp"
            : "WhatsApp арқылы еске салу",
      });
      await expect(debt).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/77011234567\?text=/,
      );
      const url = new URL((await debt.getAttribute("href"))!);
      expect(url.searchParams.get("text")).toContain("Асқар");
      expect(url.searchParams.get("text")).toContain("1 500 ₸");
      expect(url.searchParams.get("text")).toContain("QA MART");
      expect(url.searchParams.get("text")).not.toContain("9 000");
      await assertLink(debt);
      expect(calls).toHaveLength(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const directory = path.resolve(
        "../../docs/screenshots/whatsapp-reminder",
      );
      if (locale === "ru" && width === 390) {
        await mkdir(directory, { recursive: true });
        await page.screenshot({
          path: path.join(directory, "debts-ru-390.png"),
          fullPage: true,
        });
      }
      await navigateSeller(page, "");
      await page
        .getByRole("button", {
          name: locale === "ru" ? /Спросите Qadam/ : /Qadam-нан сұраңыз/,
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", {
          name:
            locale === "ru"
              ? "Напиши напоминание о долге"
              : "Қарыз туралы еске салу мәтінін жаз",
        })
        .click();
      const send = dialog.getByRole("link", {
        name: locale === "ru" ? "Отправить в WhatsApp" : "WhatsApp-қа жіберу",
      });
      await expect(send).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/77011234567\?text=/,
      );
      expect(
        new URL((await send.getAttribute("href"))!).searchParams.get("text"),
      ).toBe(await dialog.locator(".assistant-reminder > p").innerText());
      await assertLink(send);
      await expect(
        dialog.getByText(
          locale === "ru"
            ? "Сообщение отправляете вы сами из WhatsApp"
            : "Хабарды WhatsApp-тан өзіңіз жібересіз",
          { exact: true },
        ),
      ).toBeVisible();
      expect(calls).toHaveLength(1); // Synthetic response only.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (locale === "ru" && width === 390)
        await page.screenshot({
          path: path.join(directory, "draft-ru-390.png"),
          fullPage: true,
        });
      expect(
        service.calls.filter(
          (c) =>
            c.method === "POST" && /operations|repayments|drafts/.test(c.path),
        ),
      ).toEqual([]);
      expect(service.unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
for (const locale of ["ru", "kk"] as const)
  test(`Demo links require no API or AI: ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const api: string[] = [];
    await page.route("**/api/v1/**", (route) => {
      api.push(route.request().url());
      return route.abort();
    });
    await enterDemo(page);
    if (locale === "kk")
      await page.getByRole("button", { name: "KZ", exact: true }).click();
    await navigateSeller(page, "debts");
    const links = page.getByRole("link", {
      name:
        locale === "ru" ? "Напомнить в WhatsApp" : "WhatsApp арқылы еске салу",
    });
    await expect(links).toHaveCount(3);
    await expect(links.first()).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/\?text=/,
    );
    await navigateSeller(page, "");
    await page
      .getByRole("button", {
        name: locale === "ru" ? /Спросите Qadam/ : /Qadam-нан сұраңыз/,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", {
        name:
          locale === "ru"
            ? "Напиши напоминание о долге"
            : "Қарыз туралы еске салу мәтінін жаз",
      })
      .click();
    await expect(
      dialog.getByRole("link", {
        name: locale === "ru" ? "Отправить в WhatsApp" : "WhatsApp-қа жіберу",
      }),
    ).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    expect(api).toEqual([]);
  });
