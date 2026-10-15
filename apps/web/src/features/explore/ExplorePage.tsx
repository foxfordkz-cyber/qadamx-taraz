import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVenues } from './api';
import { useFetch } from './hooks';
import { useT } from './i18n';
import { venueBlocks } from './layout';
import { LangSwitch, State } from './ui';
import './explore.css';

const Scene = lazy(() => import('./Scene')); // three.js грузится отдельным чанком

export default function ExplorePage() {
  const { t, name } = useT();
  const nav = useNavigate();
  const { data, loading, error, reload } = useFetch(getVenues, []);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const venues = data ?? [];
  const blocks = useMemo(() => venueBlocks(venues), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (slug: string) => {
    setPicked(slug); // камера подлетает, затем переход
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => nav(`/venues/${slug}`), reduced ? 0 : 450);
  };

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
        <a className="top-link" href="#venues">{t('find_shop')} <span aria-hidden="true">↘</span></a>
        <LangSwitch />
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> {t('hero_eyebrow')}</span>
          <h1>{t('hero_title')}</h1>
          <p>{t('hero_text')}</p>
          <div className="actions">
            <a className="btn btn--primary" href="#venues">{t('find_shop')} <span aria-hidden="true">↗</span></a>
            <Link className="btn btn--quiet" to="/cabinet">{t('seller_cabinet')}</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 420 320" fill="none">
            <circle cx="265" cy="157" r="131" fill="#D7F36A" fillOpacity=".07" />
            <circle cx="265" cy="157" r="103" stroke="#D7F36A" strokeOpacity=".2" />
            <path d="M77 248h271l-24 18H97l-20-18Z" fill="#D7F36A" fillOpacity=".78" />
            <path d="M103 163h219v84H103v-84Z" fill="#F5F3EB" fillOpacity=".94" />
            <path d="m88 163 33-58h183l34 58H88Z" fill="#D7F36A" />
            <path d="m121 105-20 58h42l12-58h-34Zm68 0-5 58h43l1-58h-39Zm71 0 8 58h43l-18-58h-33Z" fill="#164C3E" fillOpacity=".82" />
            <path d="M103 163h219v12H103v-12Z" fill="#F0A94B" />
            <path d="M128 194h40v53h-40v-53Zm64 0h42v53h-42v-53Zm67 0h40v53h-40v-53Z" fill="#164C3E" />
            <path d="M182 194h53v53h-53v-53Z" fill="#D7F36A" fillOpacity=".78" />
            <circle cx="337" cy="75" r="8" fill="#F0A94B" />
            <path d="M338 53v-9m0 62v-9m31-22h-9m-44 0h-9m53-22-6 6m-32 32-6 6m44 0-6-6m-32-32-6-6" stroke="#D7F36A" strokeWidth="2" strokeLinecap="round" strokeOpacity=".9" />
          </svg>
        </div>
      </section>

      <Suspense fallback={<p className="state" role="status" aria-busy="true">{t('loading_scene')}</p>}>
        {venues.length > 0 && (
          <Scene blocks={blocks} selectedId={picked} hoverId={hover} onSelect={open} />
        )}
      </Suspense>

      <section id="venues" aria-labelledby="venues-h">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">{t('section_eyebrow')}</span>
            <h2 id="venues-h">{t('venues')}</h2>
          </div>
          <span className="section-note">{t('conceptual')}</span>
        </div>
        <State loading={loading} error={error} onRetry={reload}>
          <ul className="cards">
            {venues.map((v, index) => (
              <li key={v.id}>
                <Link
                  className={`card venue-card venue-card--${(index % 3) + 1}`}
                  to={`/venues/${v.slug}`}
                  onMouseEnter={() => setHover(v.slug)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(v.slug)} onBlur={() => setHover(null)}
                >
                  <span className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="venue-art" aria-hidden="true">
                    <span className="venue-art-hall venue-art-hall--one" />
                    <span className="venue-art-hall venue-art-hall--two" />
                    <span className="venue-art-stall" />
                    <span className="venue-art-sun" />
                  </span>
                  <h3>{name(v)} <span className="card-arrow" aria-hidden="true">↗</span></h3>
                  <p className="muted">{v.categories.join(', ')}</p>
                  <span className="card-open">{t('open_venue')} <span aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </State>
      </section>
    </main>
  );
}
