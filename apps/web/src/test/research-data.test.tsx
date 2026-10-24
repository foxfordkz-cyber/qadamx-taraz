import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/research-examples.json";
import { I18nProvider } from "../shared/i18n";
import { ApiError } from "../shared/api/client";
import {
  ForecastReport,
  RiskReport,
} from "../features/seller/research/ResearchPage";
import {
  demoForecast,
  demoRisk,
  readForecast,
  readRisk,
  researchQuery,
} from "../features/seller/research/data";

const business = "10000000-0000-4000-8000-000000000001";
describe("research contract and isolation", () => {
  it.each([7, 30] as const)(
    "reads reproducible %i-day Demo only with explicit provenance",
    (horizon) => {
      const sample = demoForecast(business, horizon);
      expect(sample.forecast).toHaveLength(horizon);
      expect(() => readForecast(sample, business, horizon)).toThrow(ApiError);
      expect(() =>
        readForecast(
          { ...sample, provenance: "business_ledger" },
          business,
          horizon,
        ),
      ).not.toThrow();
      expect(() => readForecast(sample, "another", horizon, true)).toThrow();
    },
  );
  it("rejects malformed money, missing days and a future-leaking split", () => {
    const sample = demoForecast(business, 7);
    const badMoney = structuredClone(sample);
    badMoney.history[0].sales_minor = 1.5;
    expect(() => readForecast(badMoney, business, 7, true)).toThrow();
    const gap = structuredClone(sample);
    gap.history[1].date = gap.history[0].date;
    expect(() => readForecast(gap, business, 7, true)).toThrow();
    const leakage = structuredClone(sample);
    leakage.evaluation!.train_to = leakage.evaluation!.test_to;
    expect(() => readForecast(leakage, business, 7, true)).toThrow();
    const mismatch = structuredClone(sample);
    mismatch.forecast[0].selected_minor += 1;
    expect(() => readForecast(mismatch, business, 7, true)).toThrow();
  });
  it("shows insufficient history without a graph or fabricated comparison", () => {
    const snapshot = readForecast(
      { ...examples.ForecastInsufficient, business_id: business },
      business,
      7,
    );
    render(
      <I18nProvider>
        <ForecastReport snapshot={snapshot} />
      </I18nProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Недостаточно истории",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("MAE, ₸")).not.toBeInTheDocument();
  });
  it("makes rule status explicit and rejects inconsistent financial facts", () => {
    const sample = demoRisk(business);
    render(
      <I18nProvider>
        <RiskReport snapshot={sample} />
      </I18nProvider>,
    );
    expect(screen.getByText(/Правила, не обученная модель/)).toBeVisible();
    expect(screen.getByText(/не вероятность невозврата/)).toBeVisible();
    sample.items[0].balance_minor += 1;
    expect(() => readRisk(sample, business)).toThrow();
    expect(() => readRisk(demoRisk(business), "another")).toThrow();
  });
  it("never substitutes Demo data when a live request fails or automatically retries", async () => {
    const client = new QueryClient();
    const request = vi.fn().mockRejectedValue(new ApiError(503, "UNAVAILABLE"));
    const sample = vi.fn(() => "demo");
    const query = researchQuery({
      scope: "user-a:epoch1",
      businessId: business,
      resource: "forecast",
      api: { request },
      enabled: true,
      demo: false,
      sample,
      read: String,
    });
    await expect(client.fetchQuery(query)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    expect(sample).not.toHaveBeenCalled();
    client.clear();
  });
  it("keys by session epoch and business; cancellation rejects late responses", async () => {
    const client = new QueryClient();
    let complete!: (v: string) => void;
    const request = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          complete = resolve;
        }),
    );
    const base = {
      businessId: business,
      resource: "forecast",
      api: { request },
      enabled: true,
      demo: false,
      sample: () => "demo",
      read: String,
    };
    const old = researchQuery({ ...base, scope: "a:epoch1" });
    const next = researchQuery({ ...base, scope: "a:epoch3" });
    const other = researchQuery({
      ...base,
      scope: "a:epoch1",
      businessId: "other",
    });
    expect(old.queryKey).not.toEqual(next.queryKey);
    expect(old.queryKey).not.toEqual(other.queryKey);
    const pending = client.fetchQuery(old).catch(() => "cancelled");
    await client.cancelQueries({ queryKey: old.queryKey });
    complete("old-account-result");
    expect(await pending).toBe("cancelled");
    expect(client.getQueryData(next.queryKey)).toBeUndefined();
    expect(client.getQueryData(old.queryKey)).toBeUndefined();
    client.clear();
  });
});
