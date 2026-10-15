import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { useI18n, type TranslationKey } from "../i18n";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type="button"
      {...props}
      className={`button button-${variant} ${className}`}
    />
  );
}
export function Input({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="field" htmlFor={inputId}>
      <span id={`${inputId}-label`}>{label}</span>
      <input
        {...props}
        id={inputId}
        aria-labelledby={`${inputId}-label`}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${inputId}-hint` : undefined}
      />
      {(error || hint) && (
        <small id={`${inputId}-hint`} className={error ? "field-error" : ""}>
          {error ?? hint}
        </small>
      )}
    </label>
  );
}
export function Select({
  label,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="field" htmlFor={inputId}>
      <span id={`${inputId}-label`}>{label}</span>
      <select {...props} id={inputId} aria-labelledby={`${inputId}-label`} />
    </label>
  );
}
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <article {...props} className={`card ${className}`} />;
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`alert alert-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Spinner() {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {t("loading")}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ○
      </span>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
export function errorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return "invalidResponse";
  if (error.status === 401) return "unauthorized";
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "notFound";
  if (error.status === 409) return "dataChanged";
  if (error.status === 422) return "validationError";
  if (error.status === 429) return "rateLimited";
  if (error.status >= 500) return "serverError";
  if (error.code === "CONTRACT_PENDING") return "contractPending";
  if (error.code === "API_UNCONFIGURED") return "apiUnavailable";
  if (error.code === "DEMO_READ_ONLY") return "demoWrites";
  if (error.code === "NETWORK_ERROR") return "network";
  if (error.code === "INVALID_RESPONSE") return "invalidResponse";
  return "saveFailed";
}
export function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <>
      <span>{t(errorKey(error))}</span>
      {error instanceof ApiError && error.metadata.requestId && (
        <small className="request-reference">
          {t("supportCode")}: {error.metadata.requestId}
        </small>
      )}
    </>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="error-state" role="alert">
      <h2>{t("errorTitle")}</h2>
      <p>
        <ErrorMessage error={error} />
      </p>
      <div className="actions">
        {error instanceof ApiError && error.status === 401 ? (
          <Link className="button button-primary" to="/login">
            {t("login")}
          </Link>
        ) : (
          retry && (
            <Button variant="secondary" onClick={retry}>
              {t("retry")}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
export function Dialog({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { t } = useI18n();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" aria-label={t("close")} onClick={onClose}>
          ×
        </Button>
      </div>
      {children}
    </dialog>
  );
}
