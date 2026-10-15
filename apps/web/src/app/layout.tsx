import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useBusiness } from "./runtime";
import { mainActions } from "./pages";
import { LanguageSwitch, useI18n, type TranslationKey } from "../shared/i18n";
import { Alert, Badge, Button, Select } from "../shared/ui";
import { Icon, type IconName } from "../shared/ui/Icon";

const links: { path: string; label: TranslationKey; icon: IconName }[] = [
  { path: "", label: "home", icon: "home" },
  ...mainActions,
  { path: "customers", label: "customers", icon: "customers" },
  { path: "catalog", label: "catalog", icon: "catalog" },
  { path: "history", label: "history", icon: "history" },
];
export function SellerLayout() {
  const { t } = useI18n();
  const auth = useAuth();
  const { business, businesses, selectBusiness } = useBusiness();
  const navigate = useNavigate();
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  async function logout() {
    setLogoutPending(true);
    setLogoutError(false);
    try {
      await auth.signOut();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError(true);
    } finally {
      setLogoutPending(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/seller">
          <span className="brand-mark">q.</span>
          <span>
            qadam<span className="brand-business">business</span>
          </span>
        </Link>
        <p className="sidebar-label">{t("cabinet")}</p>
        <nav aria-label={t("more")}>
          {links.map((link) => (
            <NavLink
              key={link.path}
              end
              to={`/seller${link.path ? `/${link.path}` : ""}`}
            >
              <Icon name={link.icon} />
              {t(link.label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-dot" />
          Qadam Business
          <br />
          <small>Taraz · RU / KZ</small>
          <Link to="/">{t("storefront")} ↗</Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Link to="/seller" className="brand-mark" aria-label={t("home")}>
              q.
            </Link>
          </div>
          <Select
            label={t("business")}
            value={business.id}
            onChange={(e) => selectBusiness(e.target.value)}
          >
            {businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.is_demo ? ` · ${t("demo")}` : ""}
              </option>
            ))}
          </Select>
          <div className="topbar-actions">
            <span className="mode-label">
              <span className="mode-dot" />
              {t(auth.demo ? "demo" : "liveMode")}
            </span>
            <LanguageSwitch />
            <Button
              variant="ghost"
              disabled={logoutPending}
              onClick={() => void logout()}
            >
              {t("logout")}
            </Button>
          </div>
        </header>
        <div className="content-wrap">
          {auth.demo && (
            <div className="demo-banner" role="status">
              <Badge>{t("demo")}</Badge>
              <div>
                <strong>{t("demoTitle")}</strong>
                <p>{t("demoHint")}</p>
              </div>
            </div>
          )}
          {logoutError && <Alert tone="error">{t("signoutError")}</Alert>}
          <nav className="mobile-sections" aria-label={t("more")}>
            {(["customers", "catalog", "history"] as const).map((key) => (
              <NavLink key={key} to={`/seller/${key}`}>
                {t(key)}
              </NavLink>
            ))}
          </nav>
          <main id="main-content" tabIndex={-1} key={business.id}>
            <Outlet />
          </main>
        </div>
      </div>
      <nav className="bottom-nav" aria-label={t("cabinet")}>
        {links.slice(0, 5).map((link) => (
          <NavLink
            key={link.path}
            end
            to={`/seller${link.path ? `/${link.path}` : ""}`}
          >
            <Icon name={link.icon} />
            <span>{t(link.label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
