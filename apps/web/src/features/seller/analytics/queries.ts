import { queryOptions, useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { useAuth } from "../../../app/auth";
import { useBusiness, useRuntime } from "../../../app/runtime";
import { demoAnalyticsAdapter, type DemoAnalyticsAdapter } from "./demo";
import { ApiError, type ApiClient } from "../../../shared/api/client";
import { readLiveAnalytics } from "./live";
import {
  readAnalyticsSnapshot,
  type AnalyticsDays,
  type DemoScenario,
} from "./model";

const DemoAdapterContext =
  createContext<DemoAnalyticsAdapter>(demoAnalyticsAdapter);
/** Injectable only within the explicit Demo source; cannot enable a live route. */
export const AnalyticsDemoAdapterProvider = DemoAdapterContext.Provider;

/** A failed live request never falls back to synthetic data. */
export function analyticsQueryOptions(options: {
  scope: string;
  businessId: string;
  days: AnalyticsDays;
  scenario: DemoScenario;
  demo: boolean;
  expired?: boolean;
  authenticated?: boolean;
  apiConfigured?: boolean;
  api?: ApiClient;
  adapter?: DemoAnalyticsAdapter;
}) {
  const adapter = options.adapter ?? demoAnalyticsAdapter;
  const liveEnabled = !!(
    options.authenticated &&
    options.apiConfigured &&
    options.api
  );
  return queryOptions({
    queryKey: [
      options.scope,
      options.businessId,
      "analytics",
      options.days,
      options.demo ? options.scenario : "live",
      options.demo ? "demo-contract-v1" : "api-0.6.0",
    ] as const,
    enabled: (options.demo || liveEnabled) && !options.expired,
    retry: false,
    staleTime: 0,
    // A different identity, business, period or fixture never keeps old data.
    placeholderData: undefined,
    queryFn: async ({ signal }) => {
      // Also guard explicit refetch() when the query is disabled.
      if (options.expired || (!options.demo && !options.authenticated))
        throw new ApiError(401, "AUTH_REQUIRED");
      if (!options.demo) {
        if (!options.api || !options.apiConfigured)
          throw new ApiError(0, "API_UNCONFIGURED");
        return readLiveAnalytics(options.api, {
          businessId: options.businessId,
          days: options.days,
          signal,
        });
      }
      const value = await adapter.read({
        scope: options.scope,
        businessId: options.businessId,
        days: options.days,
        scenario: options.scenario,
        signal,
      });
      if (signal.aborted)
        throw new DOMException("Analytics request cancelled", "AbortError");
      return readAnalyticsSnapshot(value, {
        businessId: options.businessId,
        days: options.days,
      });
    },
  });
}

export function useAnalytics(
  days: AnalyticsDays,
  scenario: DemoScenario = "activity",
) {
  const auth = useAuth();
  const { scope, api } = useRuntime();
  const { business } = useBusiness();
  const adapter = useContext(DemoAdapterContext);
  const query = useQuery(
    analyticsQueryOptions({
      scope,
      businessId: business.id,
      days,
      scenario,
      demo: auth.demo,
      expired: auth.expired,
      authenticated: !!auth.session,
      apiConfigured: !!import.meta.env.VITE_API_BASE_URL?.trim(),
      api,
      adapter,
    }),
  );
  const authenticated = !!auth.session && !auth.expired;
  const configured = !!import.meta.env.VITE_API_BASE_URL?.trim();
  const mode =
    auth.demo && !auth.expired
      ? "demo"
      : authenticated && configured
        ? "live"
        : "waiting";
  return {
    ...query,
    data: mode !== "waiting" ? query.data : undefined,
    mode,
    unavailableReason:
      mode !== "waiting"
        ? null
        : !authenticated
          ? ("auth-required" as const)
          : ("api-unconfigured" as const),
  };
}
