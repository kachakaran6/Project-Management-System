"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { TaskComment } from "@/types/comment.types";

interface CommentItemProps {
  comment: TaskComment;
  currentUserId?: string;
  onUpdate: (commentId: string, content: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

function toRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateString).toLocaleDateString();
}

function normalizeCommentId(comment: TaskComment) {
  return String(comment.id || comment._id || "");
}

function getCommentUser(comment: TaskComment) {
  const userRef = comment.userId || comment.authorId;
  if (userRef && typeof userRef === "object") {
    return userRef;
  }

  return {
    id: typeof userRef === "string" ? userRef : undefined,
    firstName: "",
    lastName: "",
    email: "Unknown user",
  };
}

export function CommentItem({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);

  const user = useMemo(() => getCommentUser(comment), [comment]);
  const commentId = normalizeCommentId(comment);

  const userId =
    typeof comment.userId === "string"
      ? comment.userId
      : comment.userId?.id || comment.userId?._id;

  const isOwner = Boolean(currentUserId && userId && currentUserId === userId);
  const canEdit = comment.canEdit ?? isOwner;
  const canDelete = comment.canDelete ?? isOwner;

  const displayName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Unknown user";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === comment.content || !commentId) {
      setIsEditing(false);
      setDraft(comment.content);
      return;
    }

    await onUpdate(commentId, trimmed);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!commentId) return;
    await onDelete(commentId);
  };

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <Avatar className="size-8">
          <AvatarImage src={user.avatarUrl} alt={displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="shrink-0 text-xs text-muted-foreground">
                {toRelativeTime(comment.createdAt)}
                {comment.isEdited ? " • edited" : ""}
              </p>
            </div>

            {(canEdit || canDelete) && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-destructive focus:text-destructive"
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 size-4" />
                      )}
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {!isEditing ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/95">
              {comment.content}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                maxLength={2000}
                disabled={isUpdating}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setDraft(comment.content);
                  }}
                >
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating || !draft.trim()}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 size-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
