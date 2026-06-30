
import { keepPreviousData, useMutation, useQuery, useQueryClient, useInfiniteQuery, InfiniteData } from "@tanstack/react-query";
import { useAppSelector } from "@/hooks/useAppSelector";
import { toast } from "sonner";

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
  infinite: (filters: TaskFilters, orgId?: string | null) => ["tasks", orgId, "infinite", filters] as const,
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

export function useInfiniteTasksQuery(
  filters: TaskFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useInfiniteQuery({
    queryKey: tasksQueryKeys.infinite(filters, activeOrgId),
    queryFn: ({ pageParam = 1 }) =>
      taskApi.getTasks({ ...filters, page: pageParam as number, limit: filters.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.data?.meta?.hasNextPage ? allPages.length + 1 : undefined;
    },
    staleTime: options?.staleTime ?? 0,
    enabled: (options?.enabled ?? true) && !!activeOrgId,
  });
}


export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId, user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: (payload: CreateTaskInput | FormData) => taskApi.createTask(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      const previousTasks = queryClient.getQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) });

      let parsedPayload: any = payload;
      if (payload instanceof FormData) {
        parsedPayload = {
          title: payload.get("title"),
          description: payload.get("description"),
          status: payload.get("status"),
          priority: payload.get("priority"),
          projectId: payload.get("projectId"),
        };
      }

      const tempTask = {
        id: `temp-${Date.now()}`,
        _id: `temp-${Date.now()}`,
        ...parsedPayload,
        status: parsedPayload.status || "TODO",
        priority: parsedPayload.priority || "MEDIUM",
        creatorId: user,
        creator: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        },
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        isDraft: false,
        isPublic: true,
        assignees: [],
        assigneeUsers: [],
        tags: [],
      };

      previousTasks.forEach(([queryKey, oldData]) => {
        if (!oldData) return;

        // Extract filters to check if this query list matches the temp task
        const filters = queryKey.find((k) => typeof k === "object" && k !== null) as TaskFilters | undefined;
        
        // If the query is filtered by a specific status, only inject if it matches our temp task status.
        // E.g. we don't want to inject a TODO task into the DRAFT or DONE column.
        if (filters?.status && filters.status !== "ALL" && filters.status !== tempTask.status) {
          return;
        }

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          
          // Handle infinite queries
          if (old.pages) {
            const newPages = old.pages.map((page: any, i: number) => {
              if (i === 0) {
                return {
                  ...page,
                  data: {
                    ...page.data,
                    items: [tempTask, ...(page.data?.items || [])]
                  }
                };
              }
              return page;
            });
            return { ...old, pages: newPages };
          }
          
          // Handle regular queries
          if (!old.data || !Array.isArray(old.data.items)) return old;
          return {
            ...old,
            data: {
              ...old.data,
              items: [tempTask, ...old.data.items]
            }
          };
        });
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

export function useUpsertTaskDraftMutation(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const { activeOrgId, user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: ({ id, data, config }: { id?: string | null; data: TaskDraftInput; config?: import("axios").AxiosRequestConfig }) => {
      if (id) {
        return taskApi.updateDraft(id, data, config);
      }
      return taskApi.createDraft(data, config);
    },
    onMutate: async ({ id, data }) => {
      if (!options?.silent) {
        toast.loading("Saving draft...", { id: "draft-sync" });
      }

      await queryClient.cancelQueries({ queryKey: ["tasks", activeOrgId] });

      const tempId = id || `temp-draft-${Date.now()}`;
      
      const tempDraft = {
        id: tempId,
        _id: tempId,
        ...data,
        isDraft: true,
        creator: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically update infinite queries
      queryClient.setQueriesData({ queryKey: ["tasks", activeOrgId, "infinite"] }, (old: any) => {
        if (!old?.pages) return old;
        
        // Check if exists
        const exists = old.pages.some((p: any) => p.data?.items?.some((t: any) => t.id === id || t._id === id));
        if (exists) {
          // Update existing
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              data: {
                ...p.data,
                items: p.data?.items?.map((t: any) => (t.id === id || t._id === id ? { ...t, ...tempDraft } : t))
              }
            }))
          };
        }

        // Insert new at the top
        const newPages = [...old.pages];
        if (newPages.length > 0) {
          const newItems = [tempDraft, ...(newPages[0].data?.items || [])];
          newPages[0] = { ...newPages[0], data: { ...newPages[0].data, items: newItems } };
        }
        return { ...old, pages: newPages };
      });

      return { tempId };
    },
    onSuccess: async (response, variables, context) => {
      if (!options?.silent) {
        toast.success("Draft saved.", { id: "draft-sync" });
      }
      
      const realId = response?.data?.id || (response?.data as any)?._id;
      
      // Replace temp id with real id if it was a create
      if (!variables.id && realId) {
        queryClient.setQueriesData({ queryKey: ["tasks", activeOrgId, "infinite"] }, (old: any) => {
           if (!old?.pages) return old;
           return {
             ...old,
             pages: old.pages.map((p: any) => ({
               ...p,
               data: {
                 ...p.data,
                 items: p.data?.items?.map((t: any) => (t.id === context?.tempId || t._id === context?.tempId ? { ...t, ...response.data, isDraft: true } : t))
               }
             }))
           };
        });
      }
      
      // Invalidate just drafts to keep it fresh
      await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.drafts({}, activeOrgId) });
    },
    onError: (err) => {
      if (!options?.silent) {
        toast.error("Failed to save draft.", { id: "draft-sync" });
      }
      // Revert optimism if needed
      queryClient.invalidateQueries({ queryKey: ["tasks", activeOrgId] });
    }
  });
}

export function usePublishTaskDraftMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId, user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTaskInput }) =>
      taskApi.publishDraft(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.drafts({}, activeOrgId) });
      
      const previousTasks = queryClient.getQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) });
      const previousDrafts = queryClient.getQueriesData({ queryKey: tasksQueryKeys.drafts({}, activeOrgId) });

      const tempTask = {
        id: id,
        _id: id,
        ...data,
        status: data.status || "TODO",
        priority: data.priority || "MEDIUM",
        isDraft: false,
        isPublic: true,
        creator: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        },
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        assignees: [],
        assigneeUsers: [],
        tags: [],
      };

      // Add/Update tasks list (including infinite lists)
      queryClient.setQueriesData({ queryKey: tasksQueryKeys.all(activeOrgId) }, (old: any) => {
        if (!old) return old;

        // Handle infinite queries
        if (old.pages) {
          const exists = old.pages.some((p: any) => p.data?.items?.some((t: any) => t.id === id || t._id === id));
          if (exists) {
            return {
              ...old,
              pages: old.pages.map((p: any) => ({
                ...p,
                data: {
                  ...p.data,
                  items: p.data?.items?.map((t: any) => 
                    (t.id === id || t._id === id) 
                      ? { ...t, ...tempTask, isDraft: false } 
                      : t
                  )
                }
              }))
            };
          } else {
            const newPages = [...old.pages];
            if (newPages.length > 0) {
              const newItems = [tempTask, ...(newPages[0].data?.items || [])];
              newPages[0] = { ...newPages[0], data: { ...newPages[0].data, items: newItems } };
            }
            return { ...old, pages: newPages };
          }
        }

        // Handle regular queries
        if (!old.data || !Array.isArray(old.data.items)) return old;
        const exists = old.data.items.some((t: any) => t.id === id || t._id === id);
        if (exists) {
          return {
            ...old,
            data: {
              ...old.data,
              items: old.data.items.map((t: any) => 
                (t.id === id || t._id === id) 
                  ? { ...t, ...tempTask, isDraft: false } 
                  : t
              )
            }
          };
        } else {
          return {
            ...old,
            data: {
              ...old.data,
              items: [tempTask, ...old.data.items]
            }
          };
        }
      });

      // Remove from drafts list
      queryClient.setQueriesData({ queryKey: tasksQueryKeys.drafts({}, activeOrgId) }, (old: any) => {
        if (!old || !old.data || !Array.isArray(old.data.items)) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.filter((d: any) => (d.id !== id && d._id !== id))
          }
        };
      });

      return { previousTasks, previousDrafts };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDrafts) {
        context.previousDrafts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.drafts({}, activeOrgId) });
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
        if (!old) return old;
        
        if (old.pages) {
          const newPages = old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              items: (page.data?.items || []).map((t: any) =>
                (t.id === id || t._id === id) ? { ...t, status } : t
              )
            }
          }));
          return { ...old, pages: newPages };
        }
        
        if (!old.data || !Array.isArray(old.data.items)) return old;
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
    staleTime: 15_000,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
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
        if (!old) return old;
        
        if (old.pages) {
          const newPages = old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              items: (page.data?.items || []).map((t: any) =>
                (t.id === id || t._id === id) ? { ...t, ...data } : t
              )
            }
          }));
          return { ...old, pages: newPages };
        }
        
        if (!old.data || !Array.isArray(old.data.items)) return old;
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

export function useSaveUserOrderMutation() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: ({ projectId, statusId, taskIds }: { projectId: string; statusId: string; taskIds: string[] }) =>
      taskApi.saveUserOrder(projectId, statusId, taskIds),
    onSuccess: () => {
      // Don't invalidate, because this is an optimistic drag and drop operation and we already updated cache.
      // queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(activeOrgId) });
    },
  });
}

export function useSearchTaskByIdQuery(
  taskId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  return useQuery({
    queryKey: ["tasks", "by-id", taskId],
    queryFn: () => taskApi.searchTaskById(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
    staleTime: options?.staleTime ?? 5000,
    retry: false,
  });
}

export function useProjectTasksInfiniteQuery(
  projectId: string,
  filters: TaskFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useInfiniteQuery({
    queryKey: ["tasks", activeOrgId, "project-infinite", projectId, filters],
    queryFn: ({ pageParam = 1 }) =>
      taskApi.getTasksByProject(projectId, { ...filters, page: pageParam as number, limit: filters.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.data?.meta?.hasNextPage ? allPages.length + 1 : undefined;
    },
    staleTime: options?.staleTime ?? 0,
    enabled: (options?.enabled ?? true) && !!activeOrgId && !!projectId,
  });
}

export function useSearchTasksQuery(
  q: string,
  filters: TaskFilters = {},
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: ["tasks", activeOrgId, "search", q, filters],
    queryFn: () => taskApi.searchTasks(q, filters),
    enabled: (options?.enabled ?? true) && !!activeOrgId && !!q,
    staleTime: options?.staleTime ?? 5000,
  });
}

