import type { Business, InquiryInput, InquiryResult, Venue } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(res.status, (await res.text().catch(() => '')) || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const getVenues = () => req<Venue[]>('/venues');

export const getBusinesses = (p: { venue?: string; q?: string; category?: string } = {}) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v && s.set(k, v));
  return req<Business[]>(`/businesses?${s}`);
};

export const getBusiness = (slug: string) =>
  req<Business>(`/businesses/${encodeURIComponent(slug)}`);

export const postInquiry = (businessId: string, body: InquiryInput) =>
  req<InquiryResult>(`/businesses/${encodeURIComponent(businessId)}/inquiries`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
