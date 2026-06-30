
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

export function EditTaskModal({
  task,
  trigger,
  open,
  onOpenChange,
}: EditTaskModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const updateTask = useUpdateTaskMutation();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;

  const taskId = task.id || (task as any)._id;

  const projects = (projectsQuery.data?.data.items ?? []).map((p) => ({
    id: p.id || (p as any)._id,
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
        tags: values.tags || [],
        visibility: values.visibility || "PUBLIC",
        visibleToUsers: values.visibility === "PRIVATE" ? (values.visibleToUsers || []) : undefined,
      };

      let finalData: UpdateTaskInput | FormData = data;

      if (values.images && values.images.length > 0) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if ((data as any)[key] !== undefined) {
            if (Array.isArray((data as any)[key])) {
              (data as any)[key].forEach((item: any) => formData.append(key, item));
            } else {
              formData.append(key, (data as any)[key]);
            }
          }
        });
        values.images.forEach((file: File) => formData.append("images", file));
        finalData = formData;
      }

      if (!taskId) {
        toast.error("Invalid task ID.");
        return;
      }

      await updateTask.mutateAsync({ id: taskId, data: finalData });
      toast.success("Task updated successfully!");
      handleOpenChange(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to update task.";
      toast.error(errorMsg);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent hideClose className="max-w-[640px] p-0 overflow-hidden border-border/10 bg-background backdrop-blur-xl shadow-2xl rounded-modal gap-0">
        <TaskForm
          isEdit={true}
          projects={projects}
          title="Edit Task"
          subtitle="Update task details and metadata"
          initialValues={
            {
              title: task.title,
              description: task.description ?? "",
              status: task.status,
              priority: task.priority,
              visibility: task.visibility || "PUBLIC",
              visibleToUsers: task.visibilityUsers?.map((u: any) => u.id) || [],
              projectId:
                typeof task.projectId === "string"
                  ? task.projectId
                  : (task.projectId as any)?.id ||
                    (task.projectId as any)?._id ||
                    "",
              dueDate: task.dueDate
                ? new Date(task.dueDate).toISOString().split("T")[0]
                : "",
              tags: (task.tags || []).map((t: any) => typeof t === "string" ? t : t.id),
              assigneeIds:
                (task as any).assigneeIds ||
                (task as any).assignees?.map(
                  (a: any) => a.userId?.id || a.userId?._id || a.userId,
                ) ||
                [],
              // Pass the full users for chips to show names immediately
              assigneeUsers: (task as any).assigneeUsers,
            } as any
          }
          onCancel={() => handleOpenChange(false)}
          onSubmit={handleSubmit}
          isSubmitting={updateTask.isPending}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
