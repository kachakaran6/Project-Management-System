"use client";

import React from "react";
import { Task } from "@/types/task.types";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { TaskDescriptionEditor } from "../task-description-editor";

interface TaskDescriptionProps {
  task: Task;
}

export function TaskDescription({ task }: TaskDescriptionProps) {
  const updateTaskMutation = useUpdateTaskMutation();

  return (
    <div className="py-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest px-1">Description</h3>
      </div>
      <TaskDescriptionEditor
        value={task.description || ""}
        onChange={(newDescription) => {
          if (newDescription !== (task.description || "")) {
            updateTaskMutation.mutate({ id: task.id || (task as any)._id, data: { description: newDescription } });
          }
        }}
        placeholder="Write a description..."
        className="min-h-37.5"
        isSaving={updateTaskMutation.isPending}
      />
    </div>
  );
}
