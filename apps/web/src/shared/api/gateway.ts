import { ApiError, type ApiClient } from "./client";
import {
  readUuid,
  type BackendBindings,
  type CustomerCreationResult,
} from "./bindings";
import type {
  Business,
  CatalogItem,
  Customer,
  CustomerInput,
  Inquiry,
  InquiryStatus,
  Page,
  SellerIdentity,
} from "./models";

export interface SellerGateway {
  readonly mode: "live" | "demo";
  readonly canWrite: boolean;
  readonly canCreateCustomer?: boolean;
  readonly canUpdateInquiry?: boolean;
  me(signal?: AbortSignal): Promise<SellerIdentity>;
  inquiries(
    business: Business,
    cursor: string | null,
    signal?: AbortSignal,
  ): Promise<Page<Inquiry>>;
  setInquiryStatus(
    business: Business,
    id: string,
    status: InquiryStatus,
  ): Promise<void>;
  customers(
    business: Business,
    search: string,
    cursor: string | null,
    signal?: AbortSignal,
  ): Promise<Page<Customer>>;
  customersByIds?(
    business: Business,
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<Page<Customer>>;
  createCustomer(
    business: Business,
    input: CustomerInput,
    idempotencyKey?: string,
    signal?: AbortSignal,
  ): Promise<Customer>;
  customerCreationResult?(
    business: Business,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<CustomerCreationResult>;
  catalog(business: Business, signal?: AbortSignal): Promise<Page<CatalogItem>>;
}

export function createLiveGateway(
  api: ApiClient,
  bindings: Partial<BackendBindings>,
  expectedUserId?: string,
  options: { customerIds?: boolean } = {},
): SellerGateway {
  const requireBinding = <K extends keyof BackendBindings>(
    key: K,
  ): BackendBindings[K] => {
    const binding = bindings[key];
    if (!binding) throw new ApiError(0, "CONTRACT_PENDING");
    return binding;
  };
  const path = (b: Business) => `/businesses/${encodeURIComponent(b.id)}`;
  return {
    mode: "live",
    canCreateCustomer: !!(bindings.customerBody && bindings.customer),
    canUpdateInquiry: !!bindings.inquiries,
    canWrite: !!(
      bindings.customerBody &&
      bindings.customer &&
      bindings.inquiries
    ),
    async me(signal) {
      const raw = await api.request("/me", { signal });
      const identity = requireBinding("me")(raw);
      if (expectedUserId && identity.id !== expectedUserId)
        throw new ApiError(403, "ACCESS_DENIED");
      return identity;
    },
    async inquiries(b, cursor, signal) {
      const read = requireBinding("inquiries");
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const result = read(
        await api.request(`${path(b)}/inquiries${query}`, { signal }),
      );
      if (result.items.some((row) => row.business_id !== b.id))
        throw new ApiError(403, "ACCESS_DENIED");
      return result;
    },
    async setInquiryStatus(b, id, status) {
      requireBinding("inquiries");
      await api.request(`${path(b)}/inquiries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    async customers(b, search, cursor, signal) {
      const read = requireBinding("customers");
      const query = new URLSearchParams({ q: search });
      if (cursor) query.set("cursor", cursor);
      query.set("limit", "50");
      const page = read(
        await api.request(`${path(b)}/customers?${query}`, { signal }),
      );
      if (page.items.some((customer) => customer.business_id !== b.id))
        throw new ApiError(403, "ACCESS_DENIED");
      return page;
    },
    // Opt-in only after the backend rollout. Old servers silently ignore ids.
    ...(options.customerIds
      ? {
          async customersByIds(
            b: Business,
            ids: readonly string[],
            signal?: AbortSignal,
          ) {
            if (ids.length === 0) return { items: [], next_cursor: null };
            if (ids.length > 100) throw new ApiError(422, "VALIDATION_ERROR");
            const requested = new Set(
              ids.map((id) => readUuid(id).toLowerCase()),
            );
            const query = new URLSearchParams();
            requested.forEach((id) => query.append("ids", id));
            const page = requireBinding("customers")(
              await api.request(`${path(b)}/customers?${query}`, { signal }),
            );
            if (page.items.some((customer) => customer.business_id !== b.id))
              throw new ApiError(403, "ACCESS_DENIED");
            if (
              page.next_cursor !== null ||
              page.items.some(
                (customer) => !requested.has(customer.id.toLowerCase()),
              )
            )
              throw new ApiError(0, "INVALID_RESPONSE");
            return page;
          },
        }
      : {}),
    async createCustomer(b, input, idempotencyKey, signal) {
      const body = requireBinding("customerBody")(input);
      const read = requireBinding("customer");
      const customer = read(
        await api.request(`${path(b)}/customers`, {
          method: "POST",
          signal,
          headers: idempotencyKey
            ? { "Idempotency-Key": idempotencyKey }
            : undefined,
          body: JSON.stringify(body),
        }),
      );
      if (customer.business_id !== b.id)
        throw new ApiError(403, "ACCESS_DENIED");
      return customer;
    },
    async customerCreationResult(b, idempotencyKey, signal) {
      const read = requireBinding("customerCreationResult");
      const result = read(
        await api.request(`${path(b)}/customer-creation-result`, {
          headers: { "Idempotency-Key": idempotencyKey },
          signal,
          cache: "no-store",
        }),
      );
      if (result.status === "completed" && result.customer.business_id !== b.id)
        throw new ApiError(403, "ACCESS_DENIED");
      return result;
    },
    async catalog(b, signal) {
      const read = requireBinding("catalog");
      // Contract has no private GET /catalog. Use the documented public shop-by-slug endpoint.
      const result = read(
        await api.request(`/businesses/${encodeURIComponent(b.slug)}`, {
          signal,
        }),
      );
      if (result.items.some((row) => row.business_id !== b.id))
        throw new ApiError(403, "ACCESS_DENIED");
      return result;
    },
  };
}
