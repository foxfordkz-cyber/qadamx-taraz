import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth';
import { createApiClient } from '../shared/api/client';
import { createLiveGateway, type SellerGateway } from '../shared/api/gateway';
import { backendBindings } from '../shared/api/bindings';
import type { Business } from '../shared/api/models';
import { demoGateway } from '../shared/demo/gateway';

const RuntimeContext = createContext<{ gateway: SellerGateway; scope: string; drafts: Map<string, unknown> } | null>(null);
export function RuntimeProvider({ children, gateway: override }: { children: ReactNode; gateway?: SellerGateway }) {
  const auth = useAuth();
  const gateway = useMemo(() => override ?? (auth.demo ? demoGateway : createLiveGateway(createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '', getToken: auth.getToken, onUnauthorized: auth.markExpired,
  }), backendBindings)), [override, auth.demo, auth.getToken, auth.markExpired]);
  const drafts = useRef(new Map<string, unknown>()).current;
  return <RuntimeContext.Provider value={{ gateway, scope: auth.scope, drafts }}>{children}</RuntimeContext.Provider>;
}
export function useRuntime() { const value = useContext(RuntimeContext); if (!value) throw new Error('RuntimeProvider required'); return value; }
export function useDraft<T>(key: string, initial: T): [T, (value: T) => void] {
  const { drafts } = useRuntime();
  const [value, setValue] = useState<T>(() => drafts.has(key) ? drafts.get(key) as T : initial);
  return [value, next => { drafts.set(key, next); setValue(next); }];
}
const BusinessContext = createContext<{ business: Business; businesses: Business[]; selectBusiness: (id: string) => void } | null>(null);
export function useMemberships() {
  const { gateway, scope } = useRuntime(); const auth = useAuth();
  return useQuery({ queryKey: [scope, 'me'], queryFn: ({ signal }) => gateway.me(signal), enabled: (auth.demo || !!auth.session) && !auth.expired });
}
export function BusinessProvider({ children, businesses }: { children: ReactNode; businesses: Business[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  // Validate on every render so a revoked membership cannot remain selected.
  const business = businesses.find(item => item.id === selected) ?? businesses[0];
  if (!business) return null;
  return <BusinessContext.Provider value={{ business, businesses, selectBusiness: id => {
    if (businesses.some(item => item.id === id)) setSelected(id);
  } }}>{children}</BusinessContext.Provider>;
}
export function useBusiness() { const value = useContext(BusinessContext); if (!value) throw new Error('BusinessProvider required'); return value; }
