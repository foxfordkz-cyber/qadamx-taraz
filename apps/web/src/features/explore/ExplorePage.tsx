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
        <strong>Qadam</strong>
        <LangSwitch />
      </header>

      <section className="hero">
        <h1>{t('hero_title')}</h1>
        <p>{t('hero_text')}</p>
        <div className="actions">
          <a className="btn btn--primary" href="#venues">{t('find_shop')}</a>
          <Link className="btn" to="/cabinet">{t('seller_cabinet')}</Link>
        </div>
      </section>

      <Suspense fallback={<p className="state" role="status" aria-busy="true">{t('loading_scene')}</p>}>
        {venues.length > 0 && (
          <Scene blocks={blocks} selectedId={picked} hoverId={hover} onSelect={open} />
        )}
      </Suspense>

      <section id="venues" aria-labelledby="venues-h">
        <h2 id="venues-h">{t('venues')}</h2>
        <State loading={loading} error={error} onRetry={reload}>
          <ul className="cards">
            {venues.map((v) => (
              <li key={v.id}>
                <Link
                  className="card"
                  to={`/venues/${v.slug}`}
                  onMouseEnter={() => setHover(v.slug)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(v.slug)} onBlur={() => setHover(null)}
                >
                  <h3>{name(v)}</h3>
                  <p className="muted">{v.categories.join(', ')}</p>
                  <span className="badge badge--warn">{t('conceptual')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </State>
      </section>
    </main>
  );
}
