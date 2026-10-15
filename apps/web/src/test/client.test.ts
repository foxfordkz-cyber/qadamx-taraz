import { describe, expect, it, vi } from "vitest";
import { createApiClient, ApiError } from "../shared/api/client";
import { createLiveGateway } from "../shared/api/gateway";
import { demoGateway } from "../shared/demo/gateway";
import { formatKZT } from "../shared/format";
import { errorKey } from "../shared/ui";
import { makeQueryClient, clearPrivateCache } from "../app/query";

describe("authorized HTTP transport", () => {
  it("adds a fresh token, prefix, abort signal and JSON headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"items":[]}', { status: 200 }));
    const api = createApiClient({
      baseUrl: "https://example.test/api/v1/",
      getToken: async () => "test-access",
      fetcher,
    });
    const controller = new AbortController();
    await api.request("/me", { signal: controller.signal });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://example.test/api/v1/me");
    expect(init.headers.get("Authorization")).toBe("Bearer test-access");
    expect(init.signal).toBe(controller.signal);
    expect(init.redirect).toBe("error");
  });
  it.each(["https://evil.test/path", "//evil.test", "/../../secret"])(
    "rejects unsafe path %s before token lookup",
    async (path) => {
      const getToken = vi.fn();
      const fetcher = vi.fn();
      await expect(
        createApiClient({
          baseUrl: "https://example.test",
          getToken,
          fetcher,
        }).request(path),
      ).rejects.toMatchObject({ code: "INVALID_PATH" });
      expect(getToken).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("never uses fixtures as fallback when API is unavailable", async () => {
    const fetcher = vi.fn();
    await expect(
      createApiClient({
        baseUrl: "",
        getToken: async () => null,
        fetcher,
      }).request("/me"),
    ).rejects.toMatchObject({ code: "API_UNCONFIGURED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 500])(
    "handles HTTP %i without exposing response text",
    async (status) => {
      const onUnauthorized = vi.fn();
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response("private server traceback", { status }),
        );
      const api = createApiClient({
        baseUrl: "https://example.test",
        getToken: async () => "token",
        fetcher,
        onUnauthorized,
      });
      await expect(api.request("/me")).rejects.toMatchObject({
        status,
        message: `HTTP_${status}`,
      });
      expect(onUnauthorized).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    },
  );
  it("distinguishes aborted requests and network failure", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException("Aborted", "AbortError");
    const api = createApiClient({
      baseUrl: "https://example.test",
      getToken: async () => "token",
      fetcher: vi.fn().mockRejectedValue(aborted),
    });
    await expect(
      api.request("/me", { signal: controller.signal }),
    ).rejects.toBe(aborted);
    await expect(api.request("/me")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
  it("rejects malformed successful JSON", async () => {
    const api = createApiClient({
      baseUrl: "https://example.test",
      getToken: async () => "token",
      fetcher: vi.fn().mockResolvedValue(new Response("<html>")),
    });
    await expect(api.request("/me")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
describe("contract safety and demo isolation", () => {
  it("does not send unconfirmed customer writes", async () => {
    const request = vi.fn();
    const gateway = createLiveGateway({ request }, {});
    const { businesses } = await demoGateway.me();
    await expect(
      gateway.createCustomer(businesses[0], {
        display_name: "Test",
        note: "",
        contact: "",
      }),
    ).rejects.toMatchObject({ code: "CONTRACT_PENDING" });
    expect(request).not.toHaveBeenCalled();
    expect(gateway.canWrite).toBe(false);
  });
  it("demo cannot write or return another business data", async () => {
    const { businesses } = await demoGateway.me();
    await expect(
      demoGateway.createCustomer(businesses[0], {
        display_name: "Test",
        note: "",
        contact: "",
      }),
    ).rejects.toMatchObject({ code: "DEMO_READ_ONLY" });
    await expect(
      demoGateway.setInquiryStatus(businesses[0], "id", "closed"),
    ).rejects.toMatchObject({ code: "DEMO_READ_ONLY" });
    await expect(
      demoGateway.customers({ ...businesses[0], id: "foreign" }, "", null),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (await demoGateway.customers(businesses[1], "", null)).items,
    ).toEqual([]);
  });
  it("clears private cache and cancels in-flight queries", async () => {
    const client = makeQueryClient();
    let signal: AbortSignal | undefined;
    client.setQueryData(["old-user"], ["private"]);
    const pending = client.fetchQuery({
      queryKey: ["pending"],
      queryFn: ({ signal: next }) => {
        signal = next;
        return new Promise(() => {});
      },
    });
    clearPrivateCache(client);
    await expect(pending).rejects.toBeDefined();
    expect(signal?.aborted).toBe(true);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "notFound"],
    [500, "serverError"],
  ])("localizes HTTP %s", (status, key) => {
    expect(errorKey(new ApiError(status as number, "HTTP"))).toBe(key);
  });
});
describe("integer tiyn formatting", () => {
  it("formats whole and fractional KZT without losing tiyn", () => {
    expect(formatKZT(300000)).toBe("3 000 ₸");
    expect(formatKZT(150000, "kk")).toBe("1 500 ₸");
    expect(formatKZT(12345)).toBe("123,45 ₸");
    expect(formatKZT(-50000)).toBe("-500 ₸");
  });
  it("rejects fractional or unsafe minor units", () => {
    expect(() => formatKZT(1.5)).toThrow(RangeError);
    expect(() => formatKZT(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
