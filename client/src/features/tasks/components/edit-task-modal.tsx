"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
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
}

export function EditTaskModal({ task, trigger }: EditTaskModalProps) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTaskMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });

  const projects = (projectsQuery.data?.data.items ?? []).map((p) => ({
    id: p.id,
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
      };
      await updateTask.mutateAsync({ id: task.id, data });
      toast.success("Task updated successfully!");
      setOpen(false);
    } catch {
      toast.error("Failed to update task.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
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
            projectId: task.projectId,
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().split("T")[0]
              : "",
            assigneeId: task.assigneeId ?? "",
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateTask.isPending}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
