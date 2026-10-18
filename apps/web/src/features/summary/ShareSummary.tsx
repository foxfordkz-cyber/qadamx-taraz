import { useId, useState } from "react";
import type { Locale } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { shareLabels, summaryWhatsAppUrl } from "./share";
import "./summary.css";

function ShareIcon({ kind }: { kind: "whatsapp" | "copy" | "native" }) {
  const paths = {
    whatsapp:
      "M21 11.5a9 9 0 0 1-13.3 7.9L3 21l1.6-4.7A9 9 0 1 1 21 11.5ZM8 9h8m-8 4h5",
    copy: "M9 9h11v12H9V9ZM5 16H3V3h12v2",
    native: "M12 16V3m-4 4 4-4 4 4M5 12v9h14v-9",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

/** Mounted with an identity/date/text key so late completions cannot label new data. */
export function ShareSummary({
  text,
  locale,
}: {
  text: string | null;
  locale: Locale;
}) {
  const labels = shareLabels[locale];
  const heading = useId();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "copied" | "copyError" | "shareError"
  >("idle");
  const disabled = text === null || busy;
  const nativeSupported = typeof navigator.share === "function";
  return (
    <section className="card summary-share" aria-labelledby={heading}>
      <h2 id={heading}>{labels.heading}</h2>
      <div className="summary-share-actions">
        {disabled ? (
          <Button disabled aria-label={labels.whatsapp}>
            <ShareIcon kind="whatsapp" />
            {labels.whatsapp}
          </Button>
        ) : (
          <a
            className="button button-primary"
            href={summaryWhatsAppUrl(text)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.whatsapp}
          >
            <ShareIcon kind="whatsapp" />
            {labels.whatsapp}
          </a>
        )}
        <Button
          variant="secondary"
          disabled={disabled}
          aria-label={labels.copy}
          onClick={async () => {
            if (text === null || busy) return;
            setBusy(true);
            setStatus("idle");
            try {
              await navigator.clipboard.writeText(text);
              setStatus("copied");
            } catch {
              setStatus("copyError");
            } finally {
              setBusy(false);
            }
          }}
        >
          <ShareIcon kind="copy" />
          {labels.copy}
        </Button>
        {nativeSupported && (
          <Button
            variant="secondary"
            disabled={disabled}
            aria-label={labels.native}
            onClick={async () => {
              if (text === null || busy) return;
              setBusy(true);
              setStatus("idle");
              try {
                await navigator.share({ text });
              } catch (error) {
                if (
                  !(
                    typeof error === "object" &&
                    error !== null &&
                    "name" in error &&
                    error.name === "AbortError"
                  )
                )
                  setStatus("shareError");
              } finally {
                setBusy(false);
              }
            }}
          >
            <ShareIcon kind="native" />
            {labels.native}
          </Button>
        )}
      </div>
      <p className="muted">{labels.hint}</p>
      {status !== "idle" && (
        <p role={status === "copied" ? "status" : "alert"}>{labels[status]}</p>
      )}
    </section>
  );
}
