import { describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import { makeQueryClient } from "../app/query";
import {
  AnalyticsResponseError,
  readAnalyticsSnapshot,
} from "../features/seller/analytics/model";
import { analyticsQueryOptions } from "../features/seller/analytics/queries";
import { createApiClient } from "../shared/api/client";

const sample = examples.AnalyticsCollectionAndDebtAging;
const expected = { businessId: sample.business_id, days: 7 as const };
const read = (value: unknown) => readAnalyticsSnapshot(value, expected);
const invalidNumbers = [
  -1,
  0.5,
  Number.MAX_SAFE_INTEGER + 1,
  NaN,
  Infinity,
  "1",
  null,
  undefined,
  true,
];

describe("Analytics API 0.7.2 optional aggregates", () => {
  it("preserves the captain's complete collection and debt-aging example", () => {
    expect(read(sample)).toStrictEqual(sample);
  });

  it.each([
    ["both null", null, null],
    ["collection with null aging", sample.collection, null],
    ["aging with null collection", null, sample.debt_aging],
    ["collection without aging", sample.collection, undefined],
    ["aging without collection", undefined, sample.debt_aging],
    ["legacy response without either field", undefined, undefined],
  ])("accepts %s", (_, collection, debtAging) => {
    const value: Record<string, unknown> = { ...sample };
    delete value.collection;
    delete value.debt_aging;
    if (collection !== undefined) value.collection = collection;
    if (debtAging !== undefined) value.debt_aging = debtAging;
    expect(read(value)).toStrictEqual(value);
  });

  it("keeps zero aggregates distinct from absent aggregates", () => {
    const value = {
      ...sample,
      cards: {
        sales_minor: 0,
        receipts_minor: 0,
        sales_count: 0,
        average_ticket_minor: null,
        outstanding_minor: 0,
        debtors_count: 0,
      },
      daily: sample.daily.map((day) => ({
        ...day,
        sales_minor: 0,
        receipts_minor: 0,
        sales_count: 0,
      })),
      hourly: sample.hourly.map((hour) => ({ ...hour, sales_count: 0 })),
      collection: {
        sales_minor: 0,
        paid_at_sale_minor: 0,
        paid_later_minor: 0,
        outstanding_minor: 0,
      },
      debt_aging: sample.debt_aging.map((bucket) => ({
        ...bucket,
        amount_minor: 0,
        sales_count: 0,
      })),
    };
    expect(read(value)).toStrictEqual(value);
  });

  it("does not confuse period collection with signed receipts or all-date debt counts", () => {
    const value = {
      ...sample,
      cards: {
        ...sample.cards,
        receipts_minor: -50_000,
        outstanding_minor: 300_000,
      },
      daily: sample.daily.map((day) => ({
        ...day,
        receipts_minor: day.is_partial ? -50_000 : 0,
      })),
      debt_aging: [
        { key: "31_plus", amount_minor: 100_000, sales_count: 3 },
        { key: "0_7", amount_minor: 150_000, sales_count: 1 },
        { key: "8_30", amount_minor: 50_000, sales_count: 2 },
      ],
    };
    expect(read(value)).toStrictEqual(value);
  });

  it.each([
    "sales_minor",
    "paid_at_sale_minor",
    "paid_later_minor",
    "outstanding_minor",
  ] as const)("rejects malformed collection money in %s", (field) => {
    for (const value of invalidNumbers) {
      expect(() =>
        read({
          ...sample,
          collection: { ...sample.collection, [field]: value },
        }),
      ).toThrow(AnalyticsResponseError);
    }
  });

  it.each([
    ["array instead of collection", []],
    ["string instead of collection", "unavailable"],
    ["missing collection fields", {}],
    [
      "parts disagreeing with collection sales",
      { ...sample.collection, paid_later_minor: 49_999 },
    ],
    [
      "collection sales disagreeing with cards",
      {
        ...sample.collection,
        sales_minor: 299_999,
        paid_at_sale_minor: 99_999,
      },
    ],
  ])("rejects %s", (_, collection) => {
    expect(() => read({ ...sample, collection })).toThrow(
      AnalyticsResponseError,
    );
  });

  it.each(["amount_minor", "sales_count"] as const)(
    "rejects malformed debt-aging integers in %s",
    (field) => {
      for (const value of invalidNumbers) {
        const debtAging = sample.debt_aging.map((bucket, index) =>
          index === 0 ? { ...bucket, [field]: value } : bucket,
        );
        expect(() => read({ ...sample, debt_aging: debtAging })).toThrow(
          AnalyticsResponseError,
        );
      }
    },
  );

  it.each([
    ["non-array debt aging", {}],
    ["empty debt aging", []],
    ["missing bucket", sample.debt_aging.slice(1)],
    ["extra bucket", [...sample.debt_aging, sample.debt_aging[0]]],
    [
      "duplicate bucket",
      [sample.debt_aging[0], sample.debt_aging[1], sample.debt_aging[1]],
    ],
    [
      "unknown bucket",
      [{ ...sample.debt_aging[0], key: "7_30" }, ...sample.debt_aging.slice(1)],
    ],
    [
      "missing bucket key",
      [
        { amount_minor: 150_000, sales_count: 1 },
        ...sample.debt_aging.slice(1),
      ],
    ],
    ["malformed bucket", [null, ...sample.debt_aging.slice(1)]],
    [
      "aging amount disagreeing with current debt",
      [
        { ...sample.debt_aging[0], amount_minor: 149_999 },
        ...sample.debt_aging.slice(1),
      ],
    ],
  ])("rejects %s", (_, debtAging) => {
    expect(() => read({ ...sample, debt_aging: debtAging })).toThrow(
      AnalyticsResponseError,
    );
  });

  it("retains both aggregates through authenticated transport and the query cache", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(sample), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const api = createApiClient({
      baseUrl: "https://api.test.invalid/api/v1",
      getToken: async () => "synthetic-test-token",
      fetcher,
    });
    const client = makeQueryClient();
    const options = analyticsQueryOptions({
      scope: "test:072",
      ...expected,
      scenario: "activity",
      demo: false,
      authenticated: true,
      apiConfigured: true,
      api,
    });
    try {
      expect(await client.fetchQuery(options)).toStrictEqual(sample);
      expect(client.getQueryData(options.queryKey)).toStrictEqual(sample);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toBe(
        `https://api.test.invalid/api/v1/businesses/${sample.business_id}/analytics?days=7`,
      );
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer synthetic-test-token",
      );
    } finally {
      client.clear();
    }
  });
});
