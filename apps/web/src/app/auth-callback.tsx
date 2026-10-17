import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import {
  captureAuthCallback,
  type CallbackResult,
} from "./auth-callback-model";
import { useMemberships } from "./runtime";
import { rememberConfirmation } from "./registration-model";
import { LanguageSwitch, useI18n } from "../shared/i18n";
import { Alert, Button, Card, ErrorState, Spinner } from "../shared/ui";
import { Brand } from "../shared/ui/Brand";

export function AuthCallbackPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const [attempt] = useState(captureAuthCallback);
  const [result, setResult] = useState<CallbackResult | null>(null);
  const latest = useRef(auth);
  latest.current = auth;
  const me = useMemberships();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (auth.loading || !auth.configured) return;
    let active = true;
    void latest.current.confirmEmail(attempt).then((next) => {
      if (active) setResult(next);
    });
    return () => {
      active = false;
    };
  }, [attempt, auth.loading, auth.configured]);
  useEffect(() => {
    heading.current?.focus();
  }, [result]);
  const matches =
    result &&
    "userId" in result &&
    result.userId === auth.session?.user.id &&
    result.scope === auth.scope &&
    !auth.demo;
  if (matches && !auth.expired && me.isSuccess && me.data.id === result.userId)
    return <Navigate to="/seller" replace />;
  const issue = result && "issue" in result ? result.issue : "changed";
  const pending =
    auth.loading ||
    (auth.configured && !result) ||
    (matches && me.isPending && !auth.expired);
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand to="/" />
        <LanguageSwitch />
      </header>
      <main className="standalone-state" id="main-content">
        <Card className="login-card">
          <h1 ref={heading} tabIndex={-1}>
            {t("callbackTitle")}
          </h1>
          {pending ? (
            <>
              <Spinner />
              <p role="status">{t("callbackPending")}</p>
            </>
          ) : !auth.configured ? (
            <Alert>
              {t(
                auth.invalidProjectUrl
                  ? "authProjectUrlInvalid"
                  : "authUnavailable",
              )}
            </Alert>
          ) : matches && me.isError && !auth.expired ? (
            <ErrorState
              error={me.error}
              retry={() => void me.refetch({ cancelRefetch: false })}
            />
          ) : (
            <Alert tone="error">
              {t(
                auth.expired
                  ? "callbackExpiredSession"
                  : issue === "browser"
                    ? "callbackBrowser"
                    : issue === "unknown"
                      ? "callbackUnknown"
                      : issue === "changed"
                        ? "callbackChanged"
                        : "callbackInvalid",
              )}
            </Alert>
          )}
          {!pending && (
            <div className="actions">
              <Link className="button button-secondary" to="/login">
                {t("registrationLogin")}
              </Link>
              {!auth.session && (
                <Link
                  className="button button-secondary"
                  to="/register"
                  onClick={() => rememberConfirmation(true)}
                >
                  {t("confirmationResend")}
                </Link>
              )}
              {auth.session && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    void auth
                      .signOut()
                      .catch(() => setResult({ issue: "unknown" }))
                  }
                >
                  {t("logout")}
                </Button>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
