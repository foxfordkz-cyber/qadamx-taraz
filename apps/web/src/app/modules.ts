import { createElement, type ReactNode } from "react";
export type SellerModule = "sale" | "debts" | "history" | "summary";
/** Integration point owned by seller-web. Import supplied page exports here.
 * Module pages render inside BusinessProvider and useBusiness()/useRuntime().
 * Public pages are outside the authentication guard.
 */
export interface FrontendModules {
  seller: Partial<Record<SellerModule, ReactNode>>;
  public: Partial<Record<"home" | "venue" | "shop", ReactNode>>;
}
import { Sale } from "../features/voice/Sale";
import { Debts, History } from "../features/ledger/Ledger";
import { Summary } from "../features/summary/Summary";
import Explore from "../features/explore/ExplorePage";
import Venue from "../features/explore/VenuePage";
import Shop from "../features/explore/ShopPage";
export const modules: FrontendModules = {
  seller: {
    sale: createElement(Sale),
    debts: createElement(Debts),
    history: createElement(History),
    summary: createElement(Summary),
  },
  public: {
    home: createElement(Explore),
    venue: createElement(Venue),
    shop: createElement(Shop),
  },
};
