import { ApiError } from "../../shared/api/client";
import { ErrorMessage } from "../../shared/ui";
import { useVoiceText } from "./i18n";

export function AnalysisError({ error }: { error: unknown }) {
  const { v } = useVoiceText();
  if (!(error instanceof ApiError)) return <ErrorMessage error={error} />;
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
      {error.metadata.requestId && (
        <small>
          {v("supportCode")}: {error.metadata.requestId}
        </small>
      )}
    </>
  ) : (
    <ErrorMessage error={error} />
  );
}
