"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { commentApi } from "@/features/comments/api/comment.api";
import { useAuthStore } from "@/store/auth-store";
import { PaginatedResult } from "@/types/api.types";
import { TaskComment } from "@/types/comment.types";

export const commentsQueryKeys = {
  all: ["comments"] as const,
  task: (taskId: string) => ["comments", "task", taskId] as const,
  list: (taskId: string, page: number, limit: number) =>
    ["comments", "task", taskId, page, limit] as const,
};

type CommentsQueryOptions = {
  enabled?: boolean;
  page?: number;
  limit?: number;
  refetchInterval?: number;
};

export function useTaskCommentsQuery(taskId: string, options?: CommentsQueryOptions) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;

  return useQuery({
    queryKey: commentsQueryKeys.list(taskId, page, limit),
    queryFn: () => commentApi.getTaskComments(taskId, { page, limit }),
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    staleTime: 20_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
  });
}

export function useCreateTaskCommentMutation(taskId: string, page = 1, limit = 10) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      commentApi.createTaskComment(taskId, { content }),
    onMutate: async (content: string) => {
      const queryKey = commentsQueryKeys.list(taskId, page, limit);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<{ data: PaginatedResult<TaskComment> }>(
        queryKey,
      );
      const { user } = useAuthStore.getState();

      const optimisticComment: TaskComment = {
        id: `optimistic-${Date.now()}`,
        content,
        taskId,
        userId: {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
        },
        canEdit: true,
        canDelete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (previous?.data?.items) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          data: {
            ...previous.data,
            items: [optimisticComment, ...previous.data.items],
            meta: {
              ...previous.data.meta,
              totalItems: previous.data.meta.totalItems + 1,
              itemCount: previous.data.meta.itemCount + 1,
            },
          },
        });
      }

      return { previous, queryKey };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentsQueryKeys.task(taskId),
      });
    },
  });
}

export function useUpdateCommentMutation(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentApi.updateComment(commentId, { content }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentsQueryKeys.task(taskId),
      });
    },
  });
}

export function useDeleteCommentMutation(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentApi.deleteComment(commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: commentsQueryKeys.task(taskId),
      });
    },
  });
}
