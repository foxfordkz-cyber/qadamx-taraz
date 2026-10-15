export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export interface ApiClient {
  request: (path: string, init?: RequestInit) => Promise<unknown>;
}

export function createApiClient(options: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
  fetcher?: typeof fetch;
}): ApiClient {
  return {
    async request(path, init = {}) {
      if (!options.baseUrl) throw new ApiError(0, 'API_UNCONFIGURED');
      // Prevent external URLs from receiving a seller token.
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new ApiError(0, 'INVALID_PATH');
      const token = await options.getToken();
      if (!token) throw new ApiError(401, 'AUTH_REQUIRED');
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('Accept', 'application/json');
      if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
      let response: Response;
      try {
        response = await (options.fetcher ?? fetch)(`${options.baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers, redirect: 'error' });
      } catch (error) {
        if (init.signal?.aborted) throw error;
        throw new ApiError(0, 'NETWORK_ERROR');
      }
      if (!response.ok) {
        if (response.status === 401) options.onUnauthorized?.();
        // Do not render arbitrary backend messages, traces or personal data.
        throw new ApiError(response.status, `HTTP_${response.status}`);
      }
      if (response.status === 204) return null;
      try { return await response.json(); }
      catch { throw new ApiError(0, 'INVALID_RESPONSE'); }
    },
  };
}
