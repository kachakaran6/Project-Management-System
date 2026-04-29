"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/hooks/useAppSelector";

import { statusAPI } from "../statusAPI";
import { Status } from "@/types/task.types";

export const statusesQueryKeys = {
  all: (orgId?: string | null) => ["statuses", orgId] as const,
};


export function useStatusesQuery() {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: statusesQueryKeys.all(activeOrgId),
    queryFn: async () => {
      const response = await statusAPI.fetchStatuses();
      return response.data.data as Status[];
    },
    staleTime: 60_000,
    enabled: !!activeOrgId,
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
