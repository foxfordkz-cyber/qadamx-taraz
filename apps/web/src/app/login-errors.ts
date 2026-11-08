import type { TranslationKey } from "../shared/i18n";

export function loginErrorKey(
  error: unknown,
  online = navigator.onLine,
): TranslationKey {
  if (!online) return "authOffline";
  const e = error as { code?: string; status?: number; name?: string } | null;
  if (e?.code === "invalid_credentials") return "authBadCredentials";
  if (e?.code === "email_not_confirmed") return "authEmailPending";
  if (e?.status === 429) return "authRateLimit";
  if (e?.code === "AUTH_UNAVAILABLE" || (e?.status && e.status >= 500))
    return "authRestoreUnavailable";
  if (e?.name === "AuthRetryableFetchError" || error instanceof TypeError)
    return "authConnection";
  return "authError";
}
