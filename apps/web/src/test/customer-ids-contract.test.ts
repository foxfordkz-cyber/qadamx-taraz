import { describe, expect, it, vi } from "vitest";
import { createLiveGateway } from "../shared/api/gateway";
import { createApiClient } from "../shared/api/client";
import { backendBindings } from "../shared/api/bindings";
import { customer, ids, json, meA } from "./qa-fixtures";

function setup(
  raw: unknown = { items: [customer()], next_cursor: null },
  enabled = true,
) {
  const fetcher = vi.fn(async () => json(raw));
  const api = createApiClient({
    baseUrl: "https://qa.invalid/api/v1",
    getToken: async () => "synthetic-token",
    fetcher,
  });
  return {
    fetcher,
    gateway: createLiveGateway(api, backendBindings, ids.a, {
      customerIds: enabled,
    }),
  };
}
describe("PR61/f6b3a9 customer ids contract (synthetic responses only)", () => {
  it("is unavailable by default and when disabled", () => {
    expect(setup(undefined, false).gateway.customersByIds).toBeUndefined();
    const api = createApiClient({ baseUrl: "", getToken: async () => null });
    expect(
      createLiveGateway(api, backendBindings).customersByIds,
    ).toBeUndefined();
  });
  it("uses repeated ids, Bearer and AbortSignal, preserving the server balance", async () => {
    const { gateway, fetcher } = setup();
    const signal = new AbortController().signal;
    const page = await gateway.customersByIds!(
      meA.businesses[0],
      [ids.customer, ids.customer2, ids.customer],
      signal,
    );
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const query = new URL(url).searchParams;
    expect([...query.keys()]).toEqual(["ids", "ids"]);
    expect(query.getAll("ids")).toEqual([ids.customer, ids.customer2]);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer synthetic-token",
    );
    expect(init.signal).toBeDefined();
    expect(page.items[0].balance_minor).toBe(customer().balance_minor);
  });
  it("does not send an empty batch or an oversized/invalid batch", async () => {
    const { gateway, fetcher } = setup();
    expect(await gateway.customersByIds!(meA.businesses[0], [])).toEqual({
      items: [],
      next_cursor: null,
    });
    await expect(
      gateway.customersByIds!(meA.businesses[0], Array(101).fill(ids.customer)),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      gateway.customersByIds!(meA.businesses[0], ["invalid"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts missing ids without inventing a name or a balance", async () => {
    const { gateway } = setup({ items: [], next_cursor: null });
    expect(
      (await gateway.customersByIds!(meA.businesses[0], [ids.customer])).items,
    ).toEqual([]);
  });
  it.each([
    { items: [customer(ids.shopB)], next_cursor: null },
    {
      items: [customer(ids.shopA, "unrequested", ids.customer2)],
      next_cursor: null,
    },
    { items: [customer()], next_cursor: ids.customer },
    { items: [customer(), customer()], next_cursor: null },
    { items: [{ ...customer(), balance_minor: 1.5 }], next_cursor: null },
  ])(
    "rejects foreign/unrequested/duplicate/paginated/invalid results %#",
    async (raw) => {
      const { gateway } = setup(raw);
      await expect(
        gateway.customersByIds!(meA.businesses[0], [ids.customer]),
      ).rejects.toBeDefined();
    },
  );
});
