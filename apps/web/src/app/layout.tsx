import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./auth";
import { useBusiness } from "./runtime";
import { mainActions } from "./pages";
import { LanguageSwitch, useI18n, type TranslationKey } from "../shared/i18n";
import { Alert, Badge, Button, Dialog, Select } from "../shared/ui";
import { Brand, QadamMark } from "../shared/ui/Brand";
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
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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
        <Brand to="/seller" />
        <p className="sidebar-label">{t("cabinet")}</p>
        <nav aria-label={t("more")}>
          {links.map((link) => (
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
        <div className="sidebar-footer">
          <Icon name="shop" />
          <strong>Qadam · Taraz</strong>
          <small>{t("storefrontHint")}</small>
          <Link to="/">
            {t("storefront")} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Link to="/seller" aria-label={t("home")}>
              <QadamMark />
            </Link>
          </div>
          <div className="business-control">
            <span className="business-control-icon">
              <Icon name="shop" />
            </span>
            <Select
              label={t("business")}
              value={business.id}
              onChange={(e) => selectBusiness(e.target.value)}
            >
              {businesses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
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
          <main id="main-content" tabIndex={-1} key={business.id}>
            <Outlet />
          </main>
        </div>
      </div>
      <nav className="bottom-nav" aria-label={t("cabinet")}>
        {links
          .filter((link) =>
            ["", "sale", "customers", "inquiries"].includes(link.path),
          )
          .map((link) => (
            <NavLink
              key={link.path}
              end
              to={`/seller${link.path ? `/${link.path}` : ""}`}
            >
              <Icon name={link.icon} />
              <span>{t(link.label)}</span>
            </NavLink>
          ))}
        <button
          type="button"
          aria-label={t("more")}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className={
            ["debts", "summary", "catalog", "history"].some(
              (path) => pathname === `/seller/${path}`,
            )
              ? "is-active"
              : ""
          }
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" />
          <span>{t("menu")}</span>
        </button>
      </nav>
      <Dialog
        title={t("more")}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      >
        <nav className="section-menu" aria-label={t("more")}>
          {links.map((link) => (
            <NavLink
              key={link.path}
              end
              to={`/seller${link.path ? `/${link.path}` : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon name={link.icon} />
              <span>{t(link.label)}</span>
              <span aria-hidden="true">→</span>
            </NavLink>
          ))}
          <Link to="/" onClick={() => setMenuOpen(false)}>
            <Icon name="shop" />
            <span>{t("storefront")}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </Dialog>
    </div>
  );
}
