import type { Business, VenueAsset } from "./types";

export function resolveHotspots(asset: VenueAsset, businesses: Business[]) {
  return asset.hotspots.flatMap((hotspot) => {
    const business = businesses.find(
      (candidate) =>
        candidate.id === hotspot.business_id &&
        candidate.slug === hotspot.business_slug,
    );
    return business ? [{ ...hotspot, name: business.name }] : [];
  });
}
