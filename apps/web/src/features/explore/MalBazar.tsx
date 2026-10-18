import { Link } from "react-router-dom";
import { useT } from "./i18n";
import { MAL_BAZAR_PAGE, MOBILE_APP_RELEASE } from "./malBazarLinks";

/** Home section: a compact pointer to the concept page and the app; the model,
    the scheme and the facts live on the Mal bazar page. No listings here. */
export function MalBazarSection() {
  const { t } = useT();
  return (
    <section
      id="mal-bazar"
      className="mal mal--compact"
      aria-labelledby="mal-h"
    >
      <div className="mal-head">
        <span className="eyebrow eyebrow--dark">{t("mal_eyebrow")}</span>
        <h2 id="mal-h">{t("mal_title")}</h2>
        <span className="badge badge--warn">{t("mal_badge")}</span>
      </div>
      <div className="mal-copy">
        <p>{t("mal_text")}</p>
        <div className="mal-links">
          <Link className="btn" to={MAL_BAZAR_PAGE}>
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
        </div>
        <small className="muted">{t("mal_app_note")}</small>
      </div>
    </section>
  );
}
