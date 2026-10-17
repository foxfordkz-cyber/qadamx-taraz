import { ApiError } from "../../shared/api/client";
import { ErrorMessage } from "../../shared/ui";
import { TechDetails } from "../ledger/TechDetails";
import { useVoiceText } from "./i18n";

// One message per failure: a known AI/audio reason; otherwise the caller's fallback
// for server/unknown failures and the shared message (login, access…) for the rest.
export function AnalysisError({
  error,
  fallback,
}: {
  error: unknown;
  fallback?: string;
}) {
  const { v } = useVoiceText();
  const serverSide =
    !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
  const generic =
    fallback && serverSide ? (
      <>
        <p>{fallback}</p>
        <TechDetails error={error} />
      </>
    ) : (
      <ErrorMessage error={error} />
    );
  if (!(error instanceof ApiError)) return generic;
  const key =
    error.status === 429 || error.code === "AI_QUOTA_EXCEEDED"
      ? "quotaError"
      : error.code === "AI_TIMEOUT" || error.status === 504
        ? "timeout"
        : error.code === "NETWORK_ERROR"
          ? "networkError"
          : error.status === 413 ||
              error.status === 415 ||
              error.code.startsWith("AUDIO_")
            ? "audioError"
            : error.code === "INVALID_RESPONSE" ||
                error.code === "AI_INVALID_RESPONSE"
              ? "invalidResponse"
              : error.code.startsWith("AI_")
                ? "providerError"
                : null;
  return key ? (
    <>
      <p>{v(key)}</p>
      <TechDetails error={error} />
    </>
  ) : (
    generic
  );
}
