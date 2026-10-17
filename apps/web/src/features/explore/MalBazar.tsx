import { lazy, Suspense, useState } from "react";
import { useT } from "./i18n";

const MalBazarScene = lazy(() => import("./MalBazarScene"));

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

// Plan view of the same conceptual layout as the 3D scheme: six pens, a shaded aisle, one gate.
function MalBazarPlan({ label }: { label: string }) {
  const { t } = useT();
  const pens = [0, 1, 2].flatMap((c) =>
    [0, 1].map((r) => ({ x: 46 + c * 104, y: 34 + r * 132 })),
  );
  return (
    <svg
      className="mal-plan"
      viewBox="0 0 400 300"
      role="img"
      aria-label={label}
    >
      <rect
        className="mal-plan-yard"
        x="24"
        y="16"
        width="352"
        height="268"
        rx="14"
      />
      <rect
        className="mal-plan-aisle"
        x="34"
        y="127"
        width="332"
        height="36"
        rx="6"
      />
      {pens.map((p, i) => (
        <rect
          key={i}
          className="mal-plan-pen"
          x={p.x}
          y={p.y}
          width="92"
          height="88"
          rx="4"
        />
      ))}
      <path className="mal-plan-gate" d="M176 284v-18h48v18" />
      <path className="mal-plan-arrow" d="M200 298v-24m-7 8 7-8 7 8" />
      <text className="mal-plan-text" x="200" y="150" textAnchor="middle">
        {t("mal_canopy")}
      </text>
      <text className="mal-plan-text" x="92" y="82" textAnchor="middle">
        {t("mal_pens")}
      </text>
      <text className="mal-plan-text" x="252" y="262" textAnchor="start">
        {t("mal_gate")}
      </text>
    </svg>
  );
}

/** Published Android test build with the livestock feed; the web has no listings
    of its own. Update together with each mobile release. */
const MOBILE_APP_RELEASE =
  "https://github.com/foxfordkz-cyber/qadamx-taraz/releases/tag/mobile-v0.3.0-native.1";

export function MalBazarSection() {
  const { t } = useT();
  const [webgl] = useState(hasWebGL);
  const [show3d, setShow3d] = useState(false);
  const [lost, setLost] = useState(false);
  const scene = show3d && webgl && !lost;
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
          <a
            className="btn btn--primary"
            href={MOBILE_APP_RELEASE}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("mal_app_link")}
          </a>
          <small className="muted">{t("mal_app_note")}</small>
          <p className="muted">{t("mal_scheme_note")}</p>
          {webgl && !lost && (
            <button
              type="button"
              className="btn"
              aria-pressed={show3d}
              onClick={() => setShow3d((v) => !v)}
            >
              {t(show3d ? "mal_hide_3d" : "mal_show_3d")}
            </button>
          )}
          {lost && (
            <p className="state" role="status">
              {t("scene_off")}
            </p>
          )}
        </div>
        <div className="mal-visual">
          {scene ? (
            <Suspense
              fallback={
                <p className="state" role="status" aria-busy="true">
                  {t("loading_scene")}
                </p>
              }
            >
              <MalBazarScene onLost={() => setLost(true)} />
            </Suspense>
          ) : (
            <MalBazarPlan label={t("mal_badge")} />
          )}
        </div>
      </div>
    </section>
  );
}
