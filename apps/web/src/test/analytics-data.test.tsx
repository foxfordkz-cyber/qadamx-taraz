import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/analytics-examples.json";
import { makeQueryClient } from "../app/query";
import {
  createDemoAnalyticsAdapter,
  DEMO_ANALYTICS_AS_OF,
  DEMO_ANALYTICS_BUSINESS as businessId,
  DEMO_ANALYTICS_EMPTY_BUSINESS as emptyBusinessId,
  makeDemoAnalyticsSnapshot,
  type DemoAnalyticsRequest,
} from "../features/seller/analytics/demo";
import {
  AnalyticsResponseError,
  readAnalyticsSnapshot,
  type AnalyticsDays,
  type AnalyticsSnapshot,
} from "../features/seller/analytics/model";
import { analyticsQueryOptions } from "../features/seller/analytics/queries";
import { readLiveAnalytics } from "../features/seller/analytics/live";
import {
  ApiError,
  createApiClient,
  type ApiClient,
} from "../shared/api/client";

describe("approved analytics DTO, frontend validation only", () => {
  it.each(Object.entries(examples))(
    "accepts captain example %s",
    (_, sample) => {
      const result = readAnalyticsSnapshot(sample, {
        businessId: sample.business_id,
        days: 7,
      });
      expect(result).toEqual(sample);
    },
  );
  it.each([7, 30] as const)(
    "returns exactly %i local calendar days and 24 hours",
    (days) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, days);
      expect(readAnalyticsSnapshot(snapshot, { businessId, days })).toEqual(
        snapshot,
      );
      expect(snapshot.daily).toHaveLength(days);
      expect(snapshot.daily.at(-1)?.date).toBe("2026-10-16");
      expect(snapshot.daily.filter((row) => row.is_partial)).toHaveLength(1);
      expect(snapshot.hourly.map((row) => row.hour)).toEqual(
        Array.from({ length: 24 }, (_, hour) => hour),
      );
      expect(snapshot.as_of).toBe(DEMO_ANALYTICS_AS_OF);
    },
  );
  it("uses distinct period fixtures without recalculating current debt", () => {
    const week = makeDemoAnalyticsSnapshot(businessId, 7);
    const month = makeDemoAnalyticsSnapshot(businessId, 30);
    expect(week.cards.sales_minor).toBe(7_400_000);
    expect(month.cards.sales_minor).toBe(30_000_000);
    expect(month.cards.outstanding_minor).toBe(week.cards.outstanding_minor);
    expect(month.cards.debtors_count).toBe(week.cards.debtors_count);
  });
  it("keeps an empty period distinct from unavailable average ticket", () => {
    const value = makeDemoAnalyticsSnapshot(businessId, 7, "empty");
    const snapshot = readAnalyticsSnapshot(value, { businessId, days: 7 });
    expect(snapshot.cards.sales_minor).toBe(0);
    expect(snapshot.cards.sales_count).toBe(0);
    expect(snapshot.cards.average_ticket_minor).toBeNull();
    expect(snapshot.daily.every((row) => row.sales_minor === 0)).toBe(true);
  });
  it("preserves current debt from earlier dates even when the selected period is empty", () => {
    const value = makeDemoAnalyticsSnapshot(businessId, 7, "empty");
    value.cards.outstanding_minor = 150_000;
    value.cards.debtors_count = 1;
    const snapshot = readAnalyticsSnapshot(value, { businessId, days: 7 });
    expect(snapshot.cards.outstanding_minor).toBe(150_000);
    expect(snapshot.cards.debtors_count).toBe(1);
    expect(snapshot.cards.average_ticket_minor).toBeNull();
    expect(snapshot.daily.every((row) => row.sales_count === 0)).toBe(true);
  });
  it("keeps the second permitted Demo business empty and denies arbitrary IDs", () => {
    expect(makeDemoAnalyticsSnapshot(emptyBusinessId, 7).cards).toMatchObject({
      sales_minor: 0,
      average_ticket_minor: null,
    });
    expect(() => makeDemoAnalyticsSnapshot("not-a-membership", 7)).toThrow(
      "DEMO_ANALYTICS_BUSINESS_NOT_ALLOWED",
    );
  });
  it("preserves negative receipts from old-sale reversal without negative sales", () => {
    const snapshot = readAnalyticsSnapshot(
      makeDemoAnalyticsSnapshot(businessId, 7, "reversal"),
      { businessId, days: 7 },
    );
    expect(snapshot.cards.receipts_minor).toBe(-100_000);
    expect(snapshot.daily.at(-1)?.receipts_minor).toBe(-100_000);
    expect(snapshot.cards.sales_minor).toBe(0);
    expect(snapshot.cards.sales_count).toBe(0);
    expect(snapshot.cards.average_ticket_minor).toBeNull();
  });
  it("reads the supplied integer average ticket and never substitutes receipts", () => {
    const value = makeDemoAnalyticsSnapshot(businessId, 7, "empty");
    value.cards = {
      ...value.cards,
      sales_minor: 199,
      sales_count: 2,
      average_ticket_minor: 100,
      receipts_minor: -500,
    };
    Object.assign(value.daily[6], {
      sales_minor: 199,
      sales_count: 2,
      receipts_minor: -500,
    });
    value.hourly[15].sales_count = 2;
    expect(readAnalyticsSnapshot(value, { businessId, days: 7 }).cards).toEqual(
      value.cards,
    );
  });
  it("validates today in Asia/Almaty across local midnight without a client date parameter", () => {
    const value = makeDemoAnalyticsSnapshot(businessId, 7);
    value.as_of = "2026-10-15T19:00:00Z";
    expect(
      readAnalyticsSnapshot(value, { businessId, days: 7 }).period_to,
    ).toBe("2026-10-16");
    value.as_of = "2026-10-15T18:59:59Z";
    expect(() => readAnalyticsSnapshot(value, { businessId, days: 7 })).toThrow(
      AnalyticsResponseError,
    );
  });

  it.each([
    [
      "a different business",
      (v: AnalyticsSnapshot) => {
        v.business_id = emptyBusinessId;
      },
    ],
    [
      "a different period",
      (v: AnalyticsSnapshot) => {
        v.days = 30;
      },
    ],
    [
      "unsafe money",
      (v: AnalyticsSnapshot) => {
        v.cards.sales_minor = Number.MAX_SAFE_INTEGER + 1;
      },
    ],
    [
      "fractional money",
      (v: AnalyticsSnapshot) => {
        v.cards.receipts_minor = 1.5;
      },
    ],
    [
      "negative sales",
      (v: AnalyticsSnapshot) => {
        v.cards.sales_minor = -1;
      },
    ],
    [
      "missing average",
      (v: AnalyticsSnapshot) => {
        v.cards.average_ticket_minor = null;
      },
    ],
    [
      "negative count",
      (v: AnalyticsSnapshot) => {
        v.cards.sales_count = -1;
      },
    ],
    [
      "missing day",
      (v: AnalyticsSnapshot) => {
        v.daily.pop();
      },
    ],
    [
      "unordered dates",
      (v: AnalyticsSnapshot) => {
        v.daily.reverse();
      },
    ],
    [
      "invalid calendar date",
      (v: AnalyticsSnapshot) => {
        v.period_from = "2026-02-30";
      },
    ],
    [
      "wrong local today",
      (v: AnalyticsSnapshot) => {
        v.as_of = "2026-10-17T10:00:00Z";
      },
    ],
    [
      "wrong partial day",
      (v: AnalyticsSnapshot) => {
        v.daily[0].is_partial = true;
      },
    ],
    [
      "missing hour",
      (v: AnalyticsSnapshot) => {
        v.hourly.pop();
      },
    ],
    [
      "duplicate hour",
      (v: AnalyticsSnapshot) => {
        v.hourly[1].hour = 0;
      },
    ],
    [
      "disagreeing totals",
      (v: AnalyticsSnapshot) => {
        v.daily[0].receipts_minor += 1;
      },
    ],
    [
      "disagreeing counts",
      (v: AnalyticsSnapshot) => {
        v.hourly[0].sales_count += 1;
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const value = makeDemoAnalyticsSnapshot(businessId, 7);
    mutate(value);
    expect(() => readAnalyticsSnapshot(value, { businessId, days: 7 })).toThrow(
      AnalyticsResponseError,
    );
  });
});

describe("explicit Demo analytics adapter and scope isolation", () => {
  const request = (
    overrides: Partial<DemoAnalyticsRequest> = {},
  ): DemoAnalyticsRequest => ({
    businessId,
    days: 7,
    scenario: "activity",
    scope: "demo:1",
    signal: new AbortController().signal,
    ...overrides,
  });

  it("does not request an unconfigured live endpoint or substitute Demo on refetch", async () => {
    const adapter = createDemoAnalyticsAdapter({ delayMs: 0 });
    const read = vi.spyOn(adapter, "read");
    const fetcher = vi.spyOn(globalThis, "fetch");
    const cache = makeQueryClient();
    const options = analyticsQueryOptions({
      scope: "live-user:1",
      businessId,
      days: 7,
      scenario: "activity",
      demo: false,
      authenticated: true,
      adapter,
    });
    expect(options.enabled).toBe(false);
    await expect(cache.fetchQuery(options)).rejects.toThrow("API_UNCONFIGURED");
    expect(read).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    cache.clear();
  });
  it("disables expired identity requests even when explicitly refetched", async () => {
    const adapter = createDemoAnalyticsAdapter({ delayMs: 0 });
    const read = vi.spyOn(adapter, "read");
    const cache = makeQueryClient();
    await expect(
      cache.fetchQuery(
        analyticsQueryOptions({
          scope: "demo:1",
          businessId,
          days: 7,
          scenario: "activity",
          demo: true,
          expired: true,
          adapter,
        }),
      ),
    ).rejects.toThrow("AUTH_REQUIRED");
    expect(read).not.toHaveBeenCalled();
    cache.clear();
  });
  it("shows the selected Demo failure once and retries explicitly without a network request", async () => {
    const adapter = createDemoAnalyticsAdapter({ delayMs: 0 });
    const fetcher = vi.spyOn(globalThis, "fetch");
    await expect(adapter.read(request({ scenario: "error" }))).rejects.toThrow(
      "DEMO_ANALYTICS_FAILURE",
    );
    const result = await adapter.read(request({ scenario: "error" }));
    expect(
      readAnalyticsSnapshot(result, { businessId, days: 7 }).cards.sales_count,
    ).toBe(25);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("aborts before fixture resolution and rejects a resolver that ignores cancellation", async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => {
      resolve = done;
    });
    const adapter = createDemoAnalyticsAdapter({
      delayMs: 0,
      resolve: () => pending,
    });
    const controller = new AbortController();
    const result = adapter.read(request({ signal: controller.signal }));
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    resolve(makeDemoAnalyticsSnapshot(businessId, 7));
    await Promise.resolve();
    await expect(
      adapter.read(request({ signal: controller.signal })),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("cancels the synthetic loading timer", async () => {
    const adapter = createDemoAnalyticsAdapter({ delayMs: 50_000 });
    const controller = new AbortController();
    const result = adapter.read(request({ signal: controller.signal }));
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("never displays another business, period, or old identity epoch while requests finish late", async () => {
    const calls: {
      request: DemoAnalyticsRequest;
      resolve: (value: unknown) => void;
    }[] = [];
    const adapter = createDemoAnalyticsAdapter({
      delayMs: 0,
      resolve: (next) =>
        new Promise((resolve) => {
          calls.push({ request: next, resolve });
        }),
    });
    const cache = makeQueryClient();
    function Probe({
      scope,
      business,
      days,
    }: {
      scope: string;
      business: string;
      days: AnalyticsDays;
    }) {
      const query = useQuery(
        analyticsQueryOptions({
          scope,
          businessId: business,
          days,
          scenario: "activity",
          demo: true,
          adapter,
        }),
      );
      return (
        <output>
          {query.data
            ? `${query.data.business_id}:${query.data.days}:${query.data.cards.sales_count}`
            : "pending"}
        </output>
      );
    }
    const view = (scope: string, business: string, days: AnalyticsDays = 7) => (
      <QueryClientProvider client={cache}>
        <Probe scope={scope} business={business} days={days} />
      </QueryClientProvider>
    );
    const rendered = render(view("demo-a:1", businessId));
    await waitFor(() => expect(calls).toHaveLength(1));
    rendered.rerender(view("demo-a:1", emptyBusinessId));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].request.signal.aborted).toBe(true);
    await act(async () => {
      calls[0].resolve(makeDemoAnalyticsSnapshot(businessId, 7));
    });
    expect(screen.getByRole("status")).toHaveTextContent("pending");
    await act(async () => {
      calls[1].resolve(makeDemoAnalyticsSnapshot(emptyBusinessId, 7));
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        `${emptyBusinessId}:7:0`,
      ),
    );
    rendered.rerender(view("demo-b:2", businessId, 30));
    expect(screen.getByRole("status")).toHaveTextContent("pending");
    await waitFor(() => expect(calls).toHaveLength(3));
    rendered.rerender(view("demo-a:3", businessId));
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls[2].request.signal.aborted).toBe(true);
    await act(async () => {
      calls[2].resolve(makeDemoAnalyticsSnapshot(businessId, 30));
    });
    expect(screen.getByRole("status")).toHaveTextContent("pending");
    await act(async () => {
      calls[3].resolve(makeDemoAnalyticsSnapshot(businessId, 7));
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        `${businessId}:7:25`,
      ),
    );
    expect(
      cache.getQueryData(
        analyticsQueryOptions({
          scope: "demo-a:1",
          businessId,
          days: 7,
          scenario: "activity",
          demo: true,
          adapter,
        }).queryKey,
      ),
    ).toBeUndefined();
    rendered.unmount();
    cache.clear();
  });
});

describe("published 0.6.0 live analytics binding using synthetic HTTP only", () => {
  it.each([7, 30] as const)(
    "requests the approved %i-day URL with Bearer and AbortSignal",
    async (days) => {
      const snapshot = makeDemoAnalyticsSnapshot(businessId, days);
      snapshot.as_of = "2026-10-16T10:00:00+00:00";
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify(snapshot), { status: 200 }),
        );
      const token = vi.fn().mockResolvedValue("synthetic-access-token");
      const api = createApiClient({
        baseUrl: "https://api.example.test/api/v1",
        getToken: token,
        fetcher,
      });
      const signal = new AbortController().signal;
      const result = await readLiveAnalytics(api, { businessId, days, signal });
      expect(result).toEqual(snapshot);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toBe(
        `https://api.example.test/api/v1/businesses/${businessId}/analytics?days=${days}`,
      );
      expect(init?.signal).toBe(signal);
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer synthetic-access-token",
      );
      expect(init?.method).toBeUndefined();
      expect(init?.body).toBeUndefined();
      expect(token).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects invalid periods and IDs before calling transport", async () => {
    const api = { request: vi.fn() } as ApiClient;
    const signal = new AbortController().signal;
    await expect(
      readLiveAnalytics(api, { businessId, days: 14 as AnalyticsDays, signal }),
    ).rejects.toThrow("INVALID_ANALYTICS_PERIOD");
    await expect(
      readLiveAnalytics(api, { businessId: "../other", days: 7, signal }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(api.request).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 422, 503])(
    "preserves HTTP %i without retries or Demo fallback",
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "TEST_FAILURE", message: "Synthetic failure" },
          }),
          { status },
        ),
      );
      const expired = vi.fn();
      const api = createApiClient({
        baseUrl: "https://api.example.test/api/v1",
        getToken: async () => "synthetic-token",
        onUnauthorized: expired,
        fetcher,
      });
      const adapter = createDemoAnalyticsAdapter({ delayMs: 0 });
      const read = vi.spyOn(adapter, "read");
      const cache = makeQueryClient();
      await expect(
        cache.fetchQuery(
          analyticsQueryOptions({
            scope: "seller-a:1",
            businessId,
            days: 7,
            scenario: "activity",
            demo: false,
            authenticated: true,
            apiConfigured: true,
            api,
            adapter,
          }),
        ),
      ).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(expired).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
      expect(read).not.toHaveBeenCalled();
      cache.clear();
    },
  );
  it("keeps network failure visible without synthetic substitution", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("synthetic network failure"));
    const api = createApiClient({
      baseUrl: "https://api.example.test/api/v1",
      getToken: async () => "synthetic-token",
      fetcher,
    });
    const cache = makeQueryClient();
    await expect(
      cache.fetchQuery(
        analyticsQueryOptions({
          scope: "seller-a:1",
          businessId,
          days: 7,
          scenario: "activity",
          demo: false,
          authenticated: true,
          apiConfigured: true,
          api,
        }),
      ),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    cache.clear();
  });
  it("does not fetch for guest even when an API client is available", async () => {
    const api = { request: vi.fn() } as ApiClient;
    const cache = makeQueryClient();
    const options = analyticsQueryOptions({
      scope: "guest:1",
      businessId,
      days: 7,
      scenario: "activity",
      demo: false,
      authenticated: false,
      apiConfigured: true,
      api,
    });
    expect(options.enabled).toBe(false);
    await expect(cache.fetchQuery(options)).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });
    expect(api.request).not.toHaveBeenCalled();
    cache.clear();
  });
  it("rejects malformed or mismatched live snapshots through the shared reader", async () => {
    const api = {
      request: vi
        .fn()
        .mockResolvedValue(makeDemoAnalyticsSnapshot(emptyBusinessId, 7)),
    } as ApiClient;
    await expect(
      readLiveAnalytics(api, {
        businessId,
        days: 7,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
  it.each(["response", "401"] as const)(
    "classifies an ignored late %s after cancellation as AbortError",
    async (completion) => {
      let resolve!: (value: unknown) => void;
      let reject!: (error: unknown) => void;
      const api = {
        request: vi.fn(
          () =>
            new Promise((done, fail) => {
              resolve = done;
              reject = fail;
            }),
        ),
      } as ApiClient;
      const controller = new AbortController();
      const pending = readLiveAnalytics(api, {
        businessId,
        days: 7,
        signal: controller.signal,
      });
      controller.abort();
      if (completion === "response")
        resolve(makeDemoAnalyticsSnapshot(businessId, 7));
      else reject(new ApiError(401, "AUTH_REQUIRED"));
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    },
  );
  it("refetches active analytics on the existing money-write scope/business invalidation", async () => {
    const snapshot = makeDemoAnalyticsSnapshot(businessId, 7);
    const api = { request: vi.fn().mockResolvedValue(snapshot) } as ApiClient;
    const cache = makeQueryClient();
    function Probe() {
      const query = useQuery(
        analyticsQueryOptions({
          scope: "seller-a:1",
          businessId,
          days: 7,
          scenario: "activity",
          demo: false,
          authenticated: true,
          apiConfigured: true,
          api,
        }),
      );
      return <output>{query.data?.cards.sales_count ?? "pending"}</output>;
    }
    const rendered = render(
      <QueryClientProvider client={cache}>
        <Probe />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("25"),
    );
    expect(api.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      await cache.invalidateQueries({ queryKey: ["seller-a:1", businessId] });
    });
    expect(api.request).toHaveBeenCalledTimes(2);
    await act(async () => {
      await cache.invalidateQueries({ queryKey: ["seller-b:2", businessId] });
    });
    expect(api.request).toHaveBeenCalledTimes(2);
    rendered.unmount();
    cache.clear();
  });
});
