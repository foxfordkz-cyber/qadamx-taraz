import type { ReactNode } from "react";
export type SellerModule = "sale" | "debts" | "history" | "summary";
/** Integration point owned by seller-web. Import supplied page exports here.
 * Module pages render inside BusinessProvider and useBusiness()/useRuntime().
 * Public pages are outside the authentication guard.
 */
export interface FrontendModules {
  seller: Partial<Record<SellerModule, ReactNode>>;
  public: Partial<Record<"home" | "venue" | "shop", ReactNode>>;
}
export const modules: FrontendModules = { seller: {}, public: {} };
