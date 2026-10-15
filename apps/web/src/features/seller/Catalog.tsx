import { useBusiness } from '../../app/runtime';
import { formatKZT } from '../../shared/format';
import { useI18n } from '../../shared/i18n';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../shared/ui';
import { Icon } from '../../shared/ui/Icon';
import { useCatalog } from './queries';
export function CatalogPage() {
  const { t, locale } = useI18n(); const { business } = useBusiness(); const query = useCatalog();
  const items = query.data?.items.filter(item => item.business_id === business.id) ?? [];
  return <><PageHeader title={t('catalog')} subtitle={t('catalogSubtitle')} />
    {query.isPending ? <Spinner /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : !items.length ? <EmptyState title={t('empty')} /> : <div className="card-grid">{items.map(item => <Card key={item.id} className="product-card">
      <div className="product-visual" aria-hidden="true"><Icon name="catalog" /></div><div className="card-top">{item.is_demo && <Badge>{t('demo')}</Badge>}<Badge tone={item.available ? 'green' : 'neutral'}>{t(item.available ? 'available' : 'unavailable')}</Badge></div>
      <h2>{item.name}</h2><p className="price">{item.price_minor === null ? t('noPrice') : formatKZT(item.price_minor, locale)}</p>
    </Card>)}</div>}
  </>;
}
