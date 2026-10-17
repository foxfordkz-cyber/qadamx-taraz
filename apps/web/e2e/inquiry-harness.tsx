// Test-only composition of the agreed props. This is NOT the owner's ShopPage.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, useSearchParams } from "react-router-dom";
import InquiryForm from "../src/features/inquiry/InquiryForm";
import { getBusiness } from "../src/features/explore/api";
import { useFetch } from "../src/features/explore/hooks";
import { State } from "../src/features/explore/ui";
import { I18nProvider, LanguageSwitch } from "../src/shared/i18n";
import "../src/shared/tokens.css";
import "../src/shared/styles.css";
import "../src/shared/merchant.css";
import "../src/features/explore/explore.css";

function Harness() {
  const [params] = useSearchParams();
  const slug = params.get("shop") ?? "inquiry-fixture-a";
  const {
    data: business,
    loading,
    error,
    reload,
  } = useFetch(() => getBusiness(slug), [slug]);
  return (
    <main className="ex">
      <p>Изолированная проверка · синтетические данные</p>
      <LanguageSwitch />
      <nav className="actions" aria-label="Тестовые магазины">
        <Link className="button button-secondary" to="?shop=inquiry-fixture-a">
          Магазин A
        </Link>
        <Link className="button button-secondary" to="?shop=inquiry-fixture-b">
          Магазин B
        </Link>
      </nav>
      <State loading={loading} error={error} onRetry={reload}>
        {business && (
          <>
            <h1>{business.name}</h1>
            <p data-testid="catalog-count">
              Товаров: {business.catalog?.length ?? 0}
            </p>
            <InquiryForm
              businessId={business.id}
              businessName={business.name}
            />
          </>
        )}
      </State>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <Harness />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
