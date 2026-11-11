import { ApiError, parseApiError } from "./errors";
import { withinDeadline } from "./deadline";
export { ApiError } from "./errors";
export interface ApiClient {
  request: (path: string, init?: RequestInit) => Promise<unknown>;
}

export function createApiClient(options: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
  fetcher?: typeof fetch;
  authTimeoutMs?: number;
  readTimeoutMs?: number;
}): ApiClient {
  return {
    async request(path, init = {}) {
      if (!options.baseUrl) throw new ApiError(0, "API_UNCONFIGURED");
      // Prevent external URLs from receiving a seller token.
      if (!path.startsWith("/") || path.startsWith("//") || path.includes(".."))
        throw new ApiError(0, "INVALID_PATH");
      const token = await withinDeadline(
        () => options.getToken(),
        options.authTimeoutMs ?? 10_000,
        () => new ApiError(0, "AUTH_UNAVAILABLE"),
        init.signal,
      );
      if (!token) {
        options.onUnauthorized?.();
        throw new ApiError(401, "AUTH_REQUIRED");
      }
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Accept", "application/json");
      if (init.body && !(init.body instanceof FormData))
        headers.set("Content-Type", "application/json");
      const read =
        !init.method || ["GET", "HEAD"].includes(init.method.toUpperCase());
      const execute = async (signal?: AbortSignal | null) => {
        let response: Response;
        try {
          response = await (options.fetcher ?? fetch)(
            `${options.baseUrl.replace(/\/$/, "")}${path}`,
            { ...init, signal, headers, redirect: "error" },
          );
        } catch (error) {
          if (signal?.aborted) throw error;
          throw new ApiError(0, "NETWORK_ERROR");
        }
        // A late response must not expire a session or enter the private cache.
        if (signal?.aborted)
          throw signal.reason ?? new DOMException("Aborted", "AbortError");
        if (!response.ok) {
          if (response.status === 401) options.onUnauthorized?.();
          let payload: unknown = null;
          try {
            payload = await response.json();
          } catch {
            /* Non-JSON errors still use the HTTP status. */
          }
          throw parseApiError(
            response.status,
            payload,
            response.headers.get("X-Request-ID"),
            response.headers.get("Retry-After"),
          );
        }
        if (response.status === 204) return null;
        try {
          return await response.json();
        } catch {
          throw new ApiError(0, "INVALID_RESPONSE");
        }
      };
      // Writes retain their existing unknown-result/idempotency protocol.
      return read
        ? withinDeadline(
            execute,
            options.readTimeoutMs ?? 20_000,
            () => new ApiError(0, "BACKEND_TIMEOUT"),
            init.signal,
          )
        : execute(init.signal);
    },
  };
}
