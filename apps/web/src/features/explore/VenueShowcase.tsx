import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "./i18n";
import type { Venue } from "./types";
import { hasWebGL } from "./webgl";

// The published GLB of one venue at a time, only when asked for.
const VenueScene = lazy(() => import("./VenueScene"));

/**
 * Venue overview on the home page: the chosen venue large, its facts and one
 * action beside it, the other venues one tap away. These are separate venues,
 * not neighbours on a map.
 */
export function VenueShowcase({ venues }: { venues: Venue[] }) {
  const { t, name, categoryName } = useT();
  const [slug, setSlug] = useState(venues[0]?.slug ?? "");
  const [gl] = useState(hasWebGL);
  // Phones start with the poster; a fine pointer gets the 3D model straight away.
  const coarse = useMemo(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(pointer: coarse)").matches,
    [],
  );
  const [show3d, setShow3d] = useState(!coarse);
  const index = Math.max(
    0,
    venues.findIndex((v) => v.slug === slug),
  );
  const venue = venues[index];
  if (!venue) return null;
  const points = venue.asset?.hotspots.length;
  const poster = venue.asset ? (
    <img
      className="showcase-poster"
      src={venue.asset.poster_url}
      alt={name(venue)}
    />
  ) : (
    <span className="venue-art" aria-hidden="true">
      <span className="venue-art-hall venue-art-hall--one" />
      <span className="venue-art-hall venue-art-hall--two" />
      <span className="venue-art-stall" />
      <span className="venue-art-sun" />
    </span>
  );

  return (
    <div className="showcase">
      <div className="showcase-tabs" role="group" aria-label={t("venues")}>
        {venues.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={v.slug === venue.slug}
            onClick={() => setSlug(v.slug)}
          >
            {v.asset && (
              <img src={v.asset.poster_url} alt="" aria-hidden="true" />
            )}
            <span>{name(v)}</span>
          </button>
        ))}
      </div>

      <div className="showcase-stage">
        {gl && show3d && venue.asset ? (
          <Suspense fallback={poster}>
            <VenueScene
              key={venue.slug}
              asset={venue.asset}
              businesses={[]}
              onSelect={() => undefined}
              hint={false}
            />
          </Suspense>
        ) : (
          <div className="showcase-still">
            {poster}
            {gl && venue.asset ? (
              <button
                type="button"
                className="btn"
                onClick={() => setShow3d(true)}
              >
                {t("show_3d")}
              </button>
            ) : (
              <p className="scene-note" role="status">
                {t("scene_off")}
              </p>
            )}
          </div>
        )}
      </div>

      <article className="showcase-card" aria-live="polite">
        <span className="card-index">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(venues.length).padStart(2, "0")}
        </span>
        <h3>{name(venue)}</h3>
        <p className="muted">
          {t(venue.is_demo ? "venue_demo" : "venue_live")}
        </p>
        {venue.categories.length > 0 && (
          <ul className="showcase-cats" aria-label={t("categories")}>
            {venue.categories.map((c) => (
              <li key={c}>{categoryName(c)}</li>
            ))}
          </ul>
        )}
        {points !== undefined && (
          <p className="showcase-points">
            {t("points_label")}: <strong>{points}</strong>
          </p>
        )}
        <Link className="btn btn--primary" to={`/venues/${venue.slug}`}>
          {t("open_venue")} <span aria-hidden="true">→</span>
        </Link>
      </article>
    </div>
  );
}
