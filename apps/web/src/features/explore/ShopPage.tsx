import { Link, useParams } from "react-router-dom";
import { getBusiness } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";
import { LangSwitch, State } from "./ui";
import InquiryForm from "../inquiry/InquiryForm";
import "./explore.css";

const money = (minor: number, locale: "ru" | "kk") =>
  `${new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
    maximumFractionDigits: 2,
  }).format(minor / 100)} ₸`;

export default function ShopPage() {
  const { slug = "" } = useParams();
  const { t, categoryName, lang, name: localizedName } = useT();
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
            <section className="shop-hero" aria-labelledby="shop-title">
              <div className="shop-hero-copy">
                <span className="eyebrow eyebrow--dark">
                  {t("shop_eyebrow")}
                </span>
                <div className="shop-badges">
                  <span className="category-pill">
                    <span className="category-dot" />
                    {categoryName(b.category)}
                  </span>
                  {b.is_demo && (
                    <span className="badge badge--warn">{t("shop_demo")}</span>
                  )}
                </div>
                <h1 id="shop-title">{b.name}</h1>
                {b.description.trim() && <p>{b.description}</p>}
                {b.venue && (
                  <div className="shop-location">
                    <span className="shop-location-mark" aria-hidden="true">
                      ◎
                    </span>
                    <span>
                      <strong>
                        {t("shop_location")}: {localizedName(b.venue)}
                      </strong>
                      {b.venue.address_label.trim() && (
                        <small>{b.venue.address_label}</small>
                      )}
                    </span>
                  </div>
                )}
                <a className="btn btn--primary shop-action" href="#inquiry">
                  {t("shop_action")} <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div
                className="shop-cover-placeholder"
                role="img"
                aria-label={t("shop_photo_missing")}
              >
                <span className="shop-cover-icon" aria-hidden="true">
                  <svg viewBox="0 0 48 48" focusable="false">
                    <path d="M8 18.5 24 9l16 9.5v20H8v-20Z" />
                    <path d="M17 38V25h14v13M8 19h32M18 18v-5h12v5" />
                  </svg>
                </span>
                <span>{t("shop_photo_missing")}</span>
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
                {b.catalog?.some((item) => item.is_demo) && (
                  <span className="badge badge--warn">{t("demo_data")}</span>
                )}
              </div>
              {b.catalog?.length ? (
                <ul className="product-grid">
                  {b.catalog.map((item) => (
                    <li
                      className="product-card"
                      key={item.id}
                      data-demo={item.is_demo || undefined}
                    >
                      <div
                        className="product-photo-placeholder"
                        role="img"
                        aria-label={t("product_photo_missing")}
                      >
                        <span aria-hidden="true">◇</span>
                        <small>{t("product_photo_missing")}</small>
                      </div>
                      <div className="product-card-body">
                        <div className="product-card-title-row">
                          <h3>{item.name}</h3>
                          {item.is_demo && (
                            <span
                              className="product-demo-mark"
                              title={t("product_demo")}
                            >
                              {t("product_demo")}
                            </span>
                          )}
                        </div>
                        <strong className="catalog-price">
                          {item.price_minor == null
                            ? t("price_ask")
                            : money(item.price_minor, lang)}
                        </strong>
                        <span
                          className={`product-availability${item.available ? "" : " product-availability--off"}`}
                        >
                          <span aria-hidden="true" />
                          {item.available
                            ? t("product_available")
                            : t("product_unavailable")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="state">{t("catalog_empty")}</p>
              )}
            </section>

            <div id="inquiry" className="inquiry-anchor">
              <InquiryForm key={b.id} businessId={b.id} businessName={b.name} />
            </div>
          </>
        )}
      </State>
    </main>
  );
}
