import type { components } from "../../shared/api/generated";
export type Venue = components["schemas"]["VenueResponse"] & {
  categories: string[];
  asset?: VenueAsset;
};
export type Business = components["schemas"]["PublicBusiness"] & {
  catalog?: components["schemas"]["CatalogResponse"][];
  venue_slug?: string;
  venue?: Venue;
};
export type InquiryInput = components["schemas"]["InquiryCreate"];
export type InquiryResult = components["schemas"]["InquiryReceipt"];
export type Vec3 = [number, number, number];
export interface VenueAsset {
  slug: string;
  model_url: string;
  poster_url: string;
  bounds_min: Vec3;
  bounds_max: Vec3;
  camera_position: Vec3;
  camera_target: Vec3;
  camera_fov_degrees: number;
  hotspots: {
    id: string;
    business_slug: string;
    business_id: string;
    position: Vec3;
  }[];
}
