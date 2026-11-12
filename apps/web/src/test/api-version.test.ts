import { describe, expect, it, vi } from "vitest";
import { createApiClient, ApiError } from "../shared/api/client";
import { errorKey } from "../shared/ui";
import { ru } from "../shared/i18n/ru";
import { kk } from "../shared/i18n/kk";

describe("business API compatibility gate", () => {
  it.each([null, "0.7.2", "0.9.0", "0.8.0-unverified"])(
    "rejects a successful but incompatible version %s without retries",
    async (version) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response('{"items":[]}', {
          headers: version ? { "X-Qadam-API-Version": version } : {},
        }),
      );
      const api = createApiClient({
        baseUrl: "https://example.test",
        getToken: async () => "synthetic",
        fetcher,
      });
      await expect(
        api.request("/businesses/shop/operations?min_amount_minor=100", {
          expectedApiVersion: "0.8.0",
        }),
      ).rejects.toMatchObject({ code: "API_INCOMPATIBLE" });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]![1]).not.toHaveProperty(
        "expectedApiVersion",
      );
    },
  );
  it("accepts the matching header and preserves legacy reads without a version", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"items":[]}', {
          headers: { "X-Qadam-API-Version": "0.8.0" },
        }),
      )
      .mockResolvedValueOnce(new Response('{"id":"user"}'));
    const api = createApiClient({
      baseUrl: "https://example.test",
      getToken: async () => "synthetic",
      fetcher,
    });
    await expect(
      api.request("/businesses/shop/report", { expectedApiVersion: "0.8.0" }),
    ).resolves.toEqual({ items: [] });
    await expect(api.request("/me")).resolves.toEqual({ id: "user" });
  });
  it.each([401, 404, 503])(
    "keeps actual HTTP %s semantics before compatibility errors",
    async (status) => {
      const unauthorized = vi.fn();
      const api = createApiClient({
        baseUrl: "https://example.test",
        getToken: async () => "synthetic",
        onUnauthorized: unauthorized,
        fetcher: vi.fn().mockResolvedValue(new Response("{}", { status })),
      });
      await expect(
        api.request("/businesses/shop/report", { expectedApiVersion: "0.8.0" }),
      ).rejects.toMatchObject({ status });
      expect(unauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    },
  );
  it("explains incompatible backend in RU and KZ without reporting an auth failure", () => {
    const key = errorKey(new ApiError(0, "API_INCOMPATIBLE"));
    expect(key).toBe("apiIncompatible");
    expect(ru[key]).toContain("Данные не показаны");
    expect(kk[key]).toContain("Деректер көрсетілмеді");
  });
});
