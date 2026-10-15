import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../shared/api/client";
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (count, error) =>
          count < 1 &&
          error instanceof ApiError &&
          (error.status >= 500 || error.code === "NETWORK_ERROR"),
      },
      mutations: { retry: false },
    },
  });
}
export function clearPrivateCache(client: QueryClient) {
  void client.cancelQueries();
  client.clear();
}
