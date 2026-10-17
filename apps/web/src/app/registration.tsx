import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import { EMAIL_CALLBACK_URL } from "./auth-callback-model";
import {
  PR43_EMAIL_CALLBACK_URL,
  registrationOriginAllowed,
} from "./auth-callback-config";
import {
  hasPendingConfirmation,
  registrationErrorKey,
  rememberConfirmation,
} from "./registration-model";
import { LanguageSwitch, useI18n, type TranslationKey } from "../shared/i18n";
import { Alert, Button, Card, Input, Spinner } from "../shared/ui";
import { Brand } from "../shared/ui/Brand";

// Only known outcomes are displayed; provider descriptions never reach the UI.
export function ConfirmationNotice({
  status = "waiting",
}: {
  status?: "waiting" | "invalid" | "expired";
}) {
  const { t } = useI18n();
  return (
    <>
      <p>{t("confirmationInstructions")}</p>
      {status !== "waiting" && (
        <Alert tone="error">
          {t(
            status === "expired"
              ? "confirmationExpired"
              : "confirmationInvalid",
          )}
        </Alert>
      )}
    </>
  );
}

export function RegistrationPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const originAllowed = registrationOriginAllowed(
    EMAIL_CALLBACK_URL,
    window.location.origin,
    import.meta.env.PROD,
  );
  const [waiting, setWaiting] = useState(hasPendingConfirmation);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [waiting, auth.loading]);
  if (auth.loading) return <Spinner />;
  if ((auth.session || auth.demo) && !auth.expired)
    return <Navigate to="/seller" replace />;

  async function submit() {
    if (lock.current || !auth.configured || !originAllowed) return;
    if (!waiting && password.length < 6) {
      setError("registrationWeakPassword");
      document.getElementById("registration-password")?.focus();
      return;
    }
    if (!waiting && password !== confirmation) {
      setError("registrationMismatch");
      document.getElementById("registration-confirmation")?.focus();
      return;
    }
    lock.current = true;
    setPending(true);
    setError(null);
    setSent(false);
    try {
      const result = waiting
        ? await auth.resendConfirmation(email.trim())
        : await auth.signUp(email.trim(), password);
      if (!active.current) return;
      if (waiting) setSent(true);
      else {
        setPassword("");
        setConfirmation("");
        setShow(false);
        if (result === "confirmation") {
          rememberConfirmation(true);
          setWaiting(true);
        }
      }
    } catch (failure) {
      if (active.current) setError(registrationErrorKey(failure));
    } finally {
      lock.current = false;
      if (active.current) setPending(false);
    }
  }
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand to="/" />
        <LanguageSwitch />
      </header>
      <main className="login-grid" id="main-content">
        <section className="login-intro">
          <p className="eyebrow">QADAM BUSINESS</p>
          <h1>{t("welcome")}</h1>
          <p>{t("cabinet")}</p>
          <div className="brand-art" aria-hidden="true">
            <span>q.</span>
            <div />
            <div />
            <div />
          </div>
        </section>
        <Card className="login-card">
          <h2 ref={heading} tabIndex={-1}>
            {t(waiting ? "confirmationTitle" : "registrationTitle")}
          </h2>
          {waiting ? (
            <ConfirmationNotice />
          ) : (
            <p className="muted">{t("registrationHint")}</p>
          )}
          {!auth.configured && (
            <Alert>
              {t(
                auth.invalidProjectUrl
                  ? "authProjectUrlInvalid"
                  : "authUnavailable",
              )}
            </Alert>
          )}
          {waiting && <p className="muted">{t("confirmationReloadHint")}</p>}
          {!originAllowed && (
            <Alert>
              {EMAIL_CALLBACK_URL === PR43_EMAIL_CALLBACK_URL ? (
                <>
                  <p>{t("registrationPreviewOnly")}</p>
                  <a
                    className="button button-secondary"
                    href={new URL("/register", PR43_EMAIL_CALLBACK_URL).href}
                  >
                    {t("registrationOpenPreview")}
                  </a>
                </>
              ) : (
                t("registrationEnvironmentUnavailable")
              )}
            </Alert>
          )}
          {originAllowed && (
            <form
              className="form-stack"
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                if (event.currentTarget.reportValidity()) void submit();
              }}
            >
              <Input
                label={t("email")}
                type="email"
                required
                autoComplete="email"
                value={email}
                disabled={pending}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSent(false);
                }}
              />
              {!waiting && (
                <>
                  <Input
                    id="registration-password"
                    label={t("password")}
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    hint={t("registrationPasswordHint")}
                    value={password}
                    disabled={pending}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Input
                    id="registration-confirmation"
                    label={t("registrationConfirmPassword")}
                    type={show ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmation}
                    disabled={pending}
                    error={
                      error === "registrationMismatch" ? t(error) : undefined
                    }
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={show}
                      onChange={(event) => setShow(event.target.checked)}
                    />
                    {t("passwordShow")}
                  </label>
                </>
              )}
              {error && <Alert tone="error">{t(error)}</Alert>}
              {sent && <Alert tone="success">{t("confirmationSent")}</Alert>}
              <Button type="submit" disabled={pending || !auth.configured}>
                {t(
                  pending
                    ? "loading"
                    : waiting
                      ? "confirmationResend"
                      : "registrationSubmit",
                )}
              </Button>
            </form>
          )}
          <p>
            <Link
              to="/login"
              className="button button-secondary"
              aria-disabled={pending}
              onClick={(event) => {
                if (lock.current) event.preventDefault();
              }}
            >
              {t("registrationLogin")}
            </Link>
          </p>
          {waiting && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                rememberConfirmation(false);
                setWaiting(false);
                setSent(false);
                setError(null);
              }}
            >
              {t("registrationAnother")}
            </Button>
          )}
        </Card>
      </main>
      <footer className="login-footer">Qadam Business · Taraz</footer>
    </div>
  );
}
