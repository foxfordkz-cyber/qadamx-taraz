import type { TranslationKey } from "../shared/i18n";

// Only this non-identifying marker survives a tab reload. Never store credentials.
const pendingKey = "qadam.registration.pending";
export function hasPendingConfirmation() {
  try {
    return sessionStorage.getItem(pendingKey) === "1";
  } catch {
    return false;
  }
}
export function rememberConfirmation(pending: boolean) {
  try {
    if (pending) sessionStorage.setItem(pendingKey, "1");
    else sessionStorage.removeItem(pendingKey);
  } catch {
    // The flow still works in memory when browser storage is unavailable.
  }
}

export function registrationErrorKey(error: unknown): TranslationKey {
  const value = error as {
    code?: string;
    status?: number;
    name?: string;
  } | null;
  if (
    value?.status === 429 ||
    value?.code === "over_email_send_rate_limit" ||
    value?.code === "over_request_rate_limit"
  )
    return "registrationRateLimit";
  if (value?.code === "weak_password") return "registrationWeakPassword";
  if (
    value?.code === "email_address_invalid" ||
    value?.code === "validation_failed"
  )
    return "registrationValidation";
  if (
    value?.code === "signup_disabled" ||
    value?.code === "email_provider_disabled"
  )
    return "registrationUnavailable";
  if (value?.name === "AuthRetryableFetchError" || error instanceof TypeError)
    return "registrationNetwork";
  return "registrationError";
}
export function isExistingEmail(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "user_already_exists" || code === "email_exists";
}
