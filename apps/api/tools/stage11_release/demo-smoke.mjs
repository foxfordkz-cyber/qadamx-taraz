// Read-only smoke of an already running OFFLINE local fixture; never seeds or writes money.
import assert from "node:assert/strict";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(resolve(process.argv[2], "package.json"));
const { chromium, expect } = require("@playwright/test");
const output = resolve(process.argv[3]);
assert.ok(!existsSync(output), "Use a NEW evidence directory");
mkdirSync(output, { recursive: true });
const info = await (await fetch("http://127.0.0.1:8322/__qa/info")).json();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  mode: "Synthetic read-only Chrome smoke; NOT physical microphone or Supabase",
  frontend_source: "e825dd9a9568dda33a9226e1941e789fd21d2175",
  browser: browser.version(),
  url: "http://127.0.0.1:4303/login",
  status: "running",
  page_errors: [],
  blocked_writes: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => report.page_errors.push(e.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (
      url.pathname.startsWith("/api/v1/") &&
      route.request().method() !== "GET"
    ) {
      report.blocked_writes.push(url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(report.url);
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill("a@research.example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-local-only");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.getByLabel("Торговая точка").selectOption(info.business);
  const sevenResponse = page.waitForResponse((r) =>
    r.url().includes("/research/forecast?horizon=7"),
  );
  await page.goto("http://127.0.0.1:4303/seller/research");
  const seven = await (await sevenResponse).json();
  assert.equal(seven.forecast.length, 7);
  await expect(page.locator(".research-chart")).toBeVisible();
  await expect(page.locator("#forecast")).toContainText(
    seven.evaluation.test_to,
  );
  await page.screenshot({
    path: output + "/research-7-desktop.png",
    fullPage: true,
  });
  const thirtyResponse = page.waitForResponse((r) =>
    r.url().includes("/research/forecast?horizon=30"),
  );
  await page.getByLabel("Горизонт прогноза").selectOption("30");
  const thirty = await (await thirtyResponse).json();
  assert.equal(thirty.forecast.length, 30);
  await expect(page.locator("#forecast")).toContainText(
    thirty.evaluation.test_to,
  );
  await expect(page.locator("#risk")).toContainText("70/100");
  report.research = {
    observed_days: seven.observed_days,
    horizons: [7, 30],
    provenance: seven.provenance,
    selected_method7: seven.selected_method,
    selected_method30: thirty.selected_method,
  };
  await page.getByLabel("Торговая точка").selectOption(info.empty);
  await expect(page.locator("#forecast")).toContainText("0 полных дней");
  await expect(page.locator("#risk")).toContainText("Нет открытых долгов");
  await expect(page.locator(".research-chart")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: output + "/research-empty-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  assert.deepEqual(report.page_errors, []);
  assert.deepEqual(report.blocked_writes, []);
  report.status = "passed";
} catch (e) {
  report.status = "failed";
  report.error = String(e);
  throw e;
} finally {
  writeFileSync(
    output + "/result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
