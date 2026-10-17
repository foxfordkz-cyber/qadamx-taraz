import { Link, useParams } from "react-router-dom";
import { formatKZT } from "../../shared/format";
import { getBusiness, getVenues } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";
import { LangSwitch, State } from "./ui";
import InquiryForm from "../inquiry/InquiryForm";
import "./explore.css";

// Shows only what the public API returns: name, category, demo flag,
// description, venue, point on the scheme and catalog. No invented address,
// hours, photos or contacts.
export default function ShopPage() {
  const { slug = "" } = useParams();
  const { t, name, categoryName, lang } = useT();
  const {
    data: b,
    loading,
    error,
    reload,
  } = useFetch(() => getBusiness(slug), [slug]);
  const venues = useFetch(getVenues, []);
  const venue = venues.data?.find((v) => v.id === b?.venue_id);
  const point =
    venue?.asset?.hotspots.findIndex(
      (h) => h.business_id === b?.id && h.business_slug === b?.slug,
    ) ?? -1;
  const category = b ? categoryName(b.category) : "";

  return (
    <main className="ex">
      <header className="ex-top">
        <Link
          className="back-link"
          to={b?.venue_slug ? `/venues/${b.venue_slug}` : "/"}
        >
          <span aria-hidden="true">←</span> {t("back")}
        </Link>
        <LangSwitch />
      </header>

      <State loading={loading} error={error} onRetry={reload}>
        {b && (
          <>
            <section className="shop-head" aria-labelledby="shop-h">
              <div className="shop-cover" aria-hidden="true">
                {category.slice(0, 1)}
              </div>
              <div className="shop-head-copy">
                <div className="shop-tags">
                  <span className="category-pill">
                    <span className="category-dot" />
                    {category}
                  </span>
                  {b.is_demo && (
                    <span className="badge badge--warn">{t("demo_shop")}</span>
                  )}
                </div>
                <h1 id="shop-h">{b.name}</h1>
                {venue && (
                  <p className="shop-place">
                    <Link to={`/venues/${venue.slug}`}>{name(venue)}</Link>
                    {point >= 0 &&
                      ` · ${t("point_on_scheme").replace("{n}", String(point + 1))}`}
                  </p>
                )}
                {b.description && <p className="muted">{b.description}</p>}
                <a className="btn btn--primary" href="#inquiry">
                  {t("write_seller")}
                </a>
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
                {b.catalog?.some((i) => i.is_demo) && (
                  <span className="badge badge--warn">{t("demo_data")}</span>
                )}
              </div>
              {b.catalog?.length ? (
                <ul className="catalog">
                  {b.catalog.map((i) => (
                    <li className="catalog-item" key={i.id}>
                      <span className="catalog-title">{i.name}</span>
                      <span
                        className={`catalog-stock${i.available ? " is-available" : ""}`}
                      >
                        {t(i.available ? "in_stock" : "out_of_stock")}
                      </span>
                      <strong className="catalog-price">
                        {i.price_minor == null
                          ? t("price_ask")
                          : formatKZT(i.price_minor, lang)}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="state">{t("catalog_empty")}</p>
              )}
            </section>

            <div id="inquiry" className="inquiry-anchor">
              <InquiryForm key={b.id} businessId={b.id} />
            </div>
          </>
        )}
      </State>
    </main>
  );
}
