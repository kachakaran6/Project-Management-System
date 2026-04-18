"use client";

import Link from "@/lib/next-link";
import {
  FolderPlus,
  SquarePen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ArrowRight,
  CalendarDays,
  Flag,
} from "lucide-react";
import {cn} from "@/lib/utils";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {PageHeader} from "@/components/layout/page-header";
import {useProjectsQuery} from "@/features/projects/hooks/use-projects-query";
import {useTasksQuery} from "@/features/tasks/hooks/use-tasks-query";
import {CreateProjectModal} from "@/features/projects/components/create-project-modal";
import {CreateTaskModal} from "@/features/tasks/components/create-task-modal";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  planned: "bg-violet-100 text-violet-800",
  PLANNED: "bg-violet-100 text-violet-800",
  completed: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  on_hold: "bg-amber-100 text-amber-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  archived: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  BACKLOG: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  DONE: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

// ─── StatCard ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}

function StatCard({label, value, icon: Icon, sub}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {user} = useAuth();
  const projectsQuery = useProjectsQuery({page: 1, limit: 200});
  const tasksQuery = useTasksQuery({page: 1, limit: 300});

  const projects = projectsQuery.data?.data.items ?? [];
  const tasks = tasksQuery.data?.data.items ?? [];

  const activeTasks = tasks.filter(
    (t) => t.status !== "DONE" && t.status !== "ARCHIVED",
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;

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

  // Map projectId → project name for tasks table
  const projectMap = Object.fromEntries(
    projects.map((p: any) => [p.id || p._id, p.name]),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? "there"} 👋`}
        description="Here's a quick overview of your workspace."
      />

      {/* Stats */}
      {projectsQuery.isLoading || tasksQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Projects"
            value={projects.length}
            icon={BriefcaseBusiness}
          />
          <StatCard label="Active Tasks" value={activeTasks} icon={Clock3} />
          <StatCard
            label="Completed Tasks"
            value={completedTasks}
            icon={CheckCircle2}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Left: Projects + Tasks */}
        <div className="space-y-6 lg:col-span-1 xl:col-span-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <Button asChild variant="ghost" size="sm">
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
                    <Skeleton
                      key={`project-skeleton-${i}`}
                      className="h-12 w-full"
                    />
                  ))}
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No projects yet. Start by creating your first project.
                  </p>
                  <CreateProjectModal />
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id || (project as any)._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            PROJECT_STATUS_COLORS[project.status],
                          )}>
                          {project.status}
                        </Badge>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs">
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/tasks">
                  View all
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tasksQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={`task-skeleton-${i}`}
                      className="h-12 w-full"
                    />
                  ))}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No tasks yet. Create a project first, then add tasks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id || (task as any)._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Flag
                          className={`size-4 flex-shrink-0 ${PRIORITY_COLORS[task.priority] ?? ""}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(task.projectId as any)?.name ?? projectMap[task.projectId as string] ?? "Unknown project"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {new Date(task.dueDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </div>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            TASK_STATUS_COLORS[task.status],
                          )}>
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CreateProjectModal
                trigger={
                  <Button className="w-full justify-start" variant="secondary">
                    <FolderPlus className="mr-2 size-4" />
                    Create Project
                  </Button>
                }
              />
              <CreateTaskModal
                trigger={
                  <Button className="w-full justify-start" variant="secondary">
                    <SquarePen className="mr-2 size-4" />
                    Create Task
                  </Button>
                }
              />
              <Button
                asChild
                className="w-full justify-start"
                variant="secondary">
                <Link href="/projects">
                  <BriefcaseBusiness className="mr-2 size-4" />
                  View All Projects
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="secondary">
                <Link href="/tasks">
                  <Clock3 className="mr-2 size-4" />
                  View All Tasks
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          {!tasksQuery.isLoading && tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    {label: "To Do", statusKey: "TODO", color: "bg-slate-400"},
                    {
                      label: "In Progress",
                      statusKey: "IN_PROGRESS",
                      color: "bg-blue-500",
                    },
                    {
                      label: "In Review",
                      statusKey: "IN_REVIEW",
                      color: "bg-amber-500",
                    },
                    {label: "Done", statusKey: "DONE", color: "bg-emerald-500"},
                  ] as const
                ).map(({label, statusKey, color}) => {
                  const count = tasks.filter(
                    (t) => t.status === statusKey,
                  ).length;
                  const pct =
                    tasks.length > 0
                      ? Math.round((count / tasks.length) * 100)
                      : 0;
                  return (
                    <div key={statusKey} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-1.5 rounded-full ${color} transition-all`}
                          style={{width: `${pct}%`}}
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
    </div>
  );
}

