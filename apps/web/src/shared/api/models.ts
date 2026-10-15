/** Frontend views based on documented model fields. NOT generated backend response schemas.
 * Response envelopes and write payloads require confirmed OpenAPI bindings; see bindings.ts.
 */
export interface Business {
  id: string;
  slug: string;
  name: string;
  is_demo?: boolean;
}
export interface SellerIdentity {
  id?: string;
  businesses: Business[];
}
export type InquiryStatus = "new" | "in_progress" | "closed";
export interface Inquiry {
  id: string;
  business_id: string;
  visitor_name: string;
  contact: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
}
export interface Customer {
  balance_minor?: number;
  id: string;
  business_id: string;
  display_name: string;
  note: string | null;
  contact: string | null;
}
export interface CustomerInput {
  display_name: string;
  note: string;
  contact: string;
}
export interface CatalogItem {
  id: string;
  business_id: string;
  name: string;
  price_minor: number | null;
  available: boolean;
  is_demo: boolean;
}
export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}
