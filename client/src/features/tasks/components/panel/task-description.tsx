
import React, { useMemo } from "react";
import { Task } from "@/types/task.types";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { TaskDescriptionEditor } from "../task-description-editor";
import { TaskCopyButton } from "./task-copy-button";
import { formatTaskDescriptionForClipboard } from "@/features/tasks/utils/task-panel-navigation";

interface TaskDescriptionProps {
  task: Task;
}

export function TaskDescription({ task }: TaskDescriptionProps) {
  const updateTaskMutation = useUpdateTaskMutation();
  const descriptionText = useMemo(
    () => formatTaskDescriptionForClipboard(task.description || ""),
    [task.description],
  );

  return (
    <div className="py-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest px-1">Description</h3>
        {descriptionText ? (
          <TaskCopyButton
            value={descriptionText}
            ariaLabel="Copy task description"
            successMessage="Task description copied"
          />
        ) : null}
      </div>
      <TaskDescriptionEditor
        value={task.description || ""}
        onChange={(newDescription) => {
          if (newDescription !== (task.description || "")) {
            updateTaskMutation.mutate({ id: task.id || (task as any)._id, data: { description: newDescription } });
          }
        }}
        placeholder="Write a description..."
        isSaving={updateTaskMutation.isPending}
      />
    </div>
  );
}
