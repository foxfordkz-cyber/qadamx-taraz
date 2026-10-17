import { Link } from "react-router-dom";
import { useT } from "./i18n";
import {
  MAL_BAZAR_PAGE,
  MAL_BAZAR_POSTER,
  MOBILE_APP_RELEASE,
} from "./malBazarLinks";

/** Home section: the concept preview, the page link and the app; no listings here. */
export function MalBazarSection() {
  const { t } = useT();
  return (
    <section id="mal-bazar" className="mal" aria-labelledby="mal-h">
      <div className="section-heading">
        <div>
          <span className="eyebrow eyebrow--dark">{t("mal_eyebrow")}</span>
          <h2 id="mal-h">{t("mal_title")}</h2>
        </div>
        <span className="badge badge--warn">{t("mal_badge")}</span>
      </div>
      <div className="mal-body">
        <div className="mal-copy">
          <p>{t("mal_text")}</p>
          <Link className="btn btn--primary" to={MAL_BAZAR_PAGE}>
            {t("mal_open_page")} <span aria-hidden="true">→</span>
          </Link>
          <a
            className="btn"
            href={MOBILE_APP_RELEASE}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("mal_app_link")}
          </a>
          <small className="muted">{t("mal_app_note")}</small>
          <p className="muted">{t("mal_scheme_note")}</p>
        </div>
        <div className="mal-visual">
          <img
            className="mal-poster"
            src={MAL_BAZAR_POSTER}
            alt={t("mal_poster_alt")}
          />
        </div>
      </div>
    </section>
  );
}
