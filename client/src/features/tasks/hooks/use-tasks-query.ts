"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { taskApi } from "@/features/tasks/api/task.api";
import { CreateTaskInput, TaskFilters, TaskStatus } from "@/types/task.types";

export const tasksQueryKeys = {
  all: ["tasks"] as const,
  list: (filters: TaskFilters) => ["tasks", filters] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

export function useTasksQuery(
  filters: TaskFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  },
) {
  return useQuery({
    queryKey: tasksQueryKeys.list(filters),
    queryFn: () => taskApi.getTasks(filters),
    staleTime: options?.staleTime ?? 30_000,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskInput) => taskApi.createTask(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      taskApi.changeStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useTaskQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: tasksQueryKeys.detail(id),
    queryFn: () => taskApi.getTask(id),
    enabled: enabled && Boolean(id),
    staleTime: 20_000,
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskInput> }) =>
      taskApi.updateTask(id, data),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: tasksQueryKeys.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useBulkTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TaskStatus }) =>
      Promise.all(ids.map((id) => taskApi.changeStatus(id, status))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}
