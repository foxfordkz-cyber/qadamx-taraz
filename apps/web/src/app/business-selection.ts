// This is a tab-local preference, never evidence of authorization. Only the
// current /me membership list may resolve it to an active business.
export function businessSelectionKey(user: string, apiBase: string) {
  return `qadam:business-selection:v1:${JSON.stringify([apiBase, user])}`;
}
export function readBusinessSelection(key?: string): string | null {
  if (!key) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeBusinessSelection(key: string | undefined, id?: string) {
  if (!key) return;
  try {
    if (id) sessionStorage.setItem(key, id);
    else sessionStorage.removeItem(key);
  } catch {
    // Storage-disabled browsers still support the in-memory selection.
  }
}
