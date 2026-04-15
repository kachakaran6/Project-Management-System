"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCommentBox } from "@/features/comments/components/AddCommentBox";
import { CommentItem } from "@/features/comments/components/CommentItem";
import {
  useCreateTaskCommentMutation,
  useDeleteCommentMutation,
  useTaskCommentsQuery,
  useUpdateCommentMutation,
} from "@/features/comments/hooks/use-comments-query";
import { useAuthStore } from "@/store/auth-store";

interface TaskCommentsProps {
  taskId: string;
}

const PAGE = 1;
const LIMIT = 10;

export function TaskComments({ taskId }: TaskCommentsProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);

  const commentsQuery = useTaskCommentsQuery(taskId, {
    enabled: Boolean(taskId),
    page: PAGE,
    limit: LIMIT,
    refetchInterval: 15_000,
  });

  const addComment = useCreateTaskCommentMutation(taskId, PAGE, LIMIT);
  const updateComment = useUpdateCommentMutation(taskId);
  const deleteComment = useDeleteCommentMutation(taskId);

  const comments = commentsQuery.data?.data.items ?? [];
  const meta = commentsQuery.data?.data.meta;

  const handleAdd = async (content: string) => {
    try {
      await addComment.mutateAsync(content);
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  const handleUpdate = async (commentId: string, content: string) => {
    try {
      await updateComment.mutateAsync({ commentId, content });
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <section className="space-y-4">
      <AddCommentBox
        onSubmit={handleAdd}
        isSubmitting={addComment.isPending}
      />

      {commentsQuery.isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <li key={idx} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No comments yet
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const commentId = String(comment.id || comment._id || "");

            return (
              <CommentItem
                key={commentId}
                comment={comment}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isUpdating={updateComment.isPending}
                isDeleting={deleteComment.isPending}
              />
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {meta
            ? `Showing ${meta.itemCount} of ${meta.totalItems} comments`
            : "Showing comments"}
        </p>

        <Button
          size="sm"
          variant="outline"
          onClick={() => commentsQuery.refetch()}
          disabled={commentsQuery.isFetching}
        >
          {commentsQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </section>
  );
}
