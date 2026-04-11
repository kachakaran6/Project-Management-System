"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { TaskForm } from "@/features/tasks/components/task-form";
import { useCreateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { TaskFormValues } from "@/features/tasks/schemas/task.schema";

export default function CreateTaskPage() {
  const router = useRouter();
  const { activeOrg } = useAuth();
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const createTask = useCreateTaskMutation();

  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  if (!canMutate) {
    return (
      <Alert variant="warning">
        <AlertTitle>Limited access</AlertTitle>
        <AlertDescription>
          Only ADMIN, SUPER_ADMIN, and MANAGER can create tasks.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Create Task</h1>
        <p className="text-muted-foreground mt-1">
          Add a task with status, priority, assignee, and due date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Form</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            projects={(projectsQuery.data?.data.items ?? []).map((project) => ({
              id: project.id,
              name: project.name,
            }))}
            isSubmitting={createTask.isPending}
            onSubmit={async (values: TaskFormValues) => {
              try {
                await createTask.mutateAsync({
                  title: values.title,
                  description: values.description || undefined,
                  projectId: values.projectId,
                  status: values.status,
                  priority: values.priority,
                  assigneeId: values.assigneeId || undefined,
                  dueDate: values.dueDate || undefined,
                });
                toast.success("Task created");
                router.push("/tasks");
              } catch {
                toast.error("Failed to create task");
              }
            }}
            submitLabel="Create Task"
          />
        </CardContent>
      </Card>
    </div>
  );
}
