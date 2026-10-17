import { useQueries } from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import type { Customer } from "../../shared/api/models";
import { useCustomers } from "../seller/queries";

/** Resolve only visible rows/filter, in bounded batches scoped to the current session. */
export function useLedgerCustomers(customerIds: (string | null | undefined)[]) {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const lookup = gateway.customersByIds;
  // Preserve the deployed list behavior until the backend rollout is approved.
  const directory = useCustomers("", !lookup);
  const ids = [
    ...new Set(
      customerIds
        .filter((id): id is string => !!id)
        .map((id) => id.toLowerCase()),
    ),
  ].sort();
  const batches: string[][] = [];
  if (lookup)
    for (let start = 0; start < ids.length; start += 100)
      batches.push(ids.slice(start, start + 100));
  const results = useQueries({
    queries: batches.map((batch) => ({
      queryKey: [scope, business.id, "customers-by-id", batch],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        lookup!(business, batch, signal),
    })),
  });
  const customers = lookup
    ? results.flatMap((result) => result.data?.items ?? [])
    : (directory.data?.pages.flatMap((page) => page.items) ?? []);
  return new Map<string, Customer>(
    customers.map((customer) => [customer.id.toLowerCase(), customer]),
  );
}
