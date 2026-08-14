import { useMemo } from "react";
import Link from "@/lib/next-link";
import {
  FolderPlus,
  SquarePen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ArrowRight,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { GithubOnboardingBanner } from "@/features/tasks/components/github-onboarding-banner";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";

import { resolveStatus, filterVisibleTasks } from "@/features/tasks/utils/resolve-status";
import { AppPage } from "@/components/patterns/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { StatusBadge } from "@/components/patterns/status-badge";
import { PriorityIndicator } from "@/components/patterns/priority-indicator";
import { EntityEmptyState } from "@/components/patterns/entity-list-state";

export default function DashboardPage() {
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const tasksQuery = useTasksQuery({ page: 1, limit: 300 });
  const { data: dynamicStatuses = [] } = useStatusesQuery();

  const allTasks = tasksQuery.data?.data.items ?? [];
  const tasks = useMemo(() => filterVisibleTasks(allTasks), [allTasks]);
  const projects = projectsQuery.data?.data.items ?? [];

  const getStatusName = (status: any) => {
    if (!status) return "Unknown";
    if (typeof status === "object") return status.name || "Unknown";
    return String(status).replace("_", " ");
  };

  const activeTasks = tasks.filter((t) => {
    const resolved = resolveStatus(t, dynamicStatuses);
    if (!resolved) return true;
    const name = (resolved.name || "").toUpperCase().replace(/[\s_-]/g, "");
    return name !== "DONE" && name !== "ARCHIVED" && name !== "COMPLETED";
  }).length;

  const completedTasks = tasks.filter((t) => {
    const resolved = resolveStatus(t, dynamicStatuses);
    if (!resolved) return false;
    const name = (resolved.name || "").toUpperCase().replace(/[\s_-]/g, "");
    return name === "DONE" || name === "COMPLETED";
  }).length;

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  const projectMap = Object.fromEntries(
    projects.map((p: any) => [p.id || p._id, p.name]),
  );

  return (
    <AppPage>
      <GithubOnboardingBanner />

      <PageHeader
        title="Dashboard"
        description="Quick overview of projects, tasks, and progress."
        actions={
          <div className="flex items-center gap-2">
            <CreateProjectModal
              trigger={
                <Button size="sm" variant="outline">
                  <FolderPlus className="mr-2 size-4" />
                  New Project
                </Button>
              }
            />
            <CreateTaskModal
              trigger={
                <Button size="sm">
                  <SquarePen className="mr-2 size-4" />
                  New Task
                </Button>
              }
            />
          </div>
        }
      />

      {/* Metrics Row */}
      {projectsQuery.isLoading || tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Total Projects"
            value={projects.length}
            icon={BriefcaseBusiness}
            description="Active workspace projects"
            variant="default"
          />
          <MetricCard
            title="Active Tasks"
            value={activeTasks}
            icon={Clock3}
            description="Tasks in progress or pending"
            variant="primary"
          />
          <MetricCard
            title="Completed Tasks"
            value={completedTasks}
            icon={CheckCircle2}
            description="Tasks finished successfully"
            variant="default"
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left (2 Cols): Projects + Tasks */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/projects">
                  View all
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {projectsQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : recentProjects.length === 0 ? (
                <EntityEmptyState
                  title="No projects yet"
                  description="Start by creating your first project to organize your team work."
                  actionLabel="Create Project"
                  onAction={() => {}}
                />
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id || (project as any)._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Link
                          href={`/tasks?projectId=${project.id}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0"
                        >
                          {project.name.charAt(0).toUpperCase()}
                        </Link>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end shrink-0">
                        <StatusBadge status={project.status} size="sm" />
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          <Link href={`/projects/${project.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Tasks</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/tasks">
                  View all
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tasksQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : recentTasks.length === 0 ? (
                <EntityEmptyState
                  title="No tasks yet"
                  description="Create your first task to track progress and assign work."
                />
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id || (task as any)._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PriorityIndicator priority={task.priority} showLabel={false} size="sm" />
                        <div className="min-w-0">
                          <Link href={`/tasks/${(task as any)._id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors block truncate">
                            {task.title}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {(task.projectId as any)?.name ??
                              projectMap[task.projectId as string] ??
                              "General Workspace"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                        <StatusBadge status={getStatusName(task.status)} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sidebar Widgets */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <CreateProjectModal
                trigger={
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <FolderPlus className="mr-2 size-4 text-primary" />
                    Create Project
                  </Button>
                }
              />
              <CreateTaskModal
                trigger={
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <SquarePen className="mr-2 size-4 text-primary" />
                    Create Task
                  </Button>
                }
              />
              <Button asChild className="w-full justify-start" variant="ghost" size="sm">
                <Link href="/projects">
                  <BriefcaseBusiness className="mr-2 size-4 text-muted-foreground" />
                  All Projects
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="ghost" size="sm">
                <Link href="/tasks">
                  <ListTodo className="mr-2 size-4 text-muted-foreground" />
                  All Tasks
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Progress Breakdown */}
          {!tasksQuery.isLoading && tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    { label: "To Do", statusKey: "TODO", color: "bg-slate-500" },
                    { label: "In Progress", statusKey: "IN_PROGRESS", color: "bg-blue-500" },
                    { label: "In Review", statusKey: "IN_REVIEW", color: "bg-amber-500" },
                    { label: "Done", statusKey: "DONE", color: "bg-emerald-500" },
                  ] as const
                ).map(({ label, statusKey, color }) => {
                  const count = tasks.filter((t) => {
                    const resolved = resolveStatus(t, dynamicStatuses);
                    if (!resolved) return false;
                    const name = (resolved.name || "").toUpperCase().replace(/[\s_-]/g, "");

                    if (statusKey === "TODO") return name === "TODO" || name === "NOTSTARTED" || name === "BACKLOG";
                    if (statusKey === "IN_PROGRESS") return name === "INPROGRESS";
                    if (statusKey === "IN_REVIEW") return name === "INREVIEW" || name === "REVIEW";
                    if (statusKey === "DONE") return name === "DONE" || name === "COMPLETED";
                    return false;
                  }).length;

                  const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;

                  return (
                    <div key={statusKey} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppPage>
  );
}
