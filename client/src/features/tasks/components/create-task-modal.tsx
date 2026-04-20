"use client";

import {useState} from "react";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {SquarePen} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {TaskForm} from "@/features/tasks/components/task-form";
import {TaskFormValues} from "@/features/tasks/schemas/task.schema";
import {useCreateTaskMutation} from "@/features/tasks/hooks/use-tasks-query";
import {useProjectsQuery} from "@/features/projects/hooks/use-projects-query";
import {useAuthStore} from "@/store/auth-store";
import {CreateTaskInput} from "@/types/task.types";

interface CreateTaskModalProps {
  trigger?: React.ReactNode;
  defaultProjectId?: string;
  onCreated?: () => void;
}

export function CreateTaskModal({
  trigger,
  defaultProjectId,
  onCreated,
}: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTaskMutation();
  const projectsQuery = useProjectsQuery({page: 1, limit: 200});
  const {activeOrgId} = useAuthStore();

  const projects = (projectsQuery.data?.data.items ?? []).map((p: any) => ({
    id: p.id || p._id,
    name: p.name,
  }));

  const handleSubmit = async (values: TaskFormValues, createMore?:boolean) => {
    try {
      const assigneeIds = values.assigneeIds || [];
      const canSendAssignees = Boolean(activeOrgId);

      const payload: CreateTaskInput = {
        title: values.title,
        projectId: values.projectId,
        status: values.status,
        priority: values.priority,
        description: values.description || undefined,
        dueDate: values.dueDate || undefined,
        tags: values.tags || [],
        visibility: values.visibility || "PUBLIC",
        visibleToUsers: values.visibility === "PRIVATE" ? (values.visibleToUsers || []) : undefined,
        assignees: canSendAssignees ? assigneeIds : undefined,
        assigneeId: canSendAssignees ? assigneeIds[0] || undefined : undefined,
      };

      await createTask.mutateAsync(payload);
      toast.success(`Task "${values.title}" created!`);
      if(!createMore) {         
        setOpen(false);
      }
      onCreated?.();
    } catch (error) {
      const apiError = error as AxiosError<{message?: string; errors?: string[]}>;
      const message =
        apiError.response?.data?.errors?.[0] ||
        apiError.response?.data?.message ||
        "Failed to create task. Please try again.";
      toast.error(message);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <SquarePen className="mr-2 size-4" />
            Create Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        hideClose
        className="max-w-[640px] w-[95vw] md:w-full h-fit max-h-[90vh] p-0 overflow-hidden border-border/10 bg-background backdrop-blur-xl shadow-2xl rounded-2xl gap-0 flex flex-col">
        <TaskForm
          projects={projects}
          initialValues={{
            projectId: defaultProjectId ?? "",
            status: "TODO",
            priority: "MEDIUM",
          }}
          onCancel={() => setOpen(false)}
          onSubmit={(values, createMore)=>handleSubmit(values, createMore)}
          isSubmitting={createTask.isPending}
          isSuccess={createTask.isSuccess}
          submitLabel="Create Task"
        />
      </DialogContent>
    </Dialog>
  );
}
