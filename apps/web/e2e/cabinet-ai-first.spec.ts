import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { login, mockServices, qaIds } from "./qa-fixtures";
import type {
  AssistantRequest,
  AssistantResponse,
} from "../src/features/assistant/model";

// Browser rendering and Supabase SDK are real. Every identity, amount, customer
// and assistant response below is synthetic; no production services are called.
const examples = JSON.parse(
  readFileSync(
    new URL("../../../packages/contracts/examples.json", import.meta.url),
    "utf8",
  ),
);
const customerIds = [1, 2, 3, 4].map(
  (index) => `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
);
const screenshotDirectory = path.resolve(
  "../../docs/screenshots/cabinet-ai-first",
);

async function prepare(page: Page) {
  const services = await mockServices(page);
  const state = {
    calls: [] as { businessId: string; request: AssistantRequest }[],
    gate: null as Promise<void> | null,
    answer: "QA: учебный ответ по синтетическим данным, без вызова AI.",
    summaryStatus: 200,
    debtStatus: 200,
    customerStatus: 200,
    assistantStatus: 200,
    empty: false,
    aborted: 0,
  };
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname.endsWith("/assistant"))
      state.aborted += 1;
  });
  await page.route("**/api/v1/businesses/*/summary?*", async (route) => {
    await route.fulfill({
      status: state.summaryStatus,
      json:
        state.summaryStatus === 200
          ? {
              sales_minor: 300000,
              receipts_minor: 150000,
              outstanding_minor: 450000,
              new_inquiries_count: 2,
            }
          : { error: { code: "UNAVAILABLE" } },
    });
  });
  await page.route("**/api/v1/businesses/*/operations?*", async (route) => {
    const url = new URL(route.request().url());
    const businessId = url.pathname.split("/").at(-2)!;
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      status: state.debtStatus,
      json:
        state.debtStatus === 200
          ? {
              items: state.empty
                ? []
                : customerIds.map((customerId, index) => ({
                    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                    business_id: businessId,
                    customer_id: customerId,
                    description: `QA продажа ${index + 1}`,
                    total_minor: [300000, 100000, 50000, 25000][index],
                    received_minor: 0,
                    balance_minor: [300000, 100000, 50000, 25000][index],
                    created_at: `2026-10-${String(18 - index).padStart(2, "0")}T06:00:00Z`,
                  })),
              next_cursor: null,
            }
          : { error: { code: "UNAVAILABLE" } },
    });
  });
  await page.route("**/api/v1/businesses/*/customers?*", async (route) => {
    const url = new URL(route.request().url());
    const businessId = url.pathname.split("/").at(-2)!;
    const ids = url.searchParams.getAll("ids");
    await route.fulfill({
      status: state.customerStatus,
      json:
        state.customerStatus === 200
          ? {
              items: customerIds
                .map((id, index) => ({
                  id,
                  business_id: businessId,
                  display_name: `QA Клиент ${index + 1}`,
                  contact: null,
                  note: "Синтетические данные browser acceptance",
                  balance_minor: [300000, 100000, 50000, 25000][index],
                }))
                .filter((customer) => !ids.length || ids.includes(customer.id)),
              next_cursor: null,
            }
          : { error: { code: "UNAVAILABLE" } },
    });
  });
  await page.route("**/api/v1/businesses/*/assistant", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const request = route.request().postDataJSON() as AssistantRequest;
    const businessId = new URL(route.request().url()).pathname
      .split("/")
      .at(-2)!;
    state.calls.push({ businessId, request });
    if (state.assistantStatus !== 200) {
      await route.fulfill({
        status: state.assistantStatus,
        json: { error: { code: "ASSISTANT_DISABLED" } },
      });
      return;
    }
    const answer = state.answer;
    if (state.gate) await state.gate;
    const response: AssistantResponse = {
      ...structuredClone(examples.AssistantResponse),
      business_id: businessId,
      days: request.days,
      locale: request.locale,
      answer,
      facts: [
        {
          key: "debtor",
          label: "QA Клиент 1",
          customer_id: customerIds[0],
          value_minor: 300000,
        },
      ],
      actions: [
        { kind: "open_debts", customer_id: customerIds[0], text: null },
      ],
    };
    // Closing the drawer deliberately cancels the request while this test gate
    // is held. A browser-aborted route no longer accepts a response.
    await route.fulfill({ json: response }).catch(() => undefined);
  });
  await login(page);
  await expect(page.locator("#main-content h1")).toHaveText(
    "Хорошего рабочего дня!",
  );
  return { state, services };
}

async function openAssistant(page: Page, locale: "ru" | "kk" = "ru") {
  const trigger = page.getByRole("button", {
    name: locale === "ru" ? /^Спросите Qadam/ : /^Qadam-нан сұраңыз/,
    exact: true,
  });
  await trigger.click();
  const dialog = page.locator(".cabinet-assistant-panel");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeVisible();
  return { dialog, trigger };
}

async function noOverflow(page: Page, width: number) {
  try {
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(width);
  } catch (error) {
    const overflowing = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            (box.right > innerWidth + 1 ||
              element.scrollWidth > element.clientWidth + 1)
          );
        })
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          text: element.textContent?.trim().slice(0, 90),
          right: element.getBoundingClientRect().right,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        })),
    );
    console.log("Synthetic fixture overflow:", JSON.stringify(overflowing));
    throw error;
  }
  const panel = page.locator(".cabinet-assistant-panel");
  if (await panel.count()) {
    await expect
      .poll(() =>
        panel.evaluate((element) => element.scrollWidth - element.clientWidth),
      )
      .toBe(0);
  }
}

async function screenshot(page: Page, name: string) {
  await mkdir(screenshotDirectory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(screenshotDirectory, `${name}.png`),
    fullPage: false,
    animations: "disabled",
  });
}

for (const locale of ["ru", "kk"] as const) {
  for (const width of [390, 1440]) {
    test(`enabled: cabinet ${locale} ${width} — server overview, drawer and screenshot`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const { state, services } = await prepare(page);
      if (locale === "kk")
        await page.getByRole("button", { name: "KZ", exact: true }).click();
      await expect(page.locator(".cabinet-metrics > div")).toHaveCount(3);
      await expect(page.locator(".cabinet-debt-preview > li")).toHaveCount(3);
      await expect(page.locator(".cabinet-debt-preview")).toContainText(
        "QA Клиент 1",
      );
      await expect(page.locator(".cabinet-debt-preview")).not.toContainText(
        "QA Клиент 4",
      );
      await expect(page.locator(".cabinet-metrics > div").nth(0)).toContainText(
        /3\s000/,
      );
      await expect(page.locator(".cabinet-metrics > div").nth(1)).toContainText(
        /1\s500/,
      );
      await expect(page.locator(".cabinet-metrics > div").nth(2)).toContainText(
        /4\s500/,
      );
      await noOverflow(page, width);
      expect(state.calls).toHaveLength(0);
      await screenshot(page, `dashboard-${locale}-${width}`);
      if (width === 390) {
        await page.locator(".cabinet-debts").scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 800);
        await expect
          .poll(async () => {
            const debt = await page
              .locator(".cabinet-debt-preview > li")
              .last()
              .boundingBox();
            const nav = await page.locator(".bottom-nav").boundingBox();
            return (
              !!debt && !!nav && debt.y >= 0 && debt.y + debt.height <= nav.y
            );
          })
          .toBe(true);
        await screenshot(page, `debts-${locale}-${width}`);
      }

      const { dialog, trigger } = await openAssistant(page, locale);
      await noOverflow(page, width);
      expect(state.calls).toHaveLength(0);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      if (width < 600) {
        expect(box!.x).toBeLessThanOrEqual(1);
        expect(box!.width).toBeGreaterThanOrEqual(width - 1);
      } else {
        expect(box!.x).toBeGreaterThan(width / 2);
        expect(box!.x + box!.width).toBeGreaterThanOrEqual(width - 1);
      }
      await screenshot(page, `assistant-${locale}-${width}`);
      await dialog
        .getByRole("textbox")
        .fill(
          locale === "ru"
            ? "Кто мне должен больше всего?"
            : "Маған кімнің қарызы ең көп?",
        );
      await dialog
        .getByRole("button", {
          name: locale === "ru" ? "Спросить" : "Сұрау",
          exact: true,
        })
        .click();
      await expect(dialog.locator(".assistant-answer")).toHaveText(
        state.answer,
      );
      expect(state.calls).toHaveLength(1);
      expect(state.calls[0]).toMatchObject({
        businessId: qaIds.shopA,
        request: { locale, days: 7 },
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await page.setViewportSize({ width: 360, height: 740 });
      await noOverflow(page, 360);
      expect(services.unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test("enabled: keyboard remains inside panel and the voice action only focuses input", async ({
  page,
}) => {
  const { state, services } = await prepare(page);
  const { dialog, trigger } = await openAssistant(page);
  const controls = dialog.locator(
    "button:not([disabled]):visible, textarea:visible, a[href]:visible, input:visible, select:visible",
  );
  await controls.last().focus();
  await page.keyboard.press("Tab");
  await expect(controls.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(controls.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("link", { name: /Скажите о продаже/ }).click();
  await expect(page).toHaveURL(/\/seller\/sale\?entry=voice$/);
  await expect(page.locator("#qadam-record-sale")).toBeFocused();
  expect(state.calls).toEqual([]);
  expect(services.calls.filter((call) => call.path.includes("/draft"))).toEqual(
    [],
  );
});

test("enabled: close, locale and business changes discard an outstanding answer", async ({
  page,
}) => {
  const { state } = await prepare(page);
  let release!: () => void;
  state.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.answer = "QA_OLD_POINT_LATE_RESULT";
  const { dialog } = await openAssistant(page);
  await dialog
    .getByRole("button", { name: "Кто мне должен больше всего?", exact: true })
    .click();
  await expect.poll(() => state.calls.length).toBe(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => state.aborted).toBe(1);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  await page
    .getByLabel("Сауда нүктесі", { exact: true })
    .selectOption(qaIds.shopA2);
  const reopened = await openAssistant(page, "kk");
  await expect(reopened.dialog.getByRole("textbox")).toHaveValue("");
  release();
  state.gate = null;
  await expect(reopened.dialog.locator(".assistant-result")).toHaveCount(0);
  state.answer = "QA_NEW_POINT_KZ_RESULT";
  await reopened.dialog
    .getByRole("button", { name: "Маған кімнің қарызы ең көп?", exact: true })
    .click();
  await expect(reopened.dialog.locator(".assistant-answer")).toHaveText(
    state.answer,
  );
  expect(state.calls[1]).toMatchObject({
    businessId: qaIds.shopA2,
    request: { locale: "kk" },
  });
  await expect(
    page.getByText("QA_OLD_POINT_LATE_RESULT", { exact: true }),
  ).toHaveCount(0);
  await reopened.dialog
    .locator('.assistant-actions a[href*="/seller/debts"]')
    .click();
  await expect(page).toHaveURL(/\/seller\/debts\?customer_id=/);
  await expect(page.locator(".cabinet-assistant-panel")).toHaveCount(0);
});

test("enabled: language switch inside the open panel cancels its old request", async ({
  page,
}) => {
  const { state } = await prepare(page);
  let release!: () => void;
  state.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.answer = "QA_OLD_RU_RESULT";
  const { dialog } = await openAssistant(page);
  await dialog
    .getByRole("button", { name: "Кто мне должен больше всего?", exact: true })
    .click();
  await expect.poll(() => state.calls.length).toBe(1);
  await dialog.getByRole("button", { name: "KZ", exact: true }).click();
  await expect.poll(() => state.aborted).toBe(1);
  await expect(dialog.getByRole("textbox")).toHaveValue("");
  release();
  state.gate = null;
  await expect(dialog.locator(".assistant-result")).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
  state.answer = "QA_NEW_KZ_RESULT";
  await dialog
    .getByRole("button", { name: "Маған кімнің қарызы ең көп?", exact: true })
    .click();
  await expect(dialog.locator(".assistant-answer")).toHaveText(state.answer);
  expect(state.calls[1].request.locale).toBe("kk");
  await expect(page.getByText("QA_OLD_RU_RESULT", { exact: true })).toHaveCount(
    0,
  );
});

test("enabled: summary failure is not zero and missing names do not hide debts", async ({
  page,
}) => {
  const { state } = await prepare(page);
  state.summaryStatus = 503;
  state.customerStatus = 503;
  await page.reload();
  await expect(
    page.locator("#main-content [role=alert]").first(),
  ).toBeVisible();
  await expect(page.locator(".cabinet-metrics > div")).toHaveCount(0);
  await expect(page.locator(".cabinet-debt-preview > li")).toHaveCount(3);
  await expect(page.locator(".cabinet-debt-preview")).not.toContainText(
    "QA Клиент",
  );
});

test("disabled: no assistant trigger or paid call, ordinary cabinet remains usable", async ({
  page,
}) => {
  const { state, services } = await prepare(page);
  await expect(
    page.getByRole("button", { name: /^Спросите Qadam/ }),
  ).toHaveCount(0);
  await expect(page.locator(".assistant")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Скажите о продаже/ }),
  ).toBeVisible();
  await expect(page.locator(".cabinet-metrics > div")).toHaveCount(3);
  await expect(page.locator(".cabinet-debt-preview > li")).toHaveCount(3);
  expect(state.calls).toEqual([]);
  expect(services.unexpected).toEqual([]);
});

test("enabled: server-disabled assistant disappears while its message and safe focus remain", async ({
  page,
}) => {
  const { state } = await prepare(page);
  state.assistantStatus = 404;
  const { dialog } = await openAssistant(page);
  await dialog
    .getByRole("button", { name: "Кто мне должен больше всего?", exact: true })
    .click();
  await expect(dialog).toContainText("Помощник сейчас недоступен.");
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
  await dialog.getByRole("button", { name: "KZ", exact: true }).click();
  await expect(dialog).toContainText("Көмекші қазір қолжетімсіз.");
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".cabinet-ask")).toHaveCount(0);
  await expect(page.locator(".cabinet-speak")).toBeFocused();
  await page
    .getByLabel("Сауда нүктесі", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".cabinet-ask")).toBeVisible();
  state.assistantStatus = 200;
  const next = await openAssistant(page, "kk");
  await expect(next.dialog.getByRole("textbox")).toHaveValue("");
  expect(state.calls).toHaveLength(1);
});

test("enabled: KZ narrow reflow keeps navigation and panel actions reachable at 200% text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const { state } = await prepare(page);
  await page.getByRole("button", { name: "KZ", exact: true }).click();
  // Browser text reflow, not a claim about physical Android font-scale settings.
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await noOverflow(page, 360);
  const { dialog } = await openAssistant(page, "kk");
  await noOverflow(page, 360);
  const close = dialog
    .getByRole("button", { name: "Жабу", exact: true })
    .last();
  await close.scrollIntoViewIfNeeded();
  const box = await close.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(740);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await screenshot(page, "assistant-kk-360-text200");
  await close.click();
  await expect(dialog).toHaveCount(0);
  expect(state.calls).toEqual([]);
});
