"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle2, Clock, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Active",     cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
  COMPLETED: { label: "Completed",  cls: "bg-blue-100    text-blue-800    border-blue-300    dark:bg-blue-950    dark:text-blue-300"    },
  ARCHIVED:  { label: "Archived",   cls: "bg-slate-100   text-slate-600   border-slate-300   dark:bg-slate-800   dark:text-slate-400"   },
  PLANNED:   { label: "Planned",    cls: "bg-violet-100  text-violet-800  border-violet-300  dark:bg-violet-950  dark:text-violet-300"  },
  ON_HOLD:   { label: "On Hold",    cls: "bg-amber-100   text-amber-800   border-amber-300   dark:bg-amber-950   dark:text-amber-300"   },
};
function getStatus(s: string) {
  return STATUS_CFG[s?.toUpperCase()] ?? STATUS_CFG.PLANNED;
}

// ─── Skeleton loading ──────────────────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="mt-1 h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-80 w-[300px] flex-shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);

  const projectQuery = useProjectQuery(id, Boolean(id));
  const tasksQuery = useTasksQuery({ projectId: id, page: 1, limit: 300 });

  if (projectQuery.isLoading) return <BoardSkeleton />;

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
  const pid = (project.id || (project as any)._id) as string;
  const tasks = tasksQuery.data?.data.items ?? [];

  const total    = tasks.length;
  const done     = tasks.filter((t) => t.status === "DONE").length;
  const inProg   = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const status   = getStatus(project.status);

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="sm" className="mt-1 h-9 w-9 p-0">
            <Link href="/projects">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <Badge variant="outline" className={`text-xs ${status.cls}`}>
                {status.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {project.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Add Task CTA */}
        <CreateTaskModal
          defaultProjectId={pid}
          trigger={
            <Button size="sm" className="gap-2 shadow-sm">
              <Plus className="size-4" />
              Add Task
            </Button>
          }
        />
      </div>

      {/* ── Stats Strip ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
        {/* Progress */}
        <div className="flex items-center gap-3 border-r border-border pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Completion</p>
            <ProgressBar value={progress} />
          </div>
        </div>

        {/* Task total */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Layers className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total tasks</p>
            <p className="text-sm font-bold tabular-nums">{total}</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
            <Clock className="size-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">In progress</p>
            <p className="text-sm font-bold tabular-nums">{inProg}</p>
          </div>
        </div>

        {/* Done */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Completed</p>
            <p className="text-sm font-bold tabular-nums text-emerald-600">{done}</p>
          </div>
        </div>

        {/* Created */}
        <div className="ml-auto text-right">
          <p className="text-[11px] text-muted-foreground">Created</p>
          <p className="text-xs font-medium">
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {tasksQuery.isLoading ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 w-[300px] flex-shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (
        <TaskBoard tasks={tasks} projectId={pid} />
      )}
    </div>
  );
}
