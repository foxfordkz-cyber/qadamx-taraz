import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useBusiness, useRuntime } from "../../app/runtime";
import { ApiError } from "../../shared/api/client";
import type { components } from "../../shared/api/generated";
export type Schemas = components["schemas"];
export type Sale = Schemas["OpenSale"];
export type Operation = Schemas["Operation"];
export type Draft = Schemas["DraftResponse"];
export type Pending = { path: string; key: string; body: string };

// Decimal parser retained from PR #7; never multiply a binary floating input.
export function toMinor(value: string) {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const result =
    Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  return result <= 10000000000 ? result : null;
}
export function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new ApiError(0, "INVALID_RESPONSE");
  return raw as Record<string, unknown>;
}
export function money(value: unknown): number {
  if (!Number.isSafeInteger(value)) throw new ApiError(0, "INVALID_RESPONSE");
  return value as number;
}
export function readDraft(raw: unknown): Draft {
  const d = record(raw);
  if (
    typeof d.id !== "string" ||
    typeof d.transcript !== "string" ||
    !["sale", "repayment", "unknown"].includes(String(d.kind)) ||
    !Array.isArray(d.questions) ||
    !d.questions.every((x) => typeof x === "string") ||
    !Array.isArray(d.customer_candidates) ||
    !Array.isArray(d.sale_candidates) ||
    !Array.isArray(d.missing_fields) ||
    typeof d.expires_at !== "string" ||
    !Number.isFinite(Date.parse(d.expires_at))
  )
    throw new ApiError(0, "INVALID_RESPONSE");
  for (const key of ["total_minor", "received_minor", "amount_minor"])
    if (d[key] !== null && money(d[key]) < 0)
      throw new ApiError(0, "INVALID_RESPONSE");
  return d as Draft;
}
export function useLedgerList<T extends Sale | Operation>(query: string) {
  const { api, scope, gateway } = useRuntime();
  const { business } = useBusiness();
  return useInfiniteQuery({
    queryKey: [scope, business.id, "ledger", query],
    initialPageParam: null as string | null,
    enabled: gateway.mode === "live",
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams(query);
      params.set("limit", "50");
      if (pageParam) params.set("cursor", pageParam);
      const page = record(
        await api.request(`/businesses/${business.id}/operations?${params}`, {
          signal,
        }),
      );
      if (
        !Array.isArray(page.items) ||
        !(page.next_cursor === null || typeof page.next_cursor === "string")
      )
        throw new ApiError(0, "INVALID_RESPONSE");
      for (const item of page.items) {
        const row = record(item);
        if (
          typeof row.id !== "string" ||
          ("business_id" in row && row.business_id !== business.id)
        )
          throw new ApiError(0, "INVALID_RESPONSE");
        if ("balance_minor" in row) money(row.balance_minor);
        else {
          money(row.sales_delta_minor);
          money(row.receipts_delta_minor);
        }
      }
      return page as { items: T[]; next_cursor: string | null };
    },
    getNextPageParam: (page) => page.next_cursor,
  });
}
export function uncertain(error: unknown) {
  return (
    !(error instanceof ApiError) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.status === 408
  );
}
// Memory survives route/point changes, but is owned by RuntimeProvider keyed by auth.scope.
// Never store tokens, names, audio or pending financial payloads in localStorage.
export function useWrite() {
  const { api, scope, drafts, gateway } = useRuntime();
  const { business } = useBusiness();
  const storeKey = `${scope}:${business.id}:money-pending`;
  const [pending, setPending] = useState<Pending | null>(
    () => (drafts.get(storeKey) as Pending) ?? null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const lock = useRef(false),
    client = useQueryClient();
  async function write(
    payload?: Schemas["SaleCreate"] | Schemas["RepaymentCreate"],
    reverseId?: string,
  ) {
    if (lock.current || gateway.mode !== "live") return false;
    const request = pending ?? {
      path: `/businesses/${business.id}/operations${reverseId ? `/${reverseId}/reverse` : ""}`,
      key: crypto.randomUUID(),
      body: JSON.stringify(
        reverseId ? { description: "Correction / Түзету" } : payload,
      ),
    };
    if (!pending && !payload && !reverseId) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    drafts.set(storeKey, request);
    setPending(request);
    try {
      const response = record(
        await api.request(request.path, {
          method: "POST",
          headers: { "Idempotency-Key": request.key },
          body: request.body,
        }),
      );
      const op = record(response.operation);
      if (op.business_id !== business.id || typeof op.id !== "string")
        throw new ApiError(0, "INVALID_RESPONSE");
      money(response.sale_balance_minor);
      drafts.delete(storeKey);
      setPending(null);
      await client.invalidateQueries({ queryKey: [scope, business.id] });
      return true;
    } catch (e) {
      setError(e);
      if (!uncertain(e)) {
        drafts.delete(storeKey);
        setPending(null);
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { pending, busy, error, write };
}
