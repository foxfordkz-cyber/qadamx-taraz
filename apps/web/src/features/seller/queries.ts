import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { useAuth } from "../../app/auth";
import { ApiError } from "../../shared/api/client";
import {
  backendBindings,
  type CustomerCreationResult,
} from "../../shared/api/bindings";
import type {
  Customer,
  CustomerInput,
  InquiryStatus,
} from "../../shared/api/models";
import { useDebouncedValue } from "../../shared/useDebouncedValue";

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
type CustomerCreationIntent = { key: string; bodyHash: string };
type CustomerRecoveryState =
  | "idle"
  | "checking"
  | "unknown"
  | "unavailable"
  | "storage-error"
  | "complete";

const customerIntentStorageKey = (userId: string, businessId: string) =>
  `qadam.customer-create.v1:${userId}:${businessId}`;

function loadCustomerIntent(storageKey: string | null): {
  record: CustomerCreationIntent | null;
  state: CustomerRecoveryState;
} {
  if (!storageKey) return { record: null, state: "unavailable" };
  try {
    return { record: readCustomerIntent(storageKey), state: "idle" };
  } catch {
    return { record: null, state: "storage-error" };
  }
}

function readCustomerIntent(storageKey: string): CustomerCreationIntent | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Invalid saved customer creation intent");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved customer creation intent");
  const saved = value as Record<string, unknown>;
  if (
    typeof saved.key !== "string" ||
    !/^[!-~]{1,200}$/.test(saved.key) ||
    typeof saved.bodyHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(saved.bodyHash)
  )
    throw new Error("Invalid saved customer creation intent");
  return { key: saved.key, bodyHash: saved.bodyHash };
}

function makeIdempotencyKey(): string {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function hashCustomerBody(input: CustomerInput): Promise<string> {
  const createBody = backendBindings.customerBody;
  if (!createBody) throw new ApiError(0, "CONTRACT_PENDING");
  const body = createBody(input);
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function completedCustomer(
  result: CustomerCreationResult,
  businessId: string,
): Customer | null {
  if (result.status === "not_observed") return null;
  if (result.customer.business_id !== businessId)
    throw new ApiError(403, "ACCESS_DENIED");
  return result.customer;
}

export function useCustomerCreationRecovery(enabled = true) {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const auth = useAuth();
  const client = useQueryClient();
  const userId =
    auth.session?.user.id ??
    (auth.demo && gateway.mode === "live" ? `demo-${scope}` : undefined);
  const storageKey =
    gateway.mode === "live" && userId
      ? customerIntentStorageKey(userId, business.id)
      : null;
  const [initialIntent] = useState(() => loadCustomerIntent(storageKey));
  const [record, setRecord] = useState(initialIntent.record);
  const [state, setState] = useState(initialIntent.state);
  const [error, setError] = useState<unknown>(null);
  const [bodyMismatch, setBodyMismatch] = useState(false);
  const [resolvedCustomer, setResolvedCustomer] = useState<Customer | null>(
    null,
  );
  const busyRef = useRef(false);
  const initialRecoveryStarted = useRef(false);

  const lookup = useCallback(
    async (key: string) => {
      if (!gateway.customerCreationResult)
        throw new ApiError(0, "CONTRACT_PENDING");
      return gateway.customerCreationResult(business, key);
    },
    [business, gateway],
  );

  const clearIntent = useCallback(() => {
    if (storageKey) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (storageError) {
        setError(storageError);
      }
    }
    setRecord(null);
  }, [storageKey]);

  const finish = useCallback(
    (customer: Customer) => {
      clearIntent();
      setBodyMismatch(false);
      setResolvedCustomer(customer);
      setState("complete");
      void client.invalidateQueries({
        queryKey: [scope, business.id, "customers"],
      });
    },
    [business.id, clearIntent, client, scope],
  );

  const checkResult = useCallback(async () => {
    if (!record || busyRef.current) return;
    busyRef.current = true;
    setState("checking");
    setError(null);
    setBodyMismatch(false);
    try {
      const result = await lookup(record.key);
      const customer = completedCustomer(result, business.id);
      if (customer) finish(customer);
      else setState("unknown");
    } catch (lookupError) {
      setError(lookupError);
      setState("unknown");
    } finally {
      busyRef.current = false;
    }
  }, [business.id, finish, lookup, record]);

  useEffect(() => {
    if (!enabled || !record || initialRecoveryStarted.current) return;
    initialRecoveryStarted.current = true;
    void checkResult();
  }, [checkResult, enabled, record]);

  const create = useCallback(
    async (input: CustomerInput) => {
      if (busyRef.current || !enabled) return;
      if (!storageKey || !userId || gateway.mode !== "live") {
        setError(new ApiError(0, "CONTRACT_PENDING"));
        setState("unavailable");
        return;
      }
      busyRef.current = true;
      setState("checking");
      setError(null);
      setBodyMismatch(false);
      setResolvedCustomer(null);
      let intent = record;
      const isNewIntent = !intent;
      try {
        const bodyHash = await hashCustomerBody(input);
        if (intent && intent.bodyHash !== bodyHash) {
          setBodyMismatch(true);
          setState("unknown");
          return;
        }

        if (!intent) {
          const key = makeIdempotencyKey();
          const beforeCreate = await lookup(key);
          const existingCustomer = completedCustomer(beforeCreate, business.id);
          if (existingCustomer) {
            finish(existingCustomer);
            return;
          }
          const newIntent = { key, bodyHash };
          window.localStorage.setItem(storageKey, JSON.stringify(newIntent));
          intent = newIntent;
          setRecord(intent);
          initialRecoveryStarted.current = true;
        } else {
          const previousResult = await lookup(intent.key);
          const existingCustomer = completedCustomer(
            previousResult,
            business.id,
          );
          if (existingCustomer) {
            finish(existingCustomer);
            return;
          }
        }

        try {
          const customer = await gateway.createCustomer(
            business,
            input,
            intent.key,
          );
          if (customer.business_id !== business.id)
            throw new ApiError(403, "ACCESS_DENIED");
          finish(customer);
        } catch (postError) {
          if (
            isNewIntent &&
            postError instanceof ApiError &&
            [401, 404, 422].includes(postError.status)
          ) {
            clearIntent();
            setError(postError);
            setState("idle");
            return;
          }
          try {
            const afterCreate = await lookup(intent.key);
            const customer = completedCustomer(afterCreate, business.id);
            if (customer) {
              finish(customer);
              return;
            }
            setError(null);
          } catch (lookupError) {
            setError(lookupError);
          }
          setState("unknown");
        }
      } catch (requestError) {
        setError(requestError);
        setState(intent ? "unknown" : "unavailable");
      } finally {
        busyRef.current = false;
      }
    },
    [
      business,
      clearIntent,
      enabled,
      finish,
      gateway,
      lookup,
      record,
      storageKey,
      userId,
    ],
  );

  return {
    record,
    state,
    error,
    bodyMismatch,
    resolvedCustomer,
    busy: state === "checking",
    check: checkResult,
    create,
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
