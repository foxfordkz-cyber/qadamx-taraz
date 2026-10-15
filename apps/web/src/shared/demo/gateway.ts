import type { SellerGateway } from '../api/gateway';
import type { Business, CatalogItem, Customer, Inquiry } from '../api/models';
import { ApiError } from '../api/client';

const business: Business = { id: '11111111-1111-4111-8111-111111111111', slug: 'demo-shop', name: 'Qadam · Демо', is_demo: true };
const other: Business = { id: '22222222-2222-4222-8222-222222222222', slug: 'demo-empty', name: 'Qadam · Демо 02', is_demo: true };
const customers: Customer[] = [
  { id: '33333333-3333-4333-8333-333333333333', business_id: business.id, display_name: 'Асқар', note: 'Демо · павильон 12', contact: null },
  { id: '44444444-4444-4444-8444-444444444444', business_id: business.id, display_name: 'Асқар', note: 'Демо · доставка', contact: null },
  { id: '55555555-5555-4555-8555-555555555555', business_id: business.id, display_name: 'Әсел', note: null, contact: 'demo@example.test' },
];
const inquiries: Inquiry[] = [
  { id: '66666666-6666-4666-8666-666666666666', business_id: business.id, visitor_name: 'Әсел · Демо', contact: 'demo@example.test', message: 'Сәлеметсіз бе! Бұл тауар бар ма?', status: 'new', created_at: '2026-10-15T10:20:00Z' },
  { id: '77777777-7777-4777-8777-777777777777', business_id: business.id, visitor_name: 'Демо-покупатель', contact: null, message: 'Можно забрать заказ завтра?', status: 'in_progress', created_at: '2026-10-15T08:15:00Z' },
  { id: '88888888-8888-4888-8888-888888888888', business_id: business.id, visitor_name: 'Демо-покупатель 02', contact: null, message: 'Спасибо за ответ.', status: 'closed', created_at: '2026-10-14T06:00:00Z' },
];
const catalog: CatalogItem[] = [
  { id: 'demo-product-1', business_id: business.id, name: 'Рюкзак · Демо', price_minor: 1500000, available: true, is_demo: true },
  { id: 'demo-product-2', business_id: business.id, name: 'Сөмке · Демо', price_minor: 300000, available: true, is_demo: true },
  { id: 'demo-product-3', business_id: business.id, name: 'Тауар · Демо', price_minor: null, available: false, is_demo: true },
];
const denyWrite = async (): Promise<never> => { throw new ApiError(0, 'DEMO_READ_ONLY'); };
const allowed = (b: Business) => {
  if (![business.id, other.id].includes(b.id)) throw new ApiError(403, 'ACCESS_DENIED');
};
/** Explicitly selected, read-only fixtures. Never intercepts or replaces a failed live request. */
export const demoGateway: SellerGateway = {
  mode: 'demo', canWrite: false,
  async me() { return { businesses: structuredClone([business, other]) }; },
  async inquiries(b) { allowed(b); return { items: structuredClone(inquiries.filter(i => i.business_id === b.id)), next_cursor: null }; },
  setInquiryStatus: denyWrite,
  async customers(b, search) { allowed(b); return { items: structuredClone(customers.filter(c => c.business_id === b.id && c.display_name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))), next_cursor: null }; },
  createCustomer: denyWrite,
  async catalog(b) { allowed(b); return { items: structuredClone(catalog.filter(c => c.business_id === b.id)), next_cursor: null }; },
};
