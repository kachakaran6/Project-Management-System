"use client";

import {
  useCreateTaskMutation,
  useTasksQuery,
  useUpdateTaskStatusMutation,
} from "@/features/tasks/hooks/use-tasks-query";

export function useTasks(projectId?: string) {
  const tasksQuery = useTasksQuery({ page: 1, limit: 100, projectId });
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskStatusMutation = useUpdateTaskStatusMutation();

  return {
    tasks: tasksQuery.data?.data.items ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    updateStatus: updateTaskStatusMutation.mutateAsync,
  };
}
