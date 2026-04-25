"use client";

import { useParams, useRouter } from "@/lib/next-navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { TaskForm } from "@/features/tasks/components/task-form";
import {
  useTaskQuery,
  useUpdateTaskMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { TaskFormValues } from "@/features/tasks/schemas/task.schema";

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const router = useRouter();
  const { activeOrg } = useAuth();

  const taskQuery = useTaskQuery(id, Boolean(id));
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const updateTask = useUpdateTaskMutation();

  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  if (!canMutate) {
    return (
      <Alert variant="warning">
        <AlertTitle>Limited access</AlertTitle>
        <AlertDescription>
          Only ADMIN, SUPER_ADMIN, and MANAGER can update tasks.
        </AlertDescription>
      </Alert>
    );
  }

  if (taskQuery.isLoading) return <p>Loading task...</p>;
  if (taskQuery.error || !taskQuery.data?.data)
    return <p className="text-destructive">Task not found.</p>;

  const task = taskQuery.data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Edit Task</h1>
        <p className="text-muted-foreground mt-1">
          Update status, priority, assignment, and due date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Form</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            isEdit={true}
            projects={(projectsQuery.data?.data.items ?? []).map((project) => ({
              id: project.id,
              name: project.name,
            }))}
            initialValues={{
              title: task.title,
              description: task.description || "",
              status: task.status,
              priority: task.priority,
              projectId: task.projectId,
              assigneeIds: task.assigneeUsers?.map((u) => u.id) || [],
              dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
            }}
            isSubmitting={updateTask.isPending}
            isSuccess={updateTask.isSuccess}
            onSubmit={async (values: TaskFormValues) => {
              try {
                await updateTask.mutateAsync({
                  id,
                  data: {
                    title: values.title,
                    description: values.description || undefined,
                    projectId: values.projectId,
                    status: values.status,
                    priority: values.priority,
                    assigneeId: values.assigneeIds?.[0] || undefined,
                    dueDate: values.dueDate || undefined,
                  },
                });
                toast.success("Task updated");
                router.push(`/tasks/${id}`);
              } catch {
                toast.error("Failed to update task");
              }
            }}
            submitLabel="Update Task"
          />
        </CardContent>
      </Card>
    </div>
  );
}

