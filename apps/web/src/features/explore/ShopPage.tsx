import { Link, useParams } from 'react-router-dom';
import { getBusiness } from './api';
import { useFetch } from './hooks';
import { useT } from './i18n';
import { LangSwitch, State } from './ui';
import InquiryForm from '../inquiry/InquiryForm';
import './explore.css';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₸';

export default function ShopPage() {
  const { slug = '' } = useParams();
  const { t } = useT();
  const { data: b, loading, error, reload } = useFetch(() => getBusiness(slug), [slug]);

  return (
    <main className="ex">
      <header className="ex-top">
        {b?.venue_slug ? <Link to={`/venues/${b.venue_slug}`}>← {t('back')}</Link> : <Link to="/">← {t('back')}</Link>}
        <LangSwitch />
      </header>

      <State loading={loading} error={error} onRetry={reload}>
        {b && (
          <>
            <h1>{b.name}</h1>
            <p className="muted">{b.category}</p>
            <p>{b.description}</p>

            <section aria-labelledby="cat-h">
              <h2 id="cat-h">{t('catalog')} <span className="badge badge--warn">{t('demo_data')}</span></h2>
              <ul className="catalog">
                {(b.catalog ?? []).map((i) => (
                  <li key={i.id}>
                    <span>{i.title}</span>
                    <strong>{i.price_kzt == null ? t('price_ask') : fmt(i.price_kzt)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <InquiryForm businessId={b.id} />
          </>
        )}
      </State>
    </main>
  );
}
