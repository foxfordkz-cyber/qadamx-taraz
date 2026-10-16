import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useBusiness } from "./runtime";
import { LanguageSwitch, useI18n, type TranslationKey } from "../shared/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from "../shared/ui";
import { Icon, type IconName } from "../shared/ui/Icon";
import { Brand } from "../shared/ui/Brand";

export const mainActions: {
  path: string;
  label: TranslationKey;
  hint: TranslationKey;
  icon: IconName;
}[] = [
  { path: "sale", label: "sale", hint: "saleHint", icon: "sale" },
  { path: "debts", label: "debts", hint: "debtsHint", icon: "debts" },
  {
    path: "inquiries",
    label: "inquiries",
    hint: "inquiriesHint",
    icon: "inquiries",
  },
  { path: "summary", label: "summary", hint: "summaryHint", icon: "summary" },
];
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
          {!auth.configured && <Alert>{t("authUnavailable")}</Alert>}
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
export function DashboardPage() {
  const { t } = useI18n();
  const { business } = useBusiness();
  return (
    <>
      <div className="workspace-heading">
        <span className="workspace-kicker">QADAM BUSINESS</span>
        <span className="muted">{t("workspace")}</span>
      </div>
      <div className="welcome-panel">
        <div>
          <p className="eyebrow">{t("cabinet")}</p>
          <h1>{t("dashboardTitle")}</h1>
          <p>{t("dashboardHint")}</p>
          <div className="welcome-actions">
            <Link
              className="button button-primary welcome-cta"
              to="/seller/sale"
            >
              <Icon name="sale" />
              {t("sale")}
              <Icon name="arrow" />
            </Link>
            <Link className="welcome-link" to="/seller/customers">
              {t("customers")} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="welcome-context">
          <span className="welcome-context-icon">
            <Icon name="shop" />
          </span>
          <p>{t("activeBusiness")}</p>
          <strong>{business.name}</strong>
          <span className="welcome-location">Taraz · Qadam Business</span>
          {business.is_demo && <Badge>{t("demo")}</Badge>}
        </div>
      </div>
      <div className="section-heading">
        <h2>{t("tools")}</h2>
        <span>{t("quickActions")}</span>
      </div>
      <div className="action-grid">
        {mainActions.map((action, index) => (
          <Link
            key={action.path}
            className={`action-card action-${index}`}
            to={`/seller/${action.path}`}
          >
            <div className="action-card-top">
              <span className="action-icon">
                <Icon name={action.icon} />
              </span>
              <span className="action-number" aria-hidden="true">
                0{index + 1}
              </span>
            </div>
            <h2>{t(action.label)}</h2>
            <p>{t(action.hint)}</p>
            <span className="action-arrow" aria-hidden="true">
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
      </div>
      <div className="secondary-grid">
        {(["customers", "catalog", "history"] as const).map((key) => (
          <Link to={`/seller/${key}`} className="secondary-card" key={key}>
            <Icon name={key} />
            <span>
              <strong>{t(key)}</strong>
              <small>
                {t(
                  key === "customers"
                    ? "customerDirectory"
                    : key === "catalog"
                      ? "catalogDirectory"
                      : "historyDirectory",
                )}
              </small>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      <Card className="workspace-help">
        <div className="help-icon">
          <Icon name="customers" />
        </div>
        <div>
          <h2>{t("customerHelpTitle")}</h2>
          <p className="muted">{t("customerHelpHint")}</p>
        </div>
        <Link className="button button-secondary" to="/seller/customers">
          {t("customers")} →
        </Link>
      </Card>
      <p className="dashboard-note">Qadam Business · {t("cabinet")}</p>
    </>
  );
}
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
