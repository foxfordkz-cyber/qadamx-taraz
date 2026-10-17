import { ApiError } from "./client";
import type { components } from "./generated";
import type {
  CatalogItem,
  Customer,
  CustomerInput,
  Inquiry,
  Page,
  SellerIdentity,
} from "./models";
export interface BackendBindings {
  me: (raw: unknown) => SellerIdentity;
  inquiries: (raw: unknown) => Page<Inquiry>;
  customers: (raw: unknown) => Page<Customer>;
  customerBody: (
    input: CustomerInput,
  ) => components["schemas"]["CustomerCreate"];
  customer: (raw: unknown) => Customer;
  customerCreationResult: (raw: unknown) => CustomerCreationResult;
  catalog: (raw: unknown) => Page<CatalogItem>;
}
export type CustomerCreationResult =
  | { status: "completed"; customer: Customer }
  | { status: "not_observed"; customer: null };
const invalid = (): never => {
  throw new ApiError(0, "INVALID_RESPONSE");
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, min = 0, max = Infinity): string {
  if (
    typeof value !== "string" ||
    Array.from(value).length < min ||
    Array.from(value).length > max
  )
    return invalid();
  return value;
}
export function readUuid(value: unknown): string {
  const result = text(value);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result,
    )
  )
    return invalid();
  return result;
}
export function readMe(raw: unknown): SellerIdentity {
  const data = object(raw);
  if (!Array.isArray(data.businesses)) return invalid();
  const response: components["schemas"]["MeResponse"] = {
    id: readUuid(data.id),
    businesses: data.businesses.map((rawBusiness) => {
      const business = object(rawBusiness);
      if (business.role !== undefined && business.role !== "owner")
        return invalid();
      return {
        id: readUuid(business.id),
        slug: text(business.slug, 1),
        name: text(business.name, 1),
        role: "owner",
      };
    }),
  };
  if (
    new Set(response.businesses.map((item) => item.id)).size !==
    response.businesses.length
  )
    return invalid();
  return response;
}
export function readCustomer(raw: unknown): Customer {
  const data = object(raw);
  if (
    !Number.isSafeInteger(data.balance_minor) ||
    (data.balance_minor as number) < 0
  )
    return invalid();
  const response: components["schemas"]["CustomerResponse"] = {
    id: readUuid(data.id),
    business_id: readUuid(data.business_id),
    display_name: text(data.display_name, 1, 200),
    note: data.note === undefined ? "" : text(data.note, 0, 2000),
    contact: data.contact == null ? null : text(data.contact, 0, 200),
    balance_minor: data.balance_minor as number,
  };
  return {
    ...response,
    note: response.note ?? "",
    contact: response.contact ?? null,
  };
}
export function readCustomers(raw: unknown): Page<Customer> {
  const data = object(raw);
  if (!Array.isArray(data.items)) return invalid();
  const items = data.items.map(readCustomer);
  if (new Set(items.map((item) => item.id)).size !== items.length)
    return invalid();
  return {
    items,
    next_cursor: data.next_cursor == null ? null : readUuid(data.next_cursor),
  };
}
export function customerBody(
  input: CustomerInput,
): components["schemas"]["CustomerCreate"] {
  const display_name = input.display_name.trim();
  const note = input.note.trim();
  const contact = input.contact.trim() || null;
  if (
    !display_name ||
    Array.from(display_name).length > 200 ||
    Array.from(note).length > 2000 ||
    Array.from(contact ?? "").length > 200
  )
    throw new ApiError(422, "VALIDATION_ERROR");
  return { display_name, note, contact };
}
export function readCustomerCreationResult(
  raw: unknown,
): CustomerCreationResult {
  const data = object(raw);
  if (data.status === "completed") {
    const customer = readCustomer(data.customer);
    return { status: "completed", customer };
  }
  if (data.status === "not_observed" && data.customer === null)
    return { status: "not_observed", customer: null };
  return invalid();
}
export function customerInputErrors(
  input: CustomerInput,
): Partial<Record<keyof CustomerInput, "required" | "tooLong">> {
  const name = input.display_name.trim();
  const note = input.note.trim();
  const contact = input.contact.trim();
  return {
    ...(name.length === 0
      ? { display_name: "required" as const }
      : Array.from(name).length > 200
        ? { display_name: "tooLong" as const }
        : {}),
    ...(Array.from(note).length > 2000 ? { note: "tooLong" as const } : {}),
    ...(Array.from(contact).length > 200
      ? { contact: "tooLong" as const }
      : {}),
  };
}
export function readInquiries(raw: unknown): Page<Inquiry> {
  const data = object(raw);
  if (!Array.isArray(data.items)) return invalid();
  return {
    items: data.items.map((raw) => {
      const r = object(raw);
      if (!["new", "in_progress", "closed"].includes(String(r.status)))
        return invalid();
      return {
        id: readUuid(r.id),
        business_id: readUuid(r.business_id),
        visitor_name: text(r.visitor_name, 1, 100),
        contact: text(r.contact, 1, 200),
        message: text(r.message, 1, 2000),
        status: r.status as Inquiry["status"],
        created_at: text(r.created_at, 1),
      };
    }),
    next_cursor: data.next_cursor == null ? null : readUuid(data.next_cursor),
  };
}
export function readCatalog(raw: unknown): Page<CatalogItem> {
  const data = object(raw),
    businessId = readUuid(data.id);
  if (!Array.isArray(data.catalog)) return invalid();
  return {
    items: data.catalog.map((raw) => {
      const r = object(raw);
      if (
        r.business_id !== businessId ||
        !(
          r.price_minor === null ||
          (Number.isSafeInteger(r.price_minor) && Number(r.price_minor) >= 0)
        ) ||
        typeof r.available !== "boolean" ||
        typeof r.is_demo !== "boolean"
      )
        return invalid();
      return {
        id: readUuid(r.id),
        business_id: businessId,
        name: text(r.name, 1),
        price_minor: r.price_minor as number | null,
        available: r.available,
        is_demo: r.is_demo,
      };
    }),
    next_cursor: null,
  };
}
/** Bindings for the single API's generated 0.6.2 contract. */
export const backendBindings: Partial<BackendBindings> = {
  inquiries: readInquiries,
  catalog: readCatalog,
  me: readMe,
  customers: readCustomers,
  customer: readCustomer,
  customerCreationResult: readCustomerCreationResult,
  customerBody,
};
