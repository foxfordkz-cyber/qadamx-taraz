import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
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

  const venues = useFetch(getVenues, []);
  const venue = venues.data?.find((v) => v.slug === slug);
  const shops = useFetch(() => getBusinesses({ venue: slug, q, category }), [slug, q, category]);
  const list = shops.data ?? [];
  const blocks = useMemo(() => shopBlocks(list), [shops.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="ex">
      <header className="ex-top">
        <Link to="/">← {t('back')}</Link>
        <LangSwitch />
      </header>

      <h1>{venue ? name(venue) : slug}</h1>
      <p className="muted">{t('conceptual_hint')}</p>

      <Suspense fallback={<p className="state" role="status" aria-busy="true">{t('loading_scene')}</p>}>
        <Scene
          blocks={blocks}
          hoverId={hover}
          modelUrl={venue?.model_url}
          onSelect={(id) => nav(`/shops/${id}`)} // та же сущность, что и карточка в списке
        />
      </Suspense>

      <div className="filters">
        <label>
          <span className="sr-only">{t('search')}</span>
          <input type="search" placeholder={t('search')} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="chips" role="group" aria-label={t('shops')}>
          <button type="button" aria-pressed={!category} onClick={() => setParam('category', '')}>{t('all_categories')}</button>
          {venue?.categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setParam('category', c)}>{c}</button>
          ))}
        </div>
      </div>

      <section aria-labelledby="shops-h">
        <h2 id="shops-h">{t('shops')}</h2>
        <State loading={shops.loading && !shops.data} error={shops.error} onRetry={shops.reload}>
          {list.length === 0 ? (
            <p className="state">{t('no_shops')}</p>
          ) : (
            <ul className="cards">
              {list.map((b) => (
                <li key={b.id}>
                  <Link
                    className="card"
                    to={`/shops/${b.slug}`}
                    onMouseEnter={() => setHover(b.slug)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(b.slug)} onBlur={() => setHover(null)}
                  >
                    <h3>{b.name}</h3>
                    <p className="muted">{b.category}</p>
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
