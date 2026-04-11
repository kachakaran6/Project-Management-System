"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  completed: "bg-blue-100 text-blue-800 border-blue-300",
  archived: "bg-slate-100 text-slate-600 border-slate-300",
  planned: "bg-violet-100 text-violet-800 border-violet-300",
  on_hold: "bg-amber-100 text-amber-800 border-amber-300",
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  COMPLETED: "bg-blue-100 text-blue-800 border-blue-300",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-300",
  PLANNED: "bg-violet-100 text-violet-800 border-violet-300",
  ON_HOLD: "bg-amber-100 text-amber-800 border-amber-300",
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);

  const projectQuery = useProjectQuery(id, Boolean(id));
  const tasksQuery = useTasksQuery({ projectId: id, page: 1, limit: 200 });

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-64 w-[280px]" />
          <Skeleton className="h-64 w-[280px]" />
          <Skeleton className="h-64 w-[280px]" />
          <Skeleton className="h-64 w-[280px]" />
        </div>
      </div>
    );
  }

  if (projectQuery.error || !projectQuery.data?.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/projects">
            <ArrowLeft className="mr-2 size-4" />
            Back to Projects
          </Link>
        </Button>
        <p className="text-destructive">Project not found or could not be loaded.</p>
      </div>
    );
  }

  const project = projectQuery.data.data;
  const tasks = tasksQuery.data?.data.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/projects">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-semibold">{project.name}</h1>
            <p className="text-muted-foreground mt-1">
              {project.description || "No description provided."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateTaskModal
            defaultProjectId={project.id}
            trigger={
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add Task
              </Button>
            }
          />
          <Button asChild variant="secondary" size="sm">
            <Link href={`/projects/${project.id}/edit`}>Edit Project</Link>
          </Button>
        </div>
      </div>

      {/* Project Info Strip */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge
              variant="outline"
              className={STATUS_COLORS[project.status] ?? ""}
            >
              {project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-semibold">{tasks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Done:</span>
            <span className="font-semibold text-emerald-600">
              {tasks.filter((t) => t.status === "DONE").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold">Task Board</h2>
          {tasksQuery.isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">Loading tasks…</p>
          )}
        </div>
        {!tasksQuery.isLoading && tasks.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground text-center py-8">
                No tasks yet — add the first one!
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <CreateTaskModal
                defaultProjectId={project.id}
                trigger={
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Create First Task
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <TaskBoard
            tasks={tasks}
            addTaskSlot={
              <CreateTaskModal
                defaultProjectId={project.id}
                trigger={
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Plus className="size-4" />
                  </Button>
                }
              />
            }
          />
        )}
      </div>
    </div>
  );
}
