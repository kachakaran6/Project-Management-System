"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { statusAPI } from "../statusAPI";
import { Status } from "@/types/task.types";

export const statusesQueryKeys = {
  all: ["statuses"] as const,
};

export function useStatusesQuery() {
  return useQuery({
    queryKey: statusesQueryKeys.all,
    queryFn: async () => {
      const response = await statusAPI.fetchStatuses();
      return response.data.data as Status[];
    },
    staleTime: 60_000,
  });
}

export function useCreateStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Status>) => statusAPI.createStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusesQueryKeys.all });
    },
  });
}

export function useUpdateStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Status> }) => statusAPI.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusesQueryKeys.all });
    },
  });
}

export function useReorderStatusesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reorderData: { id: string; order: number }[]) => statusAPI.reorderStatuses(reorderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusesQueryKeys.all });
    },
  });
}

export function useDeleteStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => statusAPI.deleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statusesQueryKeys.all });
    },
  });
}
