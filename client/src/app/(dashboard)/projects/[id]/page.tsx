"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/features/admin/components/json-viewer";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);

  const projectQuery = useProjectQuery(id, Boolean(id));
  const tasksQuery = useTasksQuery({ projectId: id, page: 1, limit: 50 });

  if (projectQuery.isLoading) return <p>Loading project...</p>;
  if (projectQuery.error || !projectQuery.data?.data)
    return <p className="text-destructive">Project not found.</p>;

  const project = projectQuery.data.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">
            Project details, linked tasks, and tenant-scoped metadata.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/projects/${project.id}/edit`}>Edit Project</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="outline">{project.status}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Description:</span>{" "}
            {project.description || "No description"}
          </p>
          <p>
            <span className="text-muted-foreground">Created:</span>{" "}
            {new Date(project.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tasksQuery.data?.data.items ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks linked yet.</p>
          ) : (
            (tasksQuery.data?.data.items ?? []).map((task) => (
              <div key={task.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{task.title}</p>
                <p className="text-muted-foreground text-sm">{task.status}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <JsonViewer data={project} />
        </CardContent>
      </Card>
    </div>
  );
}
