import { describe, expect, it, vi } from "vitest";
import examples from "../../../../packages/contracts/examples.json";
import {
  backendBindings,
  customerBody,
  readCustomer,
  readCustomers,
  readMe,
} from "../shared/api/bindings";
import { createLiveGateway } from "../shared/api/gateway";
import { createApiClient } from "../shared/api/client";

const business = readMe(examples.MeResponse).businesses[0];
describe("approved 193f6e5 response bindings (contract fixtures, not a database)", () => {
  it("requires a fresh token and signals reauthentication before any fetch", async () => {
    const fetcher = vi.fn();
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: "http://127.0.0.1:8000/api/v1",
      getToken: async () => null,
      fetcher,
      onUnauthorized,
    });
    await expect(api.request("/me")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reads memberships without inventing is_demo", () => {
    expect(readMe(examples.MeResponse).businesses[0]).toMatchObject({
      id: business.id,
      name: examples.MeResponse.businesses[0].name,
    });
    expect(readMe(examples.MeResponse).businesses[0].is_demo).toBeUndefined();
  });
  it.each([
    null,
    {},
    { id: "bad", businesses: [] },
    {
      ...examples.MeResponse,
      businesses: [{ ...examples.MeResponse.businesses[0], role: "admin" }],
    },
  ])("rejects malformed identity", (raw) => {
    expect(() => readMe(raw)).toThrow();
  });
  it("reads the server balance and accepts duplicate names with different IDs", () => {
    const first = examples.CustomerResponse;
    const second = { ...first, id: "20000000-0000-4000-8000-000000000099" };
    expect(
      readCustomers({ items: [first, second], next_cursor: null }).items,
    ).toHaveLength(2);
    expect(readCustomer(first).balance_minor).toBe(first.balance_minor);
  });
  it.each([-1, 1.5, "150000", Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid balances %s",
    (balance_minor) => {
      expect(() =>
        readCustomer({ ...examples.CustomerResponse, balance_minor }),
      ).toThrow();
    },
  );
  it("validates cursor and OpenAPI defaults", () => {
    expect(() =>
      readCustomers({ items: [], next_cursor: "not-uuid" }),
    ).toThrow();
    expect(readCustomers({ items: [] }).next_cursor).toBeNull();
    const raw = { ...examples.CustomerResponse } as Record<string, unknown>;
    delete raw.note;
    delete raw.contact;
    expect(readCustomer(raw)).toMatchObject({ note: "", contact: null });
  });
  it("builds exactly CustomerCreate with optional null contact", () => {
    expect(
      customerBody({
        display_name: "  Әсел  ",
        note: " Павильон ",
        contact: " ",
      }),
    ).toEqual({ display_name: "Әсел", note: "Павильон", contact: null });
    expect(() =>
      customerBody({ display_name: " ", note: "", contact: "" }),
    ).toThrow();
    expect(() =>
      customerBody({ display_name: "a", note: "", contact: "x".repeat(201) }),
    ).toThrow();
  });
  it("keeps missing inquiries/catalog unbound and customer writes independent", async () => {
    const request = vi.fn();
    const gateway = createLiveGateway({ request }, backendBindings);
    expect(gateway.canCreateCustomer).toBe(true);
    expect(gateway.canUpdateInquiry).toBe(false);
    await expect(gateway.inquiries(business, null)).rejects.toMatchObject({
      code: "CONTRACT_PENDING",
    });
    await expect(gateway.catalog(business)).rejects.toMatchObject({
      code: "CONTRACT_PENDING",
    });
    await expect(
      gateway.setInquiryStatus(business, "id", "closed"),
    ).rejects.toMatchObject({ code: "CONTRACT_PENDING" });
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects a /me belonging to another identity", async () => {
    const gateway = createLiveGateway(
      { request: async () => examples.MeResponse },
      backendBindings,
      "50000000-0000-4000-8000-000000000099",
    );
    await expect(gateway.me()).rejects.toMatchObject({ status: 403 });
  });
  it("rejects customer responses from a different business for GET and POST", async () => {
    const foreign = {
      ...examples.CustomerResponse,
      business_id: "10000000-0000-4000-8000-000000000099",
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce({ items: [foreign], next_cursor: null })
      .mockResolvedValueOnce(foreign);
    const gateway = createLiveGateway({ request }, backendBindings);
    await expect(gateway.customers(business, "", null)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      gateway.createCustomer(business, {
        display_name: "Test",
        note: "",
        contact: "",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("sends documented URLs, query, Bearer and POST payload through the real transport", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(examples.MeResponse)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [examples.CustomerResponse],
            next_cursor: null,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(examples.CustomerResponse), {
          status: 201,
        }),
      );
    const gateway = createLiveGateway(
      createApiClient({
        baseUrl: "http://127.0.0.1:8000/api/v1",
        getToken: async () => "test-access-token",
        fetcher,
      }),
      backendBindings,
      examples.MeResponse.id,
    );
    await gateway.me();
    await gateway.customers(business, "Әсел", null);
    await gateway.createCustomer(business, {
      display_name: "Әсел",
      note: "",
      contact: "",
    });
    expect(fetcher.mock.calls[1][0]).toContain(
      `/businesses/${business.id}/customers?q=`,
    );
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get("limit")).toBe(
      "50",
    );
    expect(fetcher.mock.calls[2][1].headers.get("Authorization")).toBe(
      "Bearer test-access-token",
    );
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
      display_name: "Әсел",
      note: "",
      contact: null,
    });
  });
});
