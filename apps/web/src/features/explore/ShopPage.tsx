import { Link, useParams } from "react-router-dom";
import { getBusiness } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";
import { LangSwitch, State } from "./ui";
import InquiryForm from "../inquiry/InquiryForm";
import "./explore.css";

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n / 100) + " ₸";

export default function ShopPage() {
  const { slug = "" } = useParams();
  const { t, categoryName } = useT();
  const {
    data: b,
    loading,
    error,
    reload,
  } = useFetch(() => getBusiness(slug), [slug]);

  return (
    <main className="ex">
      <header className="ex-top">
        {b?.venue_slug ? (
          <Link className="back-link" to={`/venues/${b.venue_slug}`}>
            <span aria-hidden="true">←</span> {t("back")}
          </Link>
        ) : (
          <Link className="back-link" to="/">
            <span aria-hidden="true">←</span> {t("back")}
          </Link>
        )}
        <LangSwitch />
      </header>

      <State loading={loading} error={error} onRetry={reload}>
        {b && (
          <>
            <section className="shop-hero">
              <div className="shop-hero-copy">
                <span className="eyebrow eyebrow--dark">
                  {t("shop_eyebrow")}
                </span>
                <span className="category-pill">
                  <span className="category-dot" />
                  {categoryName(b.category)}
                </span>
                <h1>{b.name}</h1>
                <p>{b.description}</p>
              </div>
              <div className="shop-art" aria-hidden="true">
                <span className="shop-art-orbit shop-art-orbit--one" />
                <span className="shop-art-orbit shop-art-orbit--two" />
                <span className="shop-art-step shop-art-step--one" />
                <span className="shop-art-step shop-art-step--two" />
                <span className="shop-art-step shop-art-step--three" />
                <span className="shop-art-spark">✳</span>
              </div>
            </section>

            <section className="catalog-section" aria-labelledby="cat-h">
              <div className="catalog-heading">
                <div>
                  <span className="eyebrow eyebrow--dark">
                    {t("catalog_eyebrow")}
                  </span>
                  <h2 id="cat-h">{t("catalog")}</h2>
                </div>
                <span className="badge badge--warn">{t("demo_data")}</span>
              </div>
              {b.catalog?.length ? (
                <ul className="catalog">
                  {b.catalog.map((i, index) => (
                    <li className="catalog-item" key={i.id}>
                      <span className="catalog-index" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="catalog-title">{i.name}</span>
                      <strong className="catalog-price">
                        {i.price_minor == null
                          ? t("price_ask")
                          : fmt(i.price_minor)}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="state">{t("catalog_empty")}</p>
              )}
            </section>

            <InquiryForm key={b.id} businessId={b.id} businessName={b.name} />
          </>
        )}
      </State>
    </main>
  );
}
