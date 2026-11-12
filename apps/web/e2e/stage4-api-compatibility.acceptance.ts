import { expect, test } from "@playwright/test";
import { login, mockServices, qaIds } from "./qa-fixtures";

for (const version of [null, "0.7.2"]) {
  test(`filtered history rejects old successful server ${version ?? "without header"} and explicit Retry recovers`, async ({
    page,
  }) => {
    await mockServices(page);
    let compatible = false;
    let calls = 0;
    await page.route("**/api/v1/businesses/*/operations?*", async (route) => {
      calls += 1;
      const headers: Record<string, string> = compatible
        ? { "X-Qadam-API-Version": "0.8.0" }
        : version
          ? { "X-Qadam-API-Version": version }
          : {};
      await route.fulfill({
        headers,
        json: {
          items: [
            {
              id: "30000000-0000-4000-8000-000000000001",
              business_id: qaIds.shopA,
              customer_id: null,
              sale_id: "30000000-0000-4000-8000-000000000001",
              kind: "sale",
              sales_delta_minor: 420000,
              receipts_delta_minor: 220000,
              reversal_of: null,
              description: "Synthetic filtered result",
              created_at: "2026-11-12T05:00:00Z",
              created_by: qaIds.a,
            },
          ],
          next_cursor: null,
        },
      });
    });
    await login(page);
    await page.goto("/seller/history?min_amount_minor=400000");
    await expect(
      page.getByText(/Версия сервера не поддерживает/),
    ).toBeVisible();
    await expect(page.getByText("Synthetic filtered result")).toHaveCount(0);
    // No refresh loop: the normal bounded read-retry budget is at most two attempts.
    expect(calls).toBeLessThanOrEqual(2);
    await page.getByRole("button", { name: "KZ", exact: true }).click();
    await expect(
      page.getByText(/Сервер нұсқасы бұл есепті немесе сүзгіні қолдамайды/),
    ).toBeVisible();
    compatible = true;
    await page.getByRole("button", { name: /Қайталау|Қайталап көру/ }).click();
    await expect(page.getByText("Synthetic filtered result")).toBeVisible();
    await expect(page.getByText(/Сервер нұсқасы бұл есепті/)).toHaveCount(0);
  });
}
