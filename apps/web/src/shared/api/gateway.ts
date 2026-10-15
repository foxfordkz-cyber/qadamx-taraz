import { ApiError, type ApiClient } from "./client";
import type { BackendBindings } from "./bindings";
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
  createCustomer(business: Business, input: CustomerInput): Promise<Customer>;
  catalog(business: Business, signal?: AbortSignal): Promise<Page<CatalogItem>>;
}

export function createLiveGateway(
  api: ApiClient,
  bindings: Partial<BackendBindings>,
  expectedUserId?: string,
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
      return read(
        await api.request(`${path(b)}/inquiries${query}`, { signal }),
      );
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
    async createCustomer(b, input) {
      const body = requireBinding("customerBody")(input);
      const read = requireBinding("customer");
      const customer = read(
        await api.request(`${path(b)}/customers`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
      if (customer.business_id !== b.id)
        throw new ApiError(403, "ACCESS_DENIED");
      return customer;
    },
    async catalog(b, signal) {
      const read = requireBinding("catalog");
      // Contract has no private GET /catalog. Use the documented public shop-by-slug endpoint.
      return read(
        await api.request(`/businesses/${encodeURIComponent(b.slug)}`, {
          signal,
        }),
      );
    },
  };
}
