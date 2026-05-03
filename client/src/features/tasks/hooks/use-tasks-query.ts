
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/hooks/useAppSelector";


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
  all: (orgId?: string | null) => ["tasks", orgId] as const,
  list: (filters: TaskFilters, orgId?: string | null) => ["tasks", orgId, filters] as const,
  detail: (id: string, orgId?: string | null) => ["tasks", orgId, "detail", id] as const,
  draftsAll: (orgId?: string | null) => ["tasks", orgId, "drafts"] as const,
  drafts: (filters: TaskDraftFilters = {}, orgId?: string | null) => ["tasks", orgId, "drafts", filters] as const,
};


export function useTasksQuery(
  filters: TaskFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  },
) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: tasksQueryKeys.list(filters, activeOrgId),
    queryFn: () => taskApi.getTasks(filters),
    staleTime: options?.staleTime ?? 0,
    enabled: (options?.enabled ?? true) && !!activeOrgId,
    refetchInterval: options?.refetchInterval,
    refetchOnMount: true,
  });
}


export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskInput) => taskApi.createTask(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: tasksQueryKeys.drafts(filters, activeOrgId),
    queryFn: () => taskApi.getDrafts(filters),
    staleTime: options?.staleTime ?? 10_000,
    enabled: (options?.enabled ?? true) && !!activeOrgId,
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
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "drafts"] }),
      ]);
    },
  });
}

export function useDeleteTaskDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.deleteDraft(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useAppSelector((state) => state.auth);

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
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.detail(id, activeOrgId) });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) });
      const previousDetail = queryClient.getQueryData(tasksQueryKeys.detail(id, activeOrgId));

      // Optimistically update to the new value in all lists
      queryClient.setQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data.items)) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((t: any) =>
              (t.id === id || t._id === id) ? { ...t, status } : t
            )
          }
        };
      });

      // Optimistically update the detail view
      if (previousDetail) {
        queryClient.setQueryData(tasksQueryKeys.detail(id, activeOrgId), (old: any) => {
          if (!old || !old.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              status
            }
          };
        });
      }

      return { previousTasks, previousDetail, id };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(tasksQueryKeys.detail(context.id, activeOrgId), context.previousDetail);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to keep server and client in sync
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.detail(variables.id, activeOrgId) });
    },
  });
}

export function useTaskQuery(id: string, enabled = true) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: tasksQueryKeys.detail(id, activeOrgId),
    queryFn: () => taskApi.getTask(id),
    enabled: enabled && Boolean(id) && !!activeOrgId,
    staleTime: 0,
    refetchOnMount: true,
  });

}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      taskApi.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.detail(id, activeOrgId) });
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });

      const previousDetail = queryClient.getQueryData(tasksQueryKeys.detail(id, activeOrgId));
      const previousTasks = queryClient.getQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) });

      // Update detail
      queryClient.setQueryData(tasksQueryKeys.detail(id, activeOrgId), (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            ...data,
          },
        };
      });

      // Update lists
      queryClient.setQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data.items)) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((t: any) =>
              (t.id === id || t._id === id) ? { ...t, ...data } : t
            )
          }
        };
      });

      return { previousDetail, previousTasks, id };
    },
    onError: (err, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(tasksQueryKeys.detail(context.id, activeOrgId), context.previousDetail);
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      queryClient.invalidateQueries({
        queryKey: tasksQueryKeys.detail(variables.id, activeOrgId),
      });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useBulkTaskStatusMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TaskStatus }) =>
      Promise.all(ids.map((id) => taskApi.changeStatus(id, status))),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      const previousTasks = queryClient.getQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) });

      queryClient.setQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data.items)) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((t: any) =>
              ids.includes(t.id) || ids.includes(t._id) ? { ...t, status } : t
            )
          }
        };
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
    },
  });
}
