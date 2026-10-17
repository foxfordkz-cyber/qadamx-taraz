import { Link } from "react-router-dom";
import { getVenues } from "./api";
import { useFetch } from "./hooks";
import { useT } from "./i18n";
import { LangSwitch, State } from "./ui";
import { MalBazarSection } from "./MalBazar";
import { VenueShowcase } from "./VenueShowcase";
import "./explore.css";

export default function ExplorePage() {
  const { t } = useT();
  const { data, loading, error, reload } = useFetch(getVenues, []);
  const venues = data ?? [];

  return (
    <main className="ex">
      <header className="ex-top">
        <Link className="brand" to="/" aria-label="Qadam — главная">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M8 30h8v-8h8v-8h8" />
            <circle cx="32" cy="14" r="2.25" />
          </svg>
          <span>qadam</span>
        </Link>
        <a className="top-link" href="#venues">
          {t("find_shop")} <span aria-hidden="true">↘</span>
        </a>
        <LangSwitch />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> {t("hero_eyebrow")}
          </span>
          <h1>{t("hero_title")}</h1>
          <p>{t("hero_text")}</p>
          <p>{t("hero_seller")}</p>
          <div className="actions">
            <a className="btn btn--primary" href="#venues">
              {t("find_shop")} <span aria-hidden="true">↗</span>
            </a>
            <Link className="btn btn--quiet" to="/seller">
              {t("seller_cabinet")}
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 420 320" fill="none">
            <circle
              cx="265"
              cy="157"
              r="131"
              fill="#D7F36A"
              fillOpacity=".07"
            />
            <circle
              cx="265"
              cy="157"
              r="103"
              stroke="#D7F36A"
              strokeOpacity=".2"
            />
            <path
              d="M77 248h271l-24 18H97l-20-18Z"
              fill="#D7F36A"
              fillOpacity=".78"
            />
            <path
              d="M103 163h219v84H103v-84Z"
              fill="#F5F3EB"
              fillOpacity=".94"
            />
            <path d="m88 163 33-58h183l34 58H88Z" fill="#D7F36A" />
            <path
              d="m121 105-20 58h42l12-58h-34Zm68 0-5 58h43l1-58h-39Zm71 0 8 58h43l-18-58h-33Z"
              fill="#164C3E"
              fillOpacity=".82"
            />
            <path d="M103 163h219v12H103v-12Z" fill="#F0A94B" />
            <path
              d="M128 194h40v53h-40v-53Zm64 0h42v53h-42v-53Zm67 0h40v53h-40v-53Z"
              fill="#164C3E"
            />
            <path
              d="M182 194h53v53h-53v-53Z"
              fill="#D7F36A"
              fillOpacity=".78"
            />
            <circle cx="337" cy="75" r="8" fill="#F0A94B" />
            <path
              d="M338 53v-9m0 62v-9m31-22h-9m-44 0h-9m53-22-6 6m-32 32-6 6m44 0-6-6m-32-32-6-6"
              stroke="#D7F36A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeOpacity=".9"
            />
          </svg>
        </div>
      </section>

      <section id="venues" aria-labelledby="venues-h">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">
              {t("section_eyebrow")}
            </span>
            <h2 id="venues-h">{t("venues")}</h2>
          </div>
          <span className="section-note">{t("conceptual")}</span>
        </div>
        <State loading={loading} error={error} onRetry={reload}>
          {venues.length === 0 ? (
            <div className="state state--empty">
              <span className="state-empty-mark" aria-hidden="true">
                Q
              </span>
              <div>
                <strong>{t("no_venues")}</strong>
                <p>{t("no_venues_hint")}</p>
              </div>
            </div>
          ) : (
            <VenueShowcase venues={venues} />
          )}
        </State>
      </section>
      <MalBazarSection />
    </main>
  );
}
