import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ApiError } from "../shared/api/client";
const state = vi.hoisted(() => ({
  business: { id: "business-A" },
  runtime: {
    scope: "user-A",
    drafts: new Map<string, unknown>(),
    gateway: { mode: "live" },
    api: { request: vi.fn() },
  },
}));
vi.mock("../app/runtime", () => ({
  useBusiness: () => ({ business: state.business }),
  useRuntime: () => state.runtime,
}));
import { toMinor, readDraft, useWrite } from "../features/ledger/data";
const body = {
  kind: "sale" as const,
  description: "demo",
  total_minor: 300000,
  received_minor: 300000,
};
function hook() {
  const client = new QueryClient();
  return renderHook(() => useWrite(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
beforeEach(() => {
  state.business = { id: "business-A" };
  state.runtime.scope = "user-A";
  state.runtime.drafts = new Map();
  state.runtime.api.request.mockReset();
});
describe("ledger transport with stubbed API (not live money)", () => {
  it("parses decimal tenge without rounding or accepting exponent/negative/blank", () => {
    expect(toMinor("3000")).toBe(300000);
    expect(toMinor("0,01")).toBe(1);
    for (const input of ["", "-1", "3e3", "1.001", "100000001"])
      expect(toMinor(input)).toBeNull();
  });
  it("rejects malformed AI values", () => {
    expect(() => readDraft({ kind: "sale", total_minor: "300000" })).toThrow();
  });
  it.each([
    new ApiError(0, "NETWORK_ERROR"),
    new ApiError(503, "DATABASE_UNAVAILABLE"),
    new ApiError(0, "INVALID_RESPONSE"),
  ])("retains exact body/key on unknown result", async (error) => {
    state.runtime.api.request
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        operation: { id: "op", business_id: "business-A" },
        sale_balance_minor: 0,
      });
    const h = hook();
    await act(async () => {
      await h.result.current.write(body);
    });
    expect(h.result.current.pending).not.toBeNull();
    await act(async () => {
      await h.result.current.write({ ...body, total_minor: 999 });
    });
    expect(state.runtime.api.request.mock.calls[1]).toEqual(
      state.runtime.api.request.mock.calls[0],
    );
    expect(h.result.current.pending).toBeNull();
  });
  it("keeps pending per business and drops it at a different identity runtime", async () => {
    state.runtime.api.request.mockRejectedValue(
      new ApiError(0, "NETWORK_ERROR"),
    );
    const a = hook();
    await act(async () => {
      await a.result.current.write(body);
    });
    const pending = a.result.current.pending;
    a.unmount();
    state.business = { id: "business-B" };
    const b = hook();
    expect(b.result.current.pending).toBeNull();
    b.unmount();
    state.business = { id: "business-A" };
    const back = hook();
    expect(back.result.current.pending).toEqual(pending);
    back.unmount();
    state.runtime.scope = "user-B";
    state.runtime.drafts = new Map();
    const other = hook();
    expect(other.result.current.pending).toBeNull();
  });
  it("blocks duplicate click while in-flight", async () => {
    let resolve!: (value: unknown) => void;
    state.runtime.api.request.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const h = hook();
    let request!: Promise<boolean>;
    act(() => {
      request = h.result.current.write(body);
      void h.result.current.write(body);
    });
    expect(state.runtime.api.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({
        operation: { id: "op", business_id: "business-A" },
        sale_balance_minor: 0,
      });
      await request;
    });
  });
  it("rejects a success response from another business and retains the attempt", async () => {
    state.runtime.api.request.mockResolvedValue({
      operation: { id: "op", business_id: "business-B" },
      sale_balance_minor: 0,
    });
    const h = hook();
    await act(async () => {
      expect(await h.result.current.write(body)).toBe(false);
    });
    expect(h.result.current.pending).not.toBeNull();
  });
});
