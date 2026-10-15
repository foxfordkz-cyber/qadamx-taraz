import { ApiError } from "../../shared/api/client";
import { parseApiError } from "../../shared/api/errors";
import { record } from "../ledger/data";
import type {
  Business,
  InquiryInput,
  InquiryResult,
  Venue,
  VenueAsset,
} from "./types";
export async function publicRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) throw new ApiError(0, "API_UNCONFIGURED");
  let r: Response;
  try {
    r = await fetch(base.replace(/\/$/, "") + path, {
      ...init,
      credentials: "omit",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR");
  }
  const body: unknown = await r.json().catch(() => null);
  if (!r.ok) throw parseApiError(r.status, body, r.headers.get("X-Request-ID"));
  return body;
}
async function all<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const p = record(
      await publicRequest(
        `${path}${path.includes("?") ? "&" : "?"}limit=100${cursor ? `&cursor=${cursor}` : ""}`,
      ),
    );
    if (!Array.isArray(p.items)) throw new ApiError(0, "INVALID_RESPONSE");
    items.push(...(p.items as T[]));
    cursor = typeof p.next_cursor === "string" ? p.next_cursor : null;
    if (cursor && seen.has(cursor)) throw new ApiError(0, "INVALID_RESPONSE");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
export const getAssets = async () => {
  const r = await fetch("/venue-assets.json");
  if (!r.ok) throw new ApiError(r.status, "ASSET_UNAVAILABLE");
  const body = record(await r.json());
  if (body.schema_version !== 1 || !Array.isArray(body.venues))
    throw new ApiError(0, "INVALID_RESPONSE");
  return body.venues as VenueAsset[];
};
export async function getVenues() {
  const [venues, businesses, assets] = await Promise.all([
    all<Venue>("/venues"),
    all<Business>("/businesses"),
    getAssets().catch(() => []),
  ]);
  return venues.map((v) => ({
    ...v,
    categories: [
      ...new Set(
        businesses.filter((b) => b.venue_id === v.id).map((b) => b.category),
      ),
    ],
    asset: assets.find((a) => a.slug === v.slug),
  }));
}
export async function getBusinesses(
  p: { venue?: string; q?: string; category?: string } = {},
) {
  const params = new URLSearchParams();
  if (p.venue) {
    const venues = await all<Venue>("/venues"),
      v = venues.find((v) => v.slug === p.venue);
    if (!v) return [];
    params.set("venue_id", v.id);
  }
  if (p.q) params.set("q", p.q);
  if (p.category) params.set("category", p.category);
  return all<Business>(`/businesses?${params}`);
}
export async function getBusiness(slug: string) {
  const [raw, venues] = await Promise.all([
    publicRequest(`/businesses/${encodeURIComponent(slug)}`),
    all<Venue>("/venues"),
  ]);
  const b = record(raw);
  if (typeof b.id !== "string" || !Array.isArray(b.catalog))
    throw new ApiError(0, "INVALID_RESPONSE");
  return {
    ...b,
    venue_slug: venues.find((v) => v.id === b.venue_id)?.slug,
  } as Business;
}
export async function postInquiry(
  id: string,
  body: InquiryInput,
): Promise<InquiryResult> {
  const r = record(
    await publicRequest(`/businesses/${id}/inquiries`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  if (typeof r.id !== "string" || typeof r.created_at !== "string")
    throw new ApiError(0, "INVALID_RESPONSE");
  return r as InquiryResult;
}
