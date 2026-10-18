import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderQa } from "./qa-fixtures";
import {
  DEMO_ANALYTICS_BUSINESS,
  DEMO_ANALYTICS_EMPTY_BUSINESS,
  makeDemoAnalyticsSnapshot,
} from "../features/seller/analytics/demo";
import { formatKZT } from "../shared/format";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("cabinet teaching snapshot", () => {
  for (const locale of ["ru", "kk"] as const) {
    it(`shows analytics' last day, all-date debt and three named examples in ${locale} without HTTP`, async () => {
      const fetcher = vi.fn<typeof fetch>(async () => {
        throw new Error("Demo must not contact an API");
      });
      const view = renderQa({ initial: null, route: "/login", fetcher });
      await userEvent.click(
        await screen.findByRole("button", { name: /Посмотреть демо/ }),
      );
      await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
      if (locale === "kk")
        await userEvent.click(
          screen.getByRole("button", { name: "KZ" }),
        );
      const metrics = view.container.querySelector(".cabinet-metrics")!;
      expect(metrics.querySelectorAll("dd")).toHaveLength(3);
      for (const days of [7, 30] as const) {
        const snapshot = makeDemoAnalyticsSnapshot(
          DEMO_ANALYTICS_BUSINESS,
          days,
        );
        const day = snapshot.daily.at(-1)!;
        expect(
          [...metrics.querySelectorAll("dd")].map((node) => node.textContent),
        ).toEqual(
          [
            day.sales_minor,
            day.receipts_minor,
            snapshot.cards.outstanding_minor,
          ].map((value) => formatKZT(value, locale)),
        );
      }
      expect(metrics).not.toHaveTextContent("—");
      expect(screen.getByText(/Демо · 2026-10-16/)).toBeInTheDocument();
      const debts = view.container.querySelector(".cabinet-debt-preview")!;
      expect(
        within(debts as HTMLElement).getAllByRole("listitem"),
      ).toHaveLength(3);
      await within(debts as HTMLElement).findByText("Әсел");
      expect(within(debts as HTMLElement).getAllByText("Асқар")).toHaveLength(
        2,
      );
      for (const amount of [150_000, 900_000, 700_000])
        expect(debts).toHaveTextContent(formatKZT(amount, locale));
      const select = screen.getByLabelText(
        locale === "ru" ? "Торговая точка" : "Сауда нүктесі",
      );
      await userEvent.selectOptions(select, DEMO_ANALYTICS_EMPTY_BUSINESS);
      expect(view.container.querySelector(".cabinet-debt-preview")).toBeNull();
      expect(
        [...view.container.querySelectorAll(".cabinet-metrics dd")].map(
          (node) => node.textContent,
        ),
      ).toEqual(Array(3).fill(formatKZT(0, locale)));
      await userEvent.selectOptions(select, DEMO_ANALYTICS_BUSINESS);
      await screen.findByText("Әсел");
      expect(
        view.container.querySelectorAll(".cabinet-debt-preview li"),
      ).toHaveLength(3);
      expect(fetcher).not.toHaveBeenCalled();
    });
  }

  it("does not substitute demo amounts when a live overview fails", async () => {
    const view = renderQa({ route: "/seller" });
    await screen.findByRole("heading", { name: "Хорошего рабочего дня!" });
    await screen.findAllByRole("alert", {}, { timeout: 5_000 });
    expect(view.container.querySelector(".cabinet-metrics")).toBeNull();
    expect(view.container.querySelector(".cabinet-debt-preview")).toBeNull();
    expect(screen.queryByText(/Демо · 2026-10-16/)).not.toBeInTheDocument();
  });
});
