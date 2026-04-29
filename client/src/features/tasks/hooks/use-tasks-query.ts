
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
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
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

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      taskApi.updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });

      const previousTask = queryClient.getQueryData(tasksQueryKeys.detail(id));

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

      return { previousTask, id };
    },
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          tasksQueryKeys.detail(context.id),
          context.previousTask,
        );
      }
    },
    onSettled: (data, error, variables) => {
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
