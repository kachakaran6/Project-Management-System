"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { taskApi } from "@/features/tasks/api/task.api";
import {
  CreateTaskInput,
  TaskDraftFilters,
  TaskDraftInput,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task.types";

export const tasksQueryKeys = {
  all: ["tasks"] as const,
  list: (filters: TaskFilters) => ["tasks", filters] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
  draftsAll: ["tasks", "drafts"] as const,
  drafts: (filters: TaskDraftFilters = {}) => ["tasks", "drafts", filters] as const,
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

export function useTaskDraftsQuery(
  filters: TaskDraftFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  return useQuery({
    queryKey: tasksQueryKeys.drafts(filters),
    queryFn: () => taskApi.getDrafts(filters),
    staleTime: options?.staleTime ?? 10_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpsertTaskDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id?: string | null; data: TaskDraftInput }) => {
      if (id) {
        return taskApi.updateDraft(id, data);
      }
      return taskApi.createDraft(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.draftsAll });
    },
  });
}

export function usePublishTaskDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTaskInput }) =>
      taskApi.publishDraft(id, data),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.draftsAll }),
      ]);
    },
  });
}

export function useDeleteTaskDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.deleteDraft(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.draftsAll });
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      id, 
      status, 
      position 
    }: { 
      id: string; 
      status: TaskStatus; 
      position?: number 
    }) => {
      // If position is provided, use the general updateTask API to update both
      if (position !== undefined) {
        return taskApi.updateTask(id, { status, position });
      }
      return taskApi.changeStatus(id, status);
    },
    onSuccess: async () => {
      // We don't necessarily want to invalidate immediately if we are doing local optimistic updates
      // but it's safe to do so after the mutation settles.
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
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      taskApi.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData(tasksQueryKeys.detail(id));

      // Optimistically update to the new value
      queryClient.setQueryData(tasksQueryKeys.detail(id), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            ...data,
          },
        };
      });

      // Return a context object with the snapshotted value
      return { previousTask, id };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTask) {
        queryClient.setQueryData(
          tasksQueryKeys.detail(context.id),
          context.previousTask,
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: tasksQueryKeys.detail(variables.id),
      });
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
