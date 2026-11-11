import type { Customer } from "../../shared/api/models";
import type { Draft } from "../ledger/data";

/** Volatile RuntimeProvider memory, never Web Storage/IndexedDB. Cleared on logout. */
export interface VoiceMemory {
  text: string;
  file: File | null;
  inputLocale: "ru" | "kk" | "auto" | null;
  kind: string;
  saleId: string;
  total: string;
  paid: string;
  amount: string;
  description: string;
  customer: Customer | null;
  draft: Draft | null;
  clarification: string;
  needsAnalysis: boolean;
  manual: boolean;
  retryAt: number;
  expiresAt: number;
}
export function restoreVoiceMemory(store: Map<string, unknown>, key: string) {
  const cached = store.get(key) as VoiceMemory | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached;
  store.delete(key);
  return undefined;
}
