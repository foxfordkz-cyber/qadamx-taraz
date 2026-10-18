import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { LanguageSwitch, useI18n, type TranslationKey } from "../shared/i18n";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from "../shared/ui";
import { Brand } from "../shared/ui/Brand";
export function LoginPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState(false);
  if (auth.loading) return <Spinner />;
  if ((auth.session || auth.demo) && !auth.expired)
    return <Navigate to="/seller" replace />;
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
          <h2>{t("login")}</h2>
          <p className="muted">{t("loginHint")}</p>
          {!auth.configured && (
            <Alert>
              {t(
                auth.invalidProjectUrl
                  ? "authProjectUrlInvalid"
                  : "authUnavailable",
              )}
            </Alert>
          )}
          {auth.expired && <Alert tone="error">{t("unauthorized")}</Alert>}
          <form
            className="form-stack"
            aria-busy={pending}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!auth.configured || submitLock.current) return;
              submitLock.current = true;
              setPending(true);
              setError(false);
              try {
                await auth.signIn(email.trim(), password);
                setPassword("");
                navigate("/seller", { replace: true });
              } catch {
                setError(true);
              } finally {
                submitLock.current = false;
                setPending(false);
              }
            }}
          >
            <Input
              label={t("email")}
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t("password")}
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
              />
              {t("passwordShow")}
            </label>
            {error && <Alert tone="error">{t("authError")}</Alert>}
            <Button type="submit" disabled={!auth.configured || pending}>
              {t(pending ? "loading" : "login")}
            </Button>
          </form>
          <p>
            <Link
              to="/register"
              className="button button-secondary"
              aria-disabled={pending}
              onClick={(event) => {
                if (submitLock.current) event.preventDefault();
              }}
            >
              {t("registrationOpen")}
            </Link>
          </p>
          <div className="login-demo">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                if (submitLock.current) return;
                auth.enterDemo();
                navigate("/seller");
              }}
            >
              {t("demoOpen")} <span aria-hidden="true">→</span>
            </Button>
            <small>{t("demoHint")}</small>
          </div>
        </Card>
      </main>
      <footer className="login-footer">Qadam Business · Taraz</footer>
    </div>
  );
}
export { DashboardPage } from "../features/seller/Dashboard";
export function PendingModule({ label }: { label: TranslationKey }) {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t(label)} />
      <Card>
        <EmptyState
          title={t("moduleTitle")}
          description={t("moduleHint")}
          action={
            <Link className="button button-secondary" to="/seller">
              {t("back")}
            </Link>
          }
        />
      </Card>
    </>
  );
}
export function PublicPending() {
  const { t } = useI18n();
  return (
    <div className="public-page">
      <header>
        <Link className="brand" to="/">
          Qadam Business
        </Link>
        <LanguageSwitch />
      </header>
      <main id="main-content">
        <PageHeader title={t("storefront")} />
        <EmptyState
          title={t("moduleTitle")}
          description={t("moduleHint")}
          action={
            <Link className="button button-primary" to="/login">
              {t("login")}
            </Link>
          }
        />
      </main>
    </div>
  );
}
