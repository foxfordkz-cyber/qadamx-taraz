import { expect, test } from "@playwright/test";
import { prepareAssistant } from "./assistant-fixtures";
import { enterDemo, navigateSeller } from "./helpers";
import { qaIds } from "./qa-fixtures";

const copy = {
  ru: {
    question: "Ваш вопрос",
    ask: "Спросить",
    explain: "Объяснить мои цифры",
    fallback: "AI недоступен, показаны данные сервера",
    retry: "Повторить",
    limit: "Лимит вопросов на сегодня",
    empty: "Пока нет данных для ответа",
    demo: "Пример ответа в демо, без AI",
    clipboard: "Скопировать",
  },
  kk: {
    question: "Сұрағыңыз",
    ask: "Сұрау",
    explain: "Көрсеткіштерімді түсіндіру",
    fallback: "AI қолжетімсіз, сервер деректері көрсетілген",
    retry: "Қайталау",
    limit: "Бүгінгі сұрақтар лимиті",
    empty: "Жауап беру үшін деректер әлі жоқ",
    demo: "Демодағы жауап мысалы, AI қолданылмайды",
    clipboard: "Көшіру",
  },
};

for (const locale of ["ru", "kk"] as const) {
  for (const width of [360, 1440]) {
    test.describe(`${locale} ${width}`, () => {
      test.use({ viewport: { width, height: 1000 } });

      test("question, pending, four suggestions, actions and clipboard are read-only", async ({
        page,
        context,
      }, info) => {
        const { state, services } = await prepareAssistant(page);
        if (locale === "kk")
          await page.getByRole("button", { name: "KZ", exact: true }).click();
        const ui = copy[locale];
        await page.locator(".assistant-questions > summary").click();
        const ask = page.getByRole("button", { name: ui.ask, exact: true });
        await expect(ask).toBeDisabled();
        await page.getByLabel(ui.question, { exact: true }).fill("  QA: ?  ");
        let release!: () => void;
        state.gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        try {
          await ask.focus();
          await ask.press("Enter");
          await expect(ask).toBeDisabled();
          await expect(page.locator(".assistant .spinner")).toBeVisible();
          await expect.poll(() => state.calls.length).toBe(1);
          expect(state.calls[0]).toEqual({
            question: "QA: ?",
            locale,
            days: 7,
          });
          for (const chip of await page
            .locator(".assistant-suggestions button")
            .all())
            await expect(chip).toBeDisabled();
        } finally {
          release();
          state.gate = null;
        }
        await expect(page.locator(".assistant-result")).toBeVisible();
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page
          .getByRole("button", { name: ui.clipboard, exact: true })
          .click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
          await page.locator(".assistant-reminder p").textContent(),
        );
        await expect(page.locator(".assistant-debtors li a")).toHaveAttribute(
          "href",
          /\/seller\/debts\?customer_id=/,
        );
        const chips = page.locator(".assistant-suggestions button");
        await expect(chips).toHaveCount(4);
        for (let index = 0; index < 4; index++) {
          const question = await chips.nth(index).textContent();
          await chips.nth(index).click();
          await expect(page.locator(".assistant-result")).toBeVisible();
          expect(state.calls.at(-1)).toEqual({ question, locale, days: 7 });
        }
        state.response.actions = [
          { kind: "open_debts", customer_id: null, text: null },
          { kind: "new_sale", customer_id: null, text: null },
          { kind: "open_history", customer_id: null, text: null },
        ];
        await ask.click();
        await expect(page.locator(".assistant-actions a")).toHaveCount(3);
        expect(
          await page
            .locator(".assistant-actions a")
            .evaluateAll((links) =>
              links.map((link) => link.getAttribute("href")),
            ),
        ).toEqual(["/seller/debts", "/seller/sale", "/seller/history"]);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
          .toBe(width);
        await info.attach("assistant-actions", {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
        // The Auth login is the only POST outside the assistant fixture.
        expect(
          services.calls.filter(
            (call) => call.method === "POST" && call.path.startsWith("/api/"),
          ),
        ).toEqual([]);
        expect(services.unexpected).toEqual([]);
      });

      test("error retry, server fallback, empty facts and 429 stay distinct", async ({
        page,
      }) => {
        const { state, services } = await prepareAssistant(page);
        if (locale === "kk")
          await page.getByRole("button", { name: "KZ", exact: true }).click();
        const ui = copy[locale];
        const explain = page.getByRole("button", { name: ui.explain });
        state.status = 503;
        await explain.click();
        await expect(page.locator(".assistant [role=alert]")).toBeVisible();
        expect(state.calls).toHaveLength(1);
        state.status = 200;
        state.source = "fallback";
        await page
          .locator(".assistant")
          .getByRole("button", { name: ui.retry })
          .click();
        await expect(page.locator(".assistant-source")).toHaveText(ui.fallback);
        expect(state.calls[1]).toEqual(state.calls[0]);
        state.response = { facts: [], actions: [] };
        await explain.click();
        await expect(page.locator(".assistant-result")).toContainText(ui.empty);
        await expect(page.locator(".assistant-debtors li")).toHaveCount(0);
        state.status = 429;
        await explain.click();
        await expect(page.locator(".assistant [role=alert]")).toContainText(
          ui.limit,
        );
        await expect(explain).toBeDisabled();
        expect(state.calls).toHaveLength(4);
        expect(services.unexpected).toEqual([]);
      });

      test("explicit demo remains labelled and makes no Auth/API requests", async ({
        page,
      }) => {
        const traffic: string[] = [];
        await page.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (
            !["127.0.0.1", "localhost"].includes(url.hostname) ||
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/__qa_supabase/")
          ) {
            traffic.push(url.pathname);
            return route.abort();
          }
          return route.continue();
        });
        await enterDemo(page);
        await navigateSeller(page, "analytics");
        if (locale === "kk")
          await page.getByRole("button", { name: "KZ", exact: true }).click();
        await page.getByRole("button", { name: copy[locale].explain }).click();
        await expect(page.locator(".assistant-source")).toHaveText(
          copy[locale].demo,
        );
        expect(traffic).toEqual([]);
      });
    });
  }
}

test("period and point changes discard old answers and reject a foreign envelope", async ({
  page,
}) => {
  const { state } = await prepareAssistant(page);
  await page.getByRole("button", { name: copy.ru.explain }).click();
  await expect(page.locator(".assistant-result")).toBeVisible();
  await page.locator(".analytics-period-switch button").nth(1).click();
  await expect(page.locator(".assistant-result")).toHaveCount(0);
  await page.getByRole("button", { name: copy.ru.explain }).click();
  await expect(page.locator(".assistant-result")).toBeVisible();
  expect(state.calls.at(-1)?.days).toBe(30);
  await page
    .getByLabel("Торговая точка", { exact: true })
    .selectOption(qaIds.shopA2);
  await expect(page.locator(".assistant-result")).toHaveCount(0);
  state.response.business_id = qaIds.shopA;
  await page.getByRole("button", { name: copy.ru.explain }).click();
  await expect(page.locator(".assistant [role=alert]")).toBeVisible();
  await expect(page.locator(".assistant-result")).toHaveCount(0);
});
