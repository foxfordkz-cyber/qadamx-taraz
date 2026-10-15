// ВАЖНО: типы выровнять с 02_ARCHITECTURE_API.md. Это предположения по ТЗ витрины.
export type Venue = {
  id: string;
  slug: string;
  name: string;
  name_kk?: string;
  categories: string[];
  model_url?: string | null; // GLB подробной модели (подгружается только при выборе площадки)
  is_conceptual?: boolean;
};

export type CatalogItem = {
  id: string;
  title: string;
  price_kzt: number | null; // null => «Уточнить»
};

export type Business = {
  id: string;
  slug: string;
  venue_slug?: string;
  name: string;
  category: string;
  description: string;
  catalog?: CatalogItem[];
  hotspot?: { x: number; z: number } | null;
};

export type InquiryInput = {
  client_request_id: string;
  contact: string; // обязателен, не публикуется
  message: string;
  name?: string;
};

export type InquiryResult = { id: string; number?: string };
