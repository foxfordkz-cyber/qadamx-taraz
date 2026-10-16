import type { ReactNode } from "react";
import { useT } from "./i18n";

export function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="lang" role="group" aria-label="Language">
      {(["ru", "kk"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          {l === "ru" ? "RU" : "KZ"}
        </button>
      ))}
    </div>
  );
}

export function State({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  if (error)
    return (
      <div className="state state--error" role="alert">
        <span className="state-symbol" aria-hidden="true">
          !
        </span>
        <div className="state-copy">
          <strong>{t("load_error")}</strong>
          <p>{t("load_error_hint")}</p>
        </div>
        <button type="button" className="btn" onClick={onRetry}>
          {t("retry")} <span aria-hidden="true">↻</span>
        </button>
      </div>
    );
  if (loading)
    return (
      <div
        className="state-skeleton"
        role="status"
        aria-label={t("loading")}
        aria-busy="true"
      >
        {[0, 1, 2].map((i) => (
          <div className="skeleton-card" key={i}>
            <span className="skeleton-line skeleton-line--short" />
            <span className="skeleton-line skeleton-line--title" />
            <span className="skeleton-line skeleton-line--body" />
            <span className="skeleton-line skeleton-line--footer" />
          </div>
        ))}
      </div>
    );
  return <>{children}</>;
}
