import { ApiError, type ApiClient } from "../../../shared/api/client";
import { readUuid } from "../../../shared/api/bindings";
import type { operations } from "../../../shared/api/generated";
import { readAnalyticsSnapshot, type AnalyticsDays } from "./model";

type AnalyticsOperation =
  operations["get_analytics_api_v1_businesses__id__analytics_get"];
type AnalyticsParams = AnalyticsOperation["parameters"];

/** Existing auth-aware API client owns Bearer, error mapping and 401 handling. */
export async function readLiveAnalytics(
  api: ApiClient,
  request: { businessId: string; days: AnalyticsDays; signal: AbortSignal },
) {
  if (request.signal.aborted)
    throw new DOMException("Analytics request cancelled", "AbortError");
  if (request.days !== 7 && request.days !== 30)
    throw new ApiError(0, "INVALID_ANALYTICS_PERIOD");
  const path: AnalyticsParams["path"] = { id: readUuid(request.businessId) };
  const query: NonNullable<AnalyticsParams["query"]> = { days: request.days };
  let raw: unknown;
  try {
    raw = await api.request(
      `/businesses/${encodeURIComponent(path.id)}/analytics?days=${query.days}`,
      { signal: request.signal },
    );
  } catch (error) {
    if (request.signal.aborted)
      throw new DOMException("Analytics request cancelled", "AbortError");
    throw error;
  }
  if (request.signal.aborted)
    throw new DOMException("Analytics request cancelled", "AbortError");
  return readAnalyticsSnapshot(raw, request);
}
