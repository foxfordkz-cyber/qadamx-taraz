import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { BusinessProvider, RuntimeProvider, useMemberships } from "./runtime";
import { SellerLayout } from "./layout";
import {
  DashboardPage,
  LoginPage,
  PendingModule,
  PublicPending,
} from "./pages";
import { modules, type FrontendModules } from "./modules";
import {
  AnalyticsPage,
  CatalogPage,
  CustomersPage,
  InquiriesPage,
} from "../features/seller";
import { ApiError } from "../shared/api/client";
import type { SellerGateway } from "../shared/api/gateway";
import { LanguageSwitch, useI18n } from "../shared/i18n";
import { Alert, Button, EmptyState, ErrorState, Spinner } from "../shared/ui";

function ProtectedSeller() {
  const auth = useAuth();
  const { t } = useI18n();
  const me = useMemberships();
  if (auth.loading) return <Spinner />;
  if (!auth.demo && !auth.session) return <Navigate to="/login" replace />;
  if (auth.expired)
    return <ErrorState error={new ApiError(401, "AUTH_REQUIRED")} />;
  if (me.isPending) return <Spinner />;
  if (me.isError)
    return (
      <div className="standalone-state">
        <LanguageHeader />
        <ErrorState error={me.error} retry={() => void me.refetch()} />
      </div>
    );
  if (!me.data.businesses.length)
    return (
      <div className="standalone-state">
        <LanguageHeader />
        <EmptyState
          title={t("noBusiness")}
          description={t("noBusinessHint")}
          action={
            <Button
              variant="secondary"
              disabled={me.isFetching}
              onClick={() => void me.refetch({ cancelRefetch: false })}
            >
              {t(me.isFetching ? "loading" : "refresh")}
            </Button>
          }
        />
      </div>
    );
  return (
    <BusinessProvider businesses={me.data.businesses}>
      <SellerLayout />
    </BusinessProvider>
  );
}
function LanguageHeader() {
  const auth = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState(false);
  return (
    <header className="actions">
      <LanguageSwitch />
      <Button
        variant="secondary"
        onClick={() => {
          void auth.signOut().catch(() => setError(true));
        }}
      >
        {t("logout")}
      </Button>
      {error && <Alert tone="error">{t("signoutError")}</Alert>}
    </header>
  );
}
function RouteEffects() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    document.title = `${t("cabinet")} · Qadam Business`;
  }, [t]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
export function App({
  integrations = modules,
  gateway,
}: {
  integrations?: FrontendModules;
  gateway?: SellerGateway;
}) {
  const auth = useAuth();
  const { t } = useI18n();
  return (
    <RuntimeProvider key={auth.scope} gateway={gateway}>
      <RouteEffects />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={integrations.public.home ?? <PublicPending />}
        />
        <Route
          path="/venues/:slug"
          element={integrations.public.venue ?? <PublicPending />}
        />
        <Route
          path="/shops/:slug"
          element={integrations.public.shop ?? <PublicPending />}
        />
        <Route path="/seller" element={<ProtectedSeller />}>
          <Route index element={<DashboardPage />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          {(["sale", "debts", "history", "summary"] as const).map((key) => (
            <Route
              key={key}
              path={key}
              element={
                integrations.seller[key] ?? <PendingModule label={key} />
              }
            />
          ))}
        </Route>
        <Route path="*" element={<EmptyState title={t("missingPage")} />} />
      </Routes>
    </RuntimeProvider>
  );
}
