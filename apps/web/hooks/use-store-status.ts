"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface StoreStatus {
  id: string;
  name: string;
  isStoreOpen: boolean;
  lastChange: {
    isOpen: boolean;
    reason: string | null;
    changedAt: string;
    changedBy: { id: string; name: string };
  } | null;
  outstanding: {
    openOrders: number;
    kitchenTickets: number;
    pendingOnlineOrders: number;
  };
}

export function useStoreStatus(branchId: string | null) {
  return useQuery({
    queryKey: ["store-status", branchId],
    queryFn: () => api.get<StoreStatus>(`/branches/${branchId}/store-status`),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
}

export function useSetStoreStatus(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ isOpen, reason }: { isOpen: boolean; reason?: string }) =>
      api.patch<StoreStatus>(`/branches/${branchId}/store-status`, { isOpen, reason }),
    onSuccess: (status) => {
      queryClient.setQueryData(["store-status", branchId], status);
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
