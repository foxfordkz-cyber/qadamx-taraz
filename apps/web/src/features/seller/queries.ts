import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useBusiness, useRuntime } from "../../app/runtime";
import { ApiError } from "../../shared/api/client";
import type { CustomerInput, InquiryStatus } from "../../shared/api/models";

export function useInquiries() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  return useInfiniteQuery({
    queryKey: [scope, business.id, "inquiries"],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      gateway.inquiries(business, pageParam, signal),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchOnWindowFocus: true,
  });
}
export function useInquiryStatus() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      gateway.setInquiryStatus(business, id, status),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: [scope, business.id, "inquiries"],
      });
    },
  });
}
/** Shared with ledger-web: query keys include both identity scope and business UUID. */
export function useCustomers(search: string) {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  return useInfiniteQuery({
    queryKey: [scope, business.id, "customers", search],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      gateway.customers(business, search, pageParam, signal),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
export function useCreateCustomer() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const customer = await gateway.createCustomer(business, input);
      if (customer.business_id !== business.id)
        throw new ApiError(403, "ACCESS_DENIED");
      return customer;
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: [scope, business.id, "customers"],
      });
    },
  });
}
export function useCatalog() {
  const { gateway, scope } = useRuntime();
  const { business } = useBusiness();
  return useQuery({
    queryKey: [scope, business.id, "catalog"],
    queryFn: ({ signal }) => gateway.catalog(business, signal),
  });
}
