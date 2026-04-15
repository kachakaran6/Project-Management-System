"use client";

import React, { useEffect, useState } from "react";
import { Task, TaskStatus } from "@/types/task.types";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { cn } from "@/lib/utils";
import { ChevronRight, Hash } from "lucide-react";
import { EditableText } from "@/components/editable/EditableText";

interface TaskHeaderProps {
  task: Task;
}

export function TaskHeader({ task }: TaskHeaderProps) {
  const [title, setTitle] = useState(task.title);
  const [isEditing, setIsEditing] = useState(false);
  const updateTaskMutation = useUpdateTaskMutation();

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const handleBlur = () => {
    setIsEditing(false);
    if (title !== task.title) {
      updateTaskMutation.mutate({ id: task.id || (task as any)._id, data: { title } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <div className="space-y-4 pt-6 pb-2">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground/70 font-medium">
        <Hash className="size-3.5" />
        <span className="hover:text-foreground cursor-pointer transition-colors">Tasks</span>
        <ChevronRight className="size-3" />
        <span className="hover:text-foreground cursor-pointer transition-colors max-w-[150px] truncate">
          {typeof task.projectId === "object" ? (task.projectId as any).name : "General"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <EditableText
          value={title}
          onChange={(newTitle) => {
            if (newTitle !== task.title) {
              updateTaskMutation.mutate({ id: task.id || (task as any)._id, data: { title: newTitle } });
            }
          }}
          placeholder="Untitled Task"
          className="text-3xl font-bold p-0"
          inputClassName="text-3xl font-bold py-1 px-2 -ml-2 h-auto"
          isSaving={updateTaskMutation.isPending}
        />
      </div>
    </div>
  );
}
