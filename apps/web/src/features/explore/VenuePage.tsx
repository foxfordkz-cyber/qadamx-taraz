import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBusinesses, getVenues } from './api';
import { useFetch } from './hooks';
import { useT } from './i18n';
import { shopBlocks } from './layout';
import { LangSwitch, State } from './ui';
import './explore.css';

const Scene = lazy(() => import('./Scene'));

export default function VenuePage() {
  const { slug = '' } = useParams();
  const { t, name } = useT();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams(); // фильтры живут в URL
  const q = sp.get('q') ?? '';
  const category = sp.get('category') ?? '';
  const [text, setText] = useState(q);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    setSp(n, { replace: true });
  };

  useEffect(() => {
    if (text === q) return;
    const id = setTimeout(() => setParam('q', text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);

  const openShop = (id: string) => {
    setSelected(id);
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      nav(`/shops/${id}`);
      return;
    }
    navigationTimer.current = setTimeout(() => nav(`/shops/${id}`), 450);
  };

  const venues = useFetch(getVenues, []);
  const venue = venues.data?.find((v) => v.slug === slug);
  const shops = useFetch(() => getBusinesses({ venue: slug, q, category }), [slug, q, category]);
  const list = shops.data ?? [];
  const blocks = useMemo(() => shopBlocks(list), [shops.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="ex">
      <header className="ex-top">
        <Link className="back-link" to="/"><span aria-hidden="true">←</span> {t('back')}</Link>
        <LangSwitch />
      </header>

      <section className="venue-heading">
        <div>
          <span className="eyebrow eyebrow--dark">{t('venue_eyebrow')}</span>
          <h1>{venue ? name(venue) : slug}</h1>
          <p className="muted">{t('conceptual_hint')}</p>
        </div>
        <div className="venue-count">
          <strong>{list.length.toString().padStart(2, '0')}</strong>
          <span>{t('shops')}</span>
        </div>
      </section>

      <Suspense fallback={<p className="state" role="status" aria-busy="true">{t('loading_scene')}</p>}>
        <Scene
          blocks={blocks}
          hoverId={hover}
          selectedId={selected}
          modelUrl={venue?.model_url}
          onSelect={openShop} // та же сущность, что и карточка в списке
        />
      </Suspense>

      <div className="browse-heading">
        <div>
          <span className="eyebrow eyebrow--dark">{t('browse_eyebrow')}</span>
          <h2>{t('shops')}</h2>
        </div>
        <label className="search-field">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <span className="sr-only">{t('search')}</span>
          <input type="search" placeholder={t('search')} value={text} onChange={(e) => setText(e.target.value)} />
          {text && <button type="button" className="search-clear" onClick={() => setText('')} aria-label={t('clear_search')}>×</button>}
        </label>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label={t('shops')}>
          <button type="button" aria-pressed={!category} onClick={() => setParam('category', '')}>{t('all_categories')}</button>
          {venue?.categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setParam('category', c)}>{c}</button>
          ))}
        </div>
      </div>

      <section aria-labelledby="shops-h">
        <h2 id="shops-h" className="sr-only">{t('shops')}</h2>
        <State loading={shops.loading && !shops.data} error={shops.error} onRetry={shops.reload}>
          {list.length === 0 ? (
            <p className="state">{t('no_shops')}</p>
          ) : (
            <ul className="cards">
              {              list.map((b, index) => (
                <li key={b.id}>
                  <Link
                    className="card"
                    to={`/shops/${b.slug}`}
                    onMouseEnter={() => setHover(b.slug)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(b.slug)} onBlur={() => setHover(null)}
                  >
                    <span className="card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{b.name}</h3>
                    <p className="muted">{b.category}</p>
                    <span className="card-open">{t('open_shop')} <span aria-hidden="true">→</span></span>
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
