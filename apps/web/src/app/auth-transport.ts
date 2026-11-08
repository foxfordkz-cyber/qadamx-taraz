import { withinDeadline } from "../shared/api/deadline";

export function boundedAuthFetch(
  fetcher: typeof fetch,
  timeoutMs = 8_000,
): typeof fetch {
  return (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input));
    if (!url.pathname.includes("/auth/v1/")) return fetcher(input, init);
    return withinDeadline(
      async (signal) => {
        const response = await fetcher(input, { ...init, signal });
        // Include the body in the deadline; headers alone do not settle Auth.
        const body = await response.arrayBuffer();
        if (signal.aborted)
          throw signal.reason ?? new DOMException("Aborted", "AbortError");
        return new Response(
          [204, 205, 304].includes(response.status) ? null : body,
          {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
        );
      },
      timeoutMs,
      () => new DOMException("Auth request timed out", "TimeoutError"),
      init?.signal ?? request?.signal,
    );
  };
}
