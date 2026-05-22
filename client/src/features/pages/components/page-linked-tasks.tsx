import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pageApi } from "@/features/pages/api/page.api";
import { taskApi } from "@/features/tasks/api/task.api";
import { PageTaskLink, TaskPriority } from "@/types/task.types";
import { CheckSquare, Plus, X, Search, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";

interface PageLinkedTasksProps {
  pageId: string;
  canEdit: boolean;
}

export function PageLinkedTasks({ pageId, canEdit }: PageLinkedTasksProps) {
  const queryClient = useQueryClient();
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["page-tasks", pageId],
    queryFn: () => pageApi.getLinkedTasks(pageId),
  });

  const tasks: PageTaskLink[] = data?.data || [];

  const detachMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.detachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      toast.success("Task detached from page");
    },
    onError: () => toast.error("Failed to detach task"),
  });

  if (isLoading) {
    return (
      <section className="rounded-card border border-border/60 bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
          Linked Tasks
        </h3>
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked Tasks
        </h3>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsAttachModalOpen(true)}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No linked tasks.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="group relative flex flex-col gap-1 rounded-card border border-border/40 p-2 hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/tasks?taskId=${task.id}`}
                  className="flex items-start gap-1.5 min-w-0 flex-1"
                >
                  <CheckSquare className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[12px] font-medium leading-tight truncate hover:text-primary transition-colors">
                    {task.title}
                  </span>
                </Link>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      detachMutation.mutate(task.id);
                    }}
                    className="size-5 shrink-0 rounded flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={detachMutation.isPending}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-5">
                <span className="text-[9px] font-mono text-indigo-500/70 bg-indigo-500/10 px-1 py-0.5 rounded-sm">
                  {task.taskCode || `T-${task.id.slice(-4).toUpperCase()}`}
                </span>
                {task.status && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm"
                    style={{ backgroundColor: `${task.status.color}15`, color: task.status.color }}
                  >
                    {task.status.name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isAttachModalOpen && (
        <AttachTaskModal
          pageId={pageId}
          isOpen={isAttachModalOpen}
          onClose={() => setIsAttachModalOpen(false)}
        />
      )}
    </section>
  );
}

function AttachTaskModal({
  pageId,
  isOpen,
  onClose,
}: {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useTasksQuery(
    { search, limit: 10 },
    { enabled: isOpen }
  );

  const attachMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.attachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      toast.success("Task linked successfully");
      onClose();
    },
    onError: () => toast.error("Failed to link task"),
  });

  const availableTasks = (data?.data?.items || []).filter(
    (t: any) =>
      !queryClient.getQueryData<{ data: PageTaskLink[] }>(["page-tasks", pageId])?.data.find(
        (lt) => lt.id === (t.id || t._id)
      )
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="text-base font-semibold">
            Link Task to Page
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-button border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No tasks found.
              </div>
            ) : (
              availableTasks.map((task: any) => {
                const taskId = task.id || task._id;
                const taskCode = task.taskCode || `T-${taskId.slice(-4).toUpperCase()}`;
                
                return (
                  <div
                    key={taskId}
                    className="flex items-center justify-between p-2 rounded-button hover:bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-indigo-500 shrink-0">
                        {taskCode}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                      onClick={() => attachMutation.mutate(taskId)}
                      disabled={attachMutation.isPending}
                    >
                      Link
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
