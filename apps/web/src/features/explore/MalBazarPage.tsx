import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { getMalBazarAsset } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";
import { MAL_BAZAR_POSTER, MOBILE_APP_RELEASE } from "./malBazarLinks";
import { LangSwitch } from "./ui";
import "./explore.css";

const Scene = lazy(() => import("./VenueScene"));

/**
 * Concept page of the livestock market. It shows no listings, stock or prices:
 * they live in the mobile app, and the web shows numbers only once the market
 * has a confirmed key in Qadam data.
 */
export default function MalBazarPage() {
  const { t } = useT();
  const asset = useFetch(getMalBazarAsset, []);
  const poster = (
    <div className="venue-fallback">
      <img
        className="venue-poster"
        src={MAL_BAZAR_POSTER}
        alt={t("mal_poster_alt")}
      />
    </div>
  );

  return (
    <main className="ex mal-page">
      <header className="ex-top">
        <Link className="back-link" to="/">
          <span aria-hidden="true">←</span> {t("back")}
        </Link>
        <LangSwitch />
      </header>

      <span className="eyebrow eyebrow--dark">{t("mal_eyebrow")}</span>
      <h1>{t("mal_title")}</h1>
      <p className="venue-meta">{t("mal_page_meta")}</p>

      {asset.data ? (
        <Suspense fallback={poster}>
          <Scene
            asset={asset.data}
            businesses={[]}
            onSelect={() => undefined}
            hint={false}
          />
        </Suspense>
      ) : asset.loading ? (
        <p className="state" role="status" aria-busy="true">
          {t("loading_scene")}
        </p>
      ) : (
        poster
      )}

      <section className="mal-facts" aria-labelledby="mal-works-h">
        <h2 id="mal-works-h">{t("mal_works_title")}</h2>
        <ul>
          <li>
            <h3>{t("mal_works_app_title")}</h3>
            <p>{t("mal_works_app")}</p>
            <a
              className="btn btn--primary"
              href={MOBILE_APP_RELEASE}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("mal_app_link")}
            </a>
            <small className="muted">{t("mal_app_note")}</small>
          </li>
          <li>
            <h3>{t("mal_works_web_title")}</h3>
            <p>{t("mal_works_web")}</p>
          </li>
          <li>
            <h3>{t("mal_works_model_title")}</h3>
            <p>{t("mal_works_model")}</p>
          </li>
        </ul>
      </section>
    </main>
  );
}
