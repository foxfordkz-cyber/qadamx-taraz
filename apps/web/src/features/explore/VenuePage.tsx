import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getBusinesses, getVenues } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";

import { MAL_BAZAR_SLUG } from "./malBazarLinks";
import MalBazarPage from "./MalBazarPage";
import { LangSwitch, State } from "./ui";
import "./explore.css";

const Scene = lazy(() => import("./VenueScene"));

/** Mal bazar is not a venue of the public API; its concept page sits beside the venues. */
export default function VenueRoute() {
  const { slug = "" } = useParams();
  return slug === MAL_BAZAR_SLUG ? <MalBazarPage /> : <VenuePage />;
}

function VenuePage() {
  const { slug = "" } = useParams();
  const { t, name, categoryName } = useT();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams(); // фильтры живут в URL
  const q = sp.get("q") ?? "";
  const category = sp.get("category") ?? "";
  const [text, setText] = useState(q);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n, { replace: true });
  };

  useEffect(() => {
    if (text === q) return;
    const id = setTimeout(() => setParam("q", text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    },
    [],
  );

  const openShop = (id: string) => {
    setSelected(id);
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      nav(`/shops/${id}`);
      return;
    }
    navigationTimer.current = setTimeout(() => nav(`/shops/${id}`), 450);
  };

  const venues = useFetch(getVenues, []);
  const venue = venues.data?.find((v) => v.slug === slug);
  const shops = useFetch(
    () => getBusinesses({ venue: slug, q, category }),
    [slug, q, category],
  );
  // Cards follow the numbered 3D markers; shops without a matching marker keep API order after them.
  const markerNumber = (b: { id: string; slug: string }) => {
    const index =
      venue?.asset?.hotspots.findIndex(
        (h) => h.business_id === b.id && h.business_slug === b.slug,
      ) ?? -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const list = [...(shops.data ?? [])].sort(
    (a, b) => markerNumber(a) - markerNumber(b),
  );

  return (
    <main className="ex">
      <header className="ex-top">
        <Link className="back-link" to="/">
          <span aria-hidden="true">←</span> {t("back")}
        </Link>
        <LangSwitch />
      </header>

      <span className="eyebrow eyebrow--dark">{t("venue_eyebrow")}</span>
      <h1>{venue ? name(venue) : slug}</h1>
      {venue && (
        <p className="venue-meta">
          {t(venue.is_demo ? "venue_demo" : "venue_live")}
          {venue.asset
            ? ` · ${t("points")}: ${venue.asset.hotspots.length}`
            : ""}
        </p>
      )}
      <p className="muted">{t("conceptual_hint")}</p>

      <Suspense
        fallback={
          <p className="state" role="status" aria-busy="true">
            {t("loading_scene")}
          </p>
        }
      >
        <Scene
          key={slug}
          asset={venue?.asset}
          businesses={list}
          hoverId={hover}
          selectedId={selected}
          onSelect={openShop} // та же сущность, что и карточка в списке
          onHover={setHover}
        />
      </Suspense>

      <div className="filters">
        <label>
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            placeholder={t("search")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {text && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setText("")}
              aria-label={t("clear_search")}
            >
              ×
            </button>
          )}
        </label>
        <div className="chips" role="group" aria-label={t("shops")}>
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => setParam("category", "")}
          >
            {t("all_categories")}
          </button>
          {venue?.categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setParam("category", c)}
            >
              {categoryName(c)}
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="shops-h">
        <h2 id="shops-h">{t("shops")}</h2>
        <State
          loading={shops.loading && !shops.data}
          error={shops.error}
          onRetry={shops.reload}
        >
          {list.length === 0 ? (
            <p className="state">{t("no_shops")}</p>
          ) : (
            <ul className="cards">
              {list.map((b) => (
                <li key={b.id}>
                  <Link
                    className={`card shop-card${hover === b.slug ? " is-active" : ""}`}
                    to={`/shops/${b.slug}`}
                    onMouseEnter={() => setHover(b.slug)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(b.slug)}
                    onBlur={() => setHover(null)}
                  >
                    <h3>
                      {venue?.asset?.hotspots.some(
                        (h) =>
                          h.business_id === b.id && h.business_slug === b.slug,
                      )
                        ? `${venue.asset.hotspots.findIndex((h) => h.business_id === b.id) + 1}. `
                        : ""}
                      {b.name}
                    </h3>
                    <p className="muted">{categoryName(b.category)}</p>
                    <span className="card-open">{t("open_shop")} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </State>
      </section>
    </main>
  );
}
