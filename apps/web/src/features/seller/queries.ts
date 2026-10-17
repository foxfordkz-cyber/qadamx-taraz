import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { useAuth } from "../../app/auth";
import type { CustomerInput, InquiryStatus } from "../../shared/api/models";
import { useDebouncedValue } from "../../shared/useDebouncedValue";
import {
  getCustomerRecovery,
  normalizeCustomerApi,
  type RecoveryOwner,
} from "./customer-recovery";

export function useInquiries() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  return useInfiniteQuery({
    queryKey: [scope, business.id, "inquiries"],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      gateway.inquiries(business, pageParam, signal),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchOnWindowFocus: true,
  });
}
export function useInquiryStatus() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      gateway.setInquiryStatus(business, id, status),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: [scope, business.id, "inquiries"],
      });
    },
  });
}
/** Shared with ledger-web: query keys include both identity scope and business UUID. */
export function useCustomers(search: string) {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const normalized = search.trim().normalize("NFC");
  const settled = useDebouncedValue(normalized);
  const query = useInfiniteQuery({
    queryKey: [scope, business.id, "customers", settled],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      gateway.customers(business, settled, pageParam, signal),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  return { ...query, isSearchPending: normalized !== settled };
}
export function useCustomerCreationRecovery(enabled = true) {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const auth = useAuth();
  const client = useQueryClient();
  const apiBase =
    gateway.mode === "live"
      ? normalizeCustomerApi(import.meta.env.VITE_API_BASE_URL)
      : null;
  const userId = auth.session?.user.id;
  const entry = useMemo(
    () => getCustomerRecovery(scope, apiBase, userId, business.id),
    [scope, apiBase, userId, business.id],
  );
  const { coordinator } = entry;
  const live = useRef({ coordinator, enabled });
  live.current = { coordinator, enabled };
  const owner = useMemo<RecoveryOwner>(
    () => ({
      active: false,
      current: () =>
        live.current.coordinator === coordinator && live.current.enabled,
    }),
    [coordinator],
  );
  const request = {
    gateway,
    business,
    onComplete: () => {
      void client.invalidateQueries({
        queryKey: [scope, business.id, "customers"],
      });
    },
  };
  const latestRequest = useRef(request);
  latestRequest.current = request;
  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  );
  useEffect(() => {
    if (!enabled) return;
    owner.active = true;
    coordinator.attach(owner);
    void coordinator.check(owner, latestRequest.current);
    return () => {
      owner.active = false;
      coordinator.detach(owner);
      entry.release();
    };
  }, [coordinator, enabled, entry, owner]);
  return {
    ...snapshot,
    resolvedCustomer:
      snapshot.completionOwner === owner ? snapshot.resolvedCustomer : null,
    busy: snapshot.state === "checking" || snapshot.state === "saving",
    check: () => coordinator.check(owner, latestRequest.current),
    create: (input: CustomerInput) =>
      coordinator.create(owner, input, latestRequest.current),
  };
}
export function useCatalog() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  return useQuery({
    queryKey: [scope, business.id, "catalog"],
    queryFn: ({ signal }) => gateway.catalog(business, signal),
  });
}
