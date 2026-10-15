import type { CatalogItem, Customer, CustomerInput, Inquiry, Page, SellerIdentity } from './models';

/** The repository has a proposed contract, but no /me example, customer POST body,
 * catalog response envelope or OpenAPI. Leave these unbound rather than guess.
 * Fill from captain-approved generated schemas and validated real examples.
 */
export interface BackendBindings {
  me: (raw: unknown) => SellerIdentity;
  inquiries: (raw: unknown) => Page<Inquiry>;
  customers: (raw: unknown) => Page<Customer>;
  customerBody: (input: CustomerInput) => unknown;
  customer: (raw: unknown) => Customer;
  catalog: (raw: unknown) => Page<CatalogItem>;
}
export const backendBindings: Partial<BackendBindings> = {};
