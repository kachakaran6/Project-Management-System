"use client";

import React, { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskForm } from "@/features/tasks/components/task-form";
import { TaskFormValues } from "@/features/tasks/schemas/task.schema";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { Task, UpdateTaskInput } from "@/types/task.types";

interface EditTaskModalProps {
  task: Task;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditTaskModal({ task, trigger, open, onOpenChange }: EditTaskModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const updateTask = useUpdateTaskMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const taskId = task.id || (task as any)._id;

  const projects = (projectsQuery.data?.data.items ?? []).map((p) => ({
    id: p.id || p._id,
    name: p.name,
  }));

  const handleSubmit = async (values: TaskFormValues) => {
    try {
      const data: UpdateTaskInput = {
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        projectId: values.projectId,
        dueDate: values.dueDate || undefined,
        assigneeIds: values.assigneeIds || [],
      };
      
      if (!taskId) {
        toast.error("Invalid task ID.");
        return;
      }

      await updateTask.mutateAsync({ id: taskId, data });
      toast.success("Task updated successfully!");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to update task.");
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          projects={projects}
          initialValues={{
            title: task.title,
            description: task.description ?? "",
            status: task.status,
            priority: task.priority,
            projectId: typeof task.projectId === 'string' ? task.projectId : (task.projectId as any)?._id || (task.projectId as any)?.id || "",
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().split("T")[0]
              : "",
            assigneeIds: (task as any).assigneeIds || (task as any).assignees?.map((a: any) => a.userId?._id || a.userId) || [],
            // Pass the full users for chips to show names immediately
            assigneeUsers: (task as any).assigneeUsers,
          } as any}
          onSubmit={handleSubmit}
          isSubmitting={updateTask.isPending}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
