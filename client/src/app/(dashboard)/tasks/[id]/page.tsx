"use client";

import Link from "@/lib/next-link";
import { useParams } from "@/lib/next-navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/features/admin/components/json-viewer";
import { TaskComments } from "@/features/comments/components/TaskComments";
import { useTaskQuery } from "@/features/tasks/hooks/use-tasks-query";

export default function TaskDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const taskQuery = useTaskQuery(id, Boolean(id));

  if (taskQuery.isLoading) return <p>Loading task...</p>;
  if (taskQuery.error || !taskQuery.data?.data)
    return <p className="text-destructive">Task not found.</p>;

  const task = taskQuery.data.data;

  return (
    <div className="space-y-6 p-3 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{task.title}</h1>
          <p className="text-muted-foreground mt-1">
            Full task details with activity and debug context.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/tasks/${task.id}/edit`}>Edit Task</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Task Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="outline">{task.status}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Priority:</span>{" "}
            <Badge variant="outline">{task.priority}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Description:</span>{" "}
            {task.description || "No description"}
          </p>
          <p>
            <span className="text-muted-foreground">Due Date:</span>{" "}
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskComments taskId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Activity log integration placeholder.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <JsonViewer data={task} />
        </CardContent>
      </Card>
    </div>
  );
}

