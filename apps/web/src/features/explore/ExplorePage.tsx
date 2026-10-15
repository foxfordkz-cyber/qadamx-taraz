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
          <span className="brand-mark" aria-hidden="true">Q</span>
          <span>qadam<span className="brand-period">.</span></span>
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
        <div className="hero-stamp" aria-hidden="true">
          <span className="stamp-ring">Q</span>
          <span>{t('local_trade')}</span>
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
                  className="card"
                  to={`/venues/${v.slug}`}
                  onMouseEnter={() => setHover(v.slug)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(v.slug)} onBlur={() => setHover(null)}
                >
                  <span className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
