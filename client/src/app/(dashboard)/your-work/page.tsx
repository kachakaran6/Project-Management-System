"use client";

import type { ElementType } from "react";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  UserRoundCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { Task, TaskPriority } from "@/types/task.types";

type WorkTab = "summary" | "assigned" | "created" | "activity";

const TAB_ITEMS: Array<{ id: WorkTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "assigned", label: "Assigned" },
  { id: "created", label: "Created" },
  { id: "activity", label: "Activity" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Completed",
  ARCHIVED: "Archived",
  REJECTED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#94a3b8",
  TODO: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  IN_REVIEW: "#fb923c",
  DONE: "#22c55e",
  ARCHIVED: "#64748b",
  REJECTED: "#ef4444",
};

const STATUS_CARD_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  ARCHIVED: "Archived",
};

const WORKLOAD_STATUS_ORDER = {
  BACKLOG: 0,
  TODO: 1,
  IN_PROGRESS: 2,
  IN_REVIEW: 3,
  DONE: 4,
  ARCHIVED: 5,
  REJECTED: 6,
} as const;

const WORKLOAD_STATUS_ITEMS = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "ARCHIVED",
] as const;

function isAssignedToUser(task: Task, userId: string) {
  return (
    task.assigneeId === userId ||
    task.assigneeIds?.includes(userId) ||
    task.assigneeUsers?.some((assignee) => assignee.id === userId) ||
    task.assignees?.some((assignee) => {
      const value = assignee.userId;
      if (typeof value === "string") return value === userId;
      return value?.id === userId || value?._id === userId;
    })
  );
}

function formatTimeAgo(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getRecordId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: unknown; _id?: unknown };
    return typeof record.id === "string"
      ? record.id
      : typeof record._id === "string"
        ? record._id
        : null;
  }
  return null;
}

function getTaskId(task: Task) {
  return getRecordId(task.id) ?? getRecordId((task as Task & { _id?: string })._id);
}

function getTaskProjectId(task: Task) {
  return getRecordId(
    (task as Task & {
      projectId?: string | { id?: string; _id?: string; name?: string };
    }).projectId,
  );
}

function getTaskProjectName(task: Task) {
  const project = (task as { projectId?: unknown }).projectId;

  if (project && typeof project === "object") {
    const projectRecord = project as { name?: unknown };
    if (typeof projectRecord.name === "string") {
      return projectRecord.name;
    }
  }

  return null;
}

function getTaskCreatorId(task: Task) {
  return (
    getRecordId(
      (
        task as Task & {
          creator?: { id?: string; _id?: string };
          createdBy?: { id?: string; _id?: string };
          createdById?: string | { id?: string; _id?: string };
        }
      ).creator,
    ) ??
    getRecordId(
      (
        task as Task & {
          creator?: { id?: string; _id?: string };
          createdBy?: { id?: string; _id?: string };
          createdById?: string | { id?: string; _id?: string };
        }
      ).createdBy,
    ) ??
    getRecordId(
      (
        task as Task & {
          creator?: { id?: string; _id?: string };
          createdBy?: { id?: string; _id?: string };
          createdById?: string | { id?: string; _id?: string };
        }
      ).createdById,
    ) ??
    getRecordId(task.creatorId)
  );
}

function getTaskCreatorName(task: Task) {
  const creator =
    (
      task as Task & {
        creator?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdBy?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdById?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
      }
    ).creator ??
    (
      task as Task & {
        creator?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdBy?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdById?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
      }
    ).createdBy ??
    (
      task as Task & {
        creator?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdBy?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
        createdById?: {
          firstName?: string;
          lastName?: string;
          name?: string;
          email?: string;
        };
      }
    ).createdById;

  const fullName = creator
    ? `${creator.firstName ?? ""} ${creator.lastName ?? ""}`.trim()
    : "";

  return fullName || creator?.name || creator?.email || "You";
}

function getTaskAssigneeIds(task: Task) {
  const assigneeIds = new Set<string>();

  if (task.assigneeId) {
    const value = getRecordId(task.assigneeId);
    if (value) assigneeIds.add(value);
  }

  task.assigneeIds?.forEach((assigneeId) => {
    const value = getRecordId(assigneeId);
    if (value) assigneeIds.add(value);
  });

  task.assigneeUsers?.forEach((assignee) => {
    const value = getRecordId(assignee.id);
    if (value) assigneeIds.add(value);
  });

  task.assignees?.forEach((assignee) => {
    const value = getRecordId(assignee.userId);
    if (value) assigneeIds.add(value);
  });

  return assigneeIds;
}

function getTaskStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number | string;
  icon: ElementType;
  description?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/80 transition-all duration-150 hover:-translate-y-0.5 hover:bg-card">
      <CardContent className="flex h-full items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground/80">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, label }: { task: Task; label: string }) {
  const creatorName = getTaskCreatorName(task);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {task.title}
          </p>
          <Badge
            variant="secondary"
            className="text-[10px] uppercase tracking-wide"
          >
            {label}
          </Badge>
        </div>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{task.priority}</span>
          <span>•</span>
          <span>{getTaskStatusLabel(task.status)}</span>
          {task.dueDate ? (
            <>
              <span>•</span>
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <p>{formatTimeAgo(task.updatedAt)}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider">
          {creatorName}
        </p>
      </div>
    </div>
  );
}

export default function YourWorkPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkTab>("summary");

  const tasksQuery = useTasksQuery(
    { page: 1, limit: 500 },
    { enabled: Boolean(user?.id), staleTime: 60_000 },
  );

  const tasks = tasksQuery.data?.data.items ?? [];
  const userId = user?.id;

  const derived = useMemo(() => {
    const created: Task[] = [];
    const assigned: Task[] = [];
    const relevant = new Map<string, Task>();

    for (const task of tasks) {
      const createdByUser = Boolean(
        userId && getTaskCreatorId(task) === userId,
      );
      const assignedToUser = Boolean(userId && isAssignedToUser(task, userId));

      if (createdByUser) created.push(task);
      if (assignedToUser) assigned.push(task);
      if (createdByUser || assignedToUser) {
        const taskId = getTaskId(task);
        if (taskId) {
          relevant.set(taskId, task);
        }
      }
    }

    const relevantTasks = [...relevant.values()].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const rawStatusCounts = new Map<string, number>();

    const priorityCounts: Record<TaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    for (const task of relevantTasks) {
      rawStatusCounts.set(task.status, (rawStatusCounts.get(task.status) ?? 0) + 1);
      priorityCounts[task.priority] += 1;
    }

    const statusChartData = Array.from(rawStatusCounts.entries())
      .sort((left, right) => {
        const leftIndex = WORKLOAD_STATUS_ORDER[left[0] as keyof typeof WORKLOAD_STATUS_ORDER] ?? 999;
        const rightIndex = WORKLOAD_STATUS_ORDER[right[0] as keyof typeof WORKLOAD_STATUS_ORDER] ?? 999;
        return leftIndex - rightIndex;
      })
      .map(([status, value]) => ({
        status,
        name: getTaskStatusLabel(status),
        value,
        color: STATUS_COLORS[status] ?? "#94a3b8",
      }));

    const priorityChartData = ["URGENT", "HIGH", "MEDIUM", "LOW"].map(
      (priority) => ({
        name: priority.charAt(0) + priority.slice(1).toLowerCase(),
        value: priorityCounts[priority as TaskPriority],
        color: PRIORITY_COLORS[priority as TaskPriority],
      }),
    );

    const projectMap = new Map<
      string,
      {
        id: string;
        name: string;
        total: number;
        completed: number;
        inProgress: number;
        backlog: number;
        todo: number;
        review: number;
        archived: number;
        rejected: number;
      }
    >();

    for (const task of relevantTasks) {
      const id = getTaskProjectId(task);
      if (!id) {
        continue;
      }

      const existing = projectMap.get(id);
      const projectName = getTaskProjectName(task);

      const summary = existing ?? {
        id,
        name: projectName ?? "Unknown project",
        total: 0,
        completed: 0,
        inProgress: 0,
        backlog: 0,
        todo: 0,
        review: 0,
        archived: 0,
        rejected: 0,
      };

      summary.total += 1;
      if (projectName && summary.name === "Unknown project") {
        summary.name = projectName;
      }

      switch (task.status) {
        case "DONE":
          summary.completed += 1;
          break;
        case "IN_PROGRESS":
          summary.inProgress += 1;
          break;
        case "BACKLOG":
          summary.backlog += 1;
          break;
        case "TODO":
          summary.todo += 1;
          break;
        case "IN_REVIEW":
          summary.review += 1;
          break;
        case "ARCHIVED":
          summary.archived += 1;
          break;
        case "REJECTED":
          summary.rejected += 1;
          break;
        default:
          break;
      }

      projectMap.set(id, summary);
    }

    const projectSummaries = [...projectMap.values()]
      .map((project) => ({
        ...project,
        completion: project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0,
      }))
      .sort((left, right) => {
        const completionDelta = right.completion - left.completion;
        if (completionDelta !== 0) return completionDelta;
        return right.total - left.total;
      });

    return {
      created,
      assigned,
      relevantTasks,
      rawStatusCounts,
      priorityCounts,
      statusChartData,
      priorityChartData,
      projectSummaries,
    };
  }, [tasks, userId]);

  const recentActivity = [...derived.relevantTasks].slice(0, 8);
  const assignedTasks = [...derived.assigned].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const createdTasks = [...derived.created].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const loading = isLoading || tasksQuery.isLoading;

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 w-full gap-4 px-4 py-4 md:px-6">
      <section className="min-h-0 flex-1 overflow-y-auto pr-0 xl:pr-2">
        <div className="space-y-6 pb-4">
          {/* <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                Your Work
              </h1>
              <Badge variant="secondary" className="rounded-full px-3 text-[10px] uppercase tracking-[0.18em]">
                Personal workspace
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Overview of your tasks and activity.
            </p>
          </div> */}

          <div className="inline-flex flex-wrap gap-2 rounded-full border border-border bg-card p-1 shadow-sm">
            {TAB_ITEMS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? "primary" : "ghost"}
                className={cn(
                  "h-9 rounded-full px-4 text-sm",
                  activeTab !== tab.id &&
                    "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
              <Skeleton className="h-36 w-full rounded-xl" />
              <div className="grid gap-4 xl:grid-cols-2">
                <Skeleton className="h-96 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  label="Work items created"
                  value={derived.created.length}
                  icon={BriefcaseBusiness}
                  description="Tasks you opened or authored."
                />
                <MetricCard
                  label="Work items assigned"
                  value={derived.assigned.length}
                  icon={UserRoundCheck}
                  description="Tasks currently assigned to you."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {WORKLOAD_STATUS_ITEMS.map((status) => {
                  const value = derived.rawStatusCounts.get(status) ?? 0;
                  const label = STATUS_CARD_LABELS[status] ?? status.replace(/_/g, " ");
                  const dotColor = STATUS_COLORS[status] ?? "#64748b";
                  return (
                    <Card
                      key={status}
                      className="min-h-25.5 border-border/60 bg-card/80 transition-all duration-150 hover:-translate-y-0.5 hover:bg-card"
                    >
                      <CardContent className="flex h-full flex-col items-start justify-between gap-2 p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          <p className="text-[12px] font-medium text-muted-foreground">
                            {label}
                          </p>
                        </div>
                        <p className="text-2xl font-semibold tracking-tight text-foreground">
                          {value}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Work items by Priority
                    </CardTitle>
                    <CardDescription>
                      Distribution across your active workload.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {derived.relevantTasks.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No personal work items found.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={derived.priorityChartData}
                          margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fill: "var(--muted-foreground)",
                              fontSize: 12,
                            }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{
                              fill: "var(--muted-foreground)",
                              fontSize: 12,
                            }}
                          />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 12,
                              color: "hsl(var(--card-foreground))",
                            }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {derived.priorityChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Work items by State
                    </CardTitle>
                    <CardDescription>
                      Current status split for your tasks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                    <div className="h-60">
                      {derived.relevantTasks.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No personal work items found.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={derived.statusChartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={62}
                              outerRadius={92}
                              paddingAngle={3}
                            >
                              {derived.statusChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 12,
                                color: "hsl(var(--card-foreground))",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="space-y-3">
                      {derived.statusChartData.map((entry) => (
                        <div
                          key={entry.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.status}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {activeTab === "summary" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent activity</CardTitle>
                    <CardDescription>
                      Most recent tasks in your personal workspace scope.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No activity found yet.
                      </p>
                    ) : (
                      recentActivity.map((task) => {
                        const relation =
                          getTaskCreatorId(task) === userId
                            ? "Created"
                            : "Assigned";
                        return (
                          <TaskRow key={getTaskId(task) ?? task.title} task={task} label={relation} />
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {activeTab === "assigned" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assigned work</CardTitle>
                    <CardDescription>
                      Tasks currently assigned to you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignedTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nothing is assigned to you right now.
                      </p>
                    ) : (
                      assignedTasks.map((task) => (
                        <TaskRow key={getTaskId(task) ?? task.title} task={task} label="Assigned" />
                      ))
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {activeTab === "created" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Created work</CardTitle>
                    <CardDescription>
                      Tasks you created for the workspace.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {createdTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        You have not created any tasks yet.
                      </p>
                    ) : (
                      createdTasks.map((task) => (
                        <TaskRow key={getTaskId(task) ?? task.title} task={task} label="Created" />
                      ))
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {activeTab === "activity" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity stream</CardTitle>
                    <CardDescription>
                      Recent task updates across your personal scope.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No recent updates available.
                      </p>
                    ) : (
                      recentActivity.map((task) => (
                        <TaskRow key={getTaskId(task) ?? task.title} task={task} label="Updated" />
                      ))
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </section>

      <aside className="hidden lg:flex lg:w-80 lg:shrink-0">
        <div className="sticky top-4 flex h-[calc(100vh-96px)] w-full flex-col gap-3 overflow-hidden">
          <Card className="flex-none border-border/60 bg-card/85">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Profile</CardTitle>
              <CardDescription>Your current work context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-xl">
                  <AvatarImage
                    src={user?.avatarUrl}
                    alt={user ? `${user.firstName} ${user.lastName}` : "User"}
                  />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                    {initials(
                      user ? `${user.firstName} ${user.lastName}` : undefined,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user
                      ? `${user.firstName} ${user.lastName}`.trim()
                      : "Your account"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email ?? "Signed in user"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col border-border/60 bg-card/85">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Projects</CardTitle>
              <CardDescription>
                Your task scope grouped by project.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pt-0">
              {derived.projectSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No project activity found in your current task scope.
                </p>
              ) : (
                derived.projectSummaries.map((project) => (
                  <div
                    key={project.id}
                    className="space-y-2.5 rounded-xl border border-border/60 bg-muted/10 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {project.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {project.total} total tasks · {project.completed} done
                        </p>
                      </div>
                      <div className="rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {project.completion}%
                      </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${project.completion}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                        <p>In progress</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {project.inProgress}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                        <p>Open</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {project.total - project.completed}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
