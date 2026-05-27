
import React from "react";
import { Task } from "@/types/task.types";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { ChevronRight, Hash } from "lucide-react";
import { EditableText } from "@/components/editable/EditableText";
import { TaskCopyButton } from "./task-copy-button";
import { getTaskClipboardId } from "@/features/tasks/utils/task-panel-navigation";

interface TaskHeaderProps {
  task: Task;
}

export function TaskHeader({ task }: TaskHeaderProps) {
  const updateTaskMutation = useUpdateTaskMutation();
  const taskClipboardId = getTaskClipboardId(task as Task & { _id?: string });

  return (
    <div className="space-y-4 pb-2 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground/70 font-medium">
          <Hash className="size-3.5" />
          <span className="hover:text-foreground cursor-pointer transition-colors">Tasks</span>
          <ChevronRight className="size-3" />
          <span className="hover:text-foreground cursor-pointer transition-colors max-w-[150px] truncate">
            {(task.projectId && typeof task.projectId === "object") ? (task.projectId as any).name : "General"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/50 bg-muted/10 px-3 py-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
              Task ID
            </span>
            <span className="font-mono text-[11px] font-bold text-foreground/90">
              {taskClipboardId}
            </span>
          </div>
          <TaskCopyButton
            value={taskClipboardId}
            ariaLabel="Copy task ID"
            successMessage="Task ID copied"
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <EditableText
          value={task.title}
          onChange={(newTitle) => {
            if (newTitle !== task.title) {
              updateTaskMutation.mutate({ id: task.id || (task as any)._id, data: { title: newTitle } });
            }
          }}
          placeholder="Untitled Task"
          className="min-w-0 flex-1 text-3xl font-bold p-0"
          inputClassName="text-3xl font-bold py-1 px-2 -ml-2 h-auto"
          isSaving={updateTaskMutation.isPending}
        />
        <TaskCopyButton
          value={task.title?.trim() || ""}
          ariaLabel="Copy task title"
          successMessage="Task title copied"
          className="mt-1"
        />
      </div>
    </div>
  );
}
