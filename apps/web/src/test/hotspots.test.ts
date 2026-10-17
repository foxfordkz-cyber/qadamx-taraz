import { describe, expect, it } from "vitest";
import assets from "../../public/venue-assets.json";
import demoSeed from "../../../../packages/contracts/demo-seed.json";
import { resolveHotspots } from "../features/explore/hotspots";
import type { VenueAsset } from "../features/explore/types";

function vector(values: number[]): [number, number, number] {
  const [x, y, z] = values;
  if (
    values.length !== 3 ||
    x === undefined ||
    y === undefined ||
    z === undefined
  )
    throw new Error("Expected a 3D vector in the venue asset manifest");
  return [x, y, z];
}

function asAsset(
  venue: (typeof assets.venues)[number],
  hotspots = venue.hotspots,
): VenueAsset {
  return {
    slug: venue.slug,
    model_url: venue.model_url,
    poster_url: venue.poster_url,
    bounds_min: vector(venue.bounds_min),
    bounds_max: vector(venue.bounds_max),
    camera_position: vector(venue.camera_position),
    camera_target: vector(venue.camera_target),
    camera_fov_degrees: venue.camera_fov_degrees,
    hotspots: hotspots.map((hotspot) => ({
      ...hotspot,
      position: vector(hotspot.position),
    })),
  };
}

describe("public hotspot bindings (checked-in asset manifest and API seed)", () => {
  it("matches all nine markers to the exact seeded business UUID and slug", () => {
    const businesses = demoSeed.tables.businesses;
    const markers = assets.venues.flatMap((venue) =>
      resolveHotspots(asAsset(venue), businesses),
    );

    expect(markers).toHaveLength(9);
    expect(new Set(markers.map((marker) => marker.business_id)).size).toBe(9);
    for (const marker of markers) {
      expect(
        businesses.some(
          (business) =>
            business.id === marker.business_id &&
            business.slug === marker.business_slug,
        ),
      ).toBe(true);
    }
  });

  it("omits a marker with a mismatched ID rather than routing to another shop", () => {
    const venue = assets.venues[0];
    const business = demoSeed.tables.businesses[0];
    const asset = asAsset(venue, [
      {
        ...venue.hotspots[0],
        business_id: "00000000-0000-4000-8000-000000000000",
      },
    ]);

    expect(resolveHotspots(asset, [business])).toEqual([]);
  });
});
