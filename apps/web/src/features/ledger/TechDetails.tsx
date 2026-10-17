import { ApiError } from "../../shared/api/client";
import { useI18n } from "../../shared/i18n";
import { useLedgerText } from "./i18n";

/** Keeps request_id for support without competing with the error message. */
export function TechDetails({ error }: { error: unknown }) {
  const { t } = useI18n(),
    { l } = useLedgerText();
  const requestId =
    error instanceof ApiError ? error.metadata.requestId : undefined;
  if (!requestId) return null;
  return (
    <details className="tech-details">
      <summary>{l("techDetails")}</summary>
      <small>
        {t("supportCode")}: {requestId}
      </small>
    </details>
  );
}
