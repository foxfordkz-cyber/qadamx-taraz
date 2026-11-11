import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { createApiClient, type ApiClient } from "../shared/api/client";
import { createLiveGateway, type SellerGateway } from "../shared/api/gateway";
import { backendBindings } from "../shared/api/bindings";
import type { Business } from "../shared/api/models";
import { demoGateway } from "../shared/demo/gateway";

const RuntimeContext = createContext<{
  api: ApiClient;
  gateway: SellerGateway;
  scope: string;
  drafts: Map<string, unknown>;
} | null>(null);
export function RuntimeProvider({
  children,
  gateway: override,
}: {
  children: ReactNode;
  gateway?: SellerGateway;
}) {
  const auth = useAuth();
  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
        getToken: auth.getToken,
        onUnauthorized: auth.markExpired,
      }),
    [auth.getToken, auth.markExpired],
  );
  const gateway = useMemo(
    () =>
      override ??
      (auth.demo
        ? demoGateway
        : createLiveGateway(api, backendBindings, auth.session?.user.id, {
            customerIds: import.meta.env.VITE_CUSTOMER_IDS_ENABLED === "true",
          })),
    [override, auth.demo, auth.session?.user.id, api],
  );
  const drafts = useRef(new Map<string, unknown>()).current;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if ([...drafts.keys()].some((key) => key.endsWith(":money-pending"))) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [drafts]);
  return (
    <RuntimeContext.Provider
      value={{ api, gateway, scope: auth.scope, drafts }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}
export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("RuntimeProvider required");
  return value;
}
export function useDraft<T>(key: string, initial: T): [T, (value: T) => void] {
  const { drafts } = useRuntime();
  const [value, setValue] = useState<T>(() =>
    drafts.has(key) ? (drafts.get(key) as T) : initial,
  );
  return [
    value,
    (next) => {
      drafts.set(key, next);
      setValue(next);
    },
  ];
}
const BusinessContext = createContext<{
  business: Business;
  businesses: Business[];
  selectBusiness: (id: string) => void;
} | null>(null);
export function useMemberships() {
  const { gateway, scope } = useRuntime();
  const auth = useAuth();
  return useQuery({
    queryKey: [scope, "me"],
    queryFn: ({ signal }) => gateway.me(signal),
    retry: false,
    enabled: (auth.demo || !!auth.session) && !auth.expired,
  });
}
export function BusinessProvider({
  children,
  businesses,
  userId,
}: {
  children: ReactNode;
  businesses: Business[];
  userId?: string;
}) {
  const selectionKey = userId ? `qadam:selected-business:${userId}` : null;
  const [selection, setSelection] = useState(() => {
    try {
      return {
        key: selectionKey,
        id: selectionKey ? sessionStorage.getItem(selectionKey) : null,
      };
    } catch {
      return { key: selectionKey, id: null };
    }
  });
  const selected = selection.key === selectionKey ? selection.id : null;
  // Validate on every render so a revoked membership cannot remain selected.
  const business =
    businesses.find((item) => item.id === selected) ?? businesses[0];
  if (!business) return null;
  return (
    <BusinessContext.Provider
      value={{
        business,
        businesses,
        selectBusiness: (id) => {
          if (!businesses.some((item) => item.id === id)) return;
          setSelection({ key: selectionKey, id });
          // Preference only, never authority: the current /me list is checked above.
          // Storage denial must not break the seller's in-memory selection.
          if (selectionKey) {
            try {
              sessionStorage.setItem(selectionKey, id);
            } catch {
              /* Storage disabled. */
            }
          }
        },
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}
export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("BusinessProvider required");
  return value;
}
