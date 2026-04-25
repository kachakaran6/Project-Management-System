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
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { Task, TaskPriority } from "@/types/task.types";
import { resolveStatus, filterVisibleTasks, normalizeId } from "@/features/tasks/utils/resolve-status";

type WorkTab = "summary" | "assigned" | "created" | "activity" | "visualize";

const TAB_ITEMS: Array<{ id: WorkTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "assigned", label: "Assigned" },
  { id: "created", label: "Created" },
  { id: "activity", label: "Activity" },
  { id: "visualize", label: "Visualize" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#64748b",
};

// Fallbacks for legacy/system statuses if dynamic ones aren't loaded or matching
const FALLBACK_STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Not Started",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Completed",
  ARCHIVED: "Archived",
  REJECTED: "Cancelled",
};

const FALLBACK_STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#94a3b8",
  TODO: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  IN_REVIEW: "#fb923c",
  DONE: "#22c55e",
  ARCHIVED: "#64748b",
  REJECTED: "#ef4444",
};

const FALLBACK_WORKLOAD_STATUS_ITEMS = [
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

function getTaskStatusLabel(status: any) {
  if (!status) return "Unknown";
  if (typeof status === 'object') return status.name || "Unknown";
  return FALLBACK_STATUS_LABELS[status as string] ?? String(status).replace(/_/g, " ");
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

function CustomChartTooltip({ active, payload, label, total }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const name = data.name || label;
    const percentage =
      total && total > 0 ? Math.round((value / total) * 100) : null;

    return (
      <div className="animate-in fade-in rounded-[10px] border border-white/10 bg-[#1E1E2F] p-2.5 px-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md duration-150 ring-1 ring-white/5">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white opacity-60">
            {name}
          </p>
          <div className="flex items-center gap-2">
            <div
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: payload[0].color || data.color }}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-white">{value}</span>
              <span className="text-[11px] font-medium text-gray-400">
                items
              </span>
              {percentage !== null && (
                <span className="ml-1.5 text-[11px] font-bold text-primary/90">
                  {percentage}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
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
          <span>{typeof task.priority === 'object' ? (task.priority as any).name || (task.priority as any).label : String(task.priority)}</span>
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

import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Globe, Users, Check, User2, X } from "lucide-react";
import { TaskUniverse } from "@/features/tasks/components/universe/TaskUniverse";

export default function YourWorkPage() {
  const { user, isLoading, activeOrgId } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkTab>("summary");
  const [projectScope, setProjectScope] = useState<"my" | "all">("my");
  const [viewingUserId, setViewingUserId] = useState<string>("me");
  const [showProfile, setShowProfile] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("work-show-profile");
      return saved !== "false";
    }
    return true;
  });

  const toggleProfile = (val: boolean) => {
    setShowProfile(val);
    localStorage.setItem("work-show-profile", String(val));
  };

  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const members = membersQuery.data?.data.members ?? [];
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user?.role || "");

  const effectiveUserId = viewingUserId === "me" ? user?.id : viewingUserId;
  const userId = user?.id;

  const { data: dynamicStatuses = [] } = useStatusesQuery();

  const tasksQuery = useTasksQuery(
    { 
      page: 1, 
      limit: 500,
      userId: viewingUserId === "me" ? undefined : viewingUserId 
    },
    { enabled: Boolean(user?.id), staleTime: 10_000 },
  );

  const allTasks = tasksQuery.data?.data.items ?? [];
  const tasks = useMemo(() => filterVisibleTasks(allTasks), [allTasks]);

  const derived = useMemo(() => {
    const created: Task[] = [];
    const assigned: Task[] = [];
    const relevant = new Map<string, Task>();

    for (const task of tasks) {
      let createdByUser = false;
      let assignedToUser = false;

      if (viewingUserId === "all") {
        // In "All" view, everything fetched is relevant
        createdByUser = true;
        assignedToUser = true;
      } else {
        const targetId = viewingUserId === "me" ? user?.id : viewingUserId;
        createdByUser = Boolean(
          targetId && getTaskCreatorId(task) === targetId,
        );
        assignedToUser = Boolean(targetId && isAssignedToUser(task, targetId));
      }

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

    // Normalize counts using dynamic statuses
    const rawStatusCounts = new Map<string, number>();
    const priorityCounts: Record<TaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    for (const task of relevantTasks) {
      const resolved = resolveStatus(task, dynamicStatuses);
      const statusId = resolved ? normalizeId(resolved._id) || normalizeId(resolved.id) : normalizeId(task.status);
      if (statusId) {
        rawStatusCounts.set(statusId, (rawStatusCounts.get(statusId) ?? 0) + 1);
      }
      priorityCounts[task.priority] += 1;
    }

    const statusChartData = Array.from(rawStatusCounts.entries())
      .map(([statusId, value]) => {
        const s = dynamicStatuses.find(ds => (ds.id || ds._id) === statusId);
        return {
          status: statusId,
          name: s?.name || FALLBACK_STATUS_LABELS[statusId] || statusId,
          value,
          color: s?.color || FALLBACK_STATUS_COLORS[statusId] || "#94a3b8",
          order: s?.order ?? 999
        };
      })
      .sort((a, b) => a.order - b.order);

    const priorityChartData = ["URGENT", "HIGH", "MEDIUM", "LOW"].map(
      (priority) => ({
        name: priority.charAt(0) + priority.slice(1).toLowerCase(),
        value: priorityCounts[priority as TaskPriority],
        color: PRIORITY_COLORS[priority as TaskPriority],
      }),
    );

    // Calculate project summaries based on selected scope
    const projectMap = new Map<string, any>();
    const scopeTasks = projectScope === "my" ? relevantTasks : tasks;

    for (const task of scopeTasks) {
      const id = getTaskProjectId(task);
      if (!id) continue;

      const existing = projectMap.get(id);
      const summary = existing ?? {
        id,
        name: getTaskProjectName(task) ?? "Unknown project",
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
      
      const resolved = resolveStatus(task, dynamicStatuses);
      const statusName = (resolved?.name || (typeof task.status === 'string' ? task.status : (task.status as any)?.name) || "").toUpperCase().replace(/[\s_-]/g, "");
      
      if (statusName === "DONE" || statusName === "COMPLETED") summary.completed += 1;
      else if (statusName === "INPROGRESS") summary.inProgress += 1;
      else if (statusName === "BACKLOG") summary.backlog += 1;
      else if (statusName === "TODO" || statusName === "NOTSTARTED") summary.todo += 1;
      else if (statusName === "INREVIEW" || statusName === "REVIEW") summary.review += 1;
      else if (statusName === "ARCHIVED") summary.archived += 1;
      else if (statusName === "REJECTED" || statusName === "CANCELLED") summary.rejected += 1;

      projectMap.set(id, summary);
    }

    let projectSummaries = [...projectMap.values()].map((project) => ({
      ...project,
      completion: project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0,
    }));

    const nonDemoProjects = projectSummaries.filter(p => !p.name.toLowerCase().includes("demo"));
    if (nonDemoProjects.length > 0) projectSummaries = nonDemoProjects;

    projectSummaries.sort((a, b) => (b.completion - a.completion) || (b.total - a.total));

    const workloadItems = dynamicStatuses.length > 0 
      ? [...dynamicStatuses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(s => ({
            id: normalizeId(s.id || s._id)!,
            name: s.name,
            color: s.color || "#94a3b8"
          }))
      : FALLBACK_WORKLOAD_STATUS_ITEMS.map(key => ({
          id: key,
          name: FALLBACK_STATUS_LABELS[key] || key,
          color: FALLBACK_STATUS_COLORS[key] || "#94a3b8"
        }));

    return {
      created,
      assigned,
      relevantTasks,
      rawStatusCounts,
      priorityCounts,
      statusChartData,
      priorityChartData,
      projectSummaries,
      workloadItems,
    };
  }, [tasks, user?.id, viewingUserId, projectScope, dynamicStatuses]);

  const recentActivity = [...derived.relevantTasks].slice(0, 8);
  const assignedTasks = [...derived.assigned].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const createdTasks = [...derived.created].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const loading = isLoading || tasksQuery.isLoading;

  const selectedUser = members.find((m) => m.id === viewingUserId);

  return (
    <div className="flex flex-col xl:flex-row w-full max-w-[100vw] gap-4 px-3 py-2 md:px-6 xl:h-[calc(100vh-64px)] xl:overflow-hidden box-border overflow-x-hidden">
      <section className="flex-1 xl:overflow-y-auto xl:pr-2">
        <div className="space-y-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex w-full items-center overflow-x-auto pb-1 scrollbar-hide md:w-auto md:pb-0">
              <div className="inline-flex min-w-max gap-1 rounded-full border border-border bg-card p-1 shadow-sm md:gap-2">
                {TAB_ITEMS.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={activeTab === tab.id ? "primary" : "ghost"}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-medium transition-all md:h-9 md:px-4 md:text-sm",
                      activeTab !== tab.id &&
                        "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="flex w-full flex-col items-start gap-1.5 md:w-auto md:flex-row md:items-center md:gap-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 md:text-[11px] md:tracking-widest">
                  <span className="shrink-0">VIEWING:</span>
                  <span className="text-foreground font-semibold">
                    {viewingUserId === "me" 
                      ? "Me" 
                      : viewingUserId === "all" 
                        ? "All Members" 
                        : selectedUser 
                          ? `${selectedUser.firstName} ${selectedUser.lastName}` 
                          : "User"
                    }
                  </span>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "inline-flex items-center gap-2 h-9 px-3 rounded-xl md:rounded-full w-full md:w-auto",
                        "border border-border bg-muted/30 hover:bg-muted/50",
                        "transition-colors duration-120 cursor-pointer",
                        "text-[13px] font-medium text-foreground"
                      )}
                    >
                      {viewingUserId === "all" ? (
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Avatar className="h-5 w-5 shrink-0">
                          {viewingUserId === "me" && user?.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} />
                          ) : viewingUserId !== "me" && viewingUserId !== "all" && selectedUser?.avatarUrl ? (
                            <AvatarImage src={selectedUser.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-[10px] font-bold">
                              {viewingUserId === "me" ? "ME" : selectedUser?.firstName?.[0] || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <span>
                        {viewingUserId === "me" ? "Me (Default)" : viewingUserId === "all" ? "All Members" : `${selectedUser?.firstName}`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-auto md:ml-1" />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    className={cn(
                      "w-56 p-1.5 rounded-xl border border-border/60",
                      "bg-card/95 backdrop-blur-lg",
                      "shadow-lg animate-in fade-in zoom-in-95",
                      "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
                    )}
                    align="start"
                    side="bottom"
                    sideOffset={8}
                  >
                    <div className="space-y-0.5">
                      {/* Me Section */}
                      <button
                        onClick={() => setViewingUserId("me")}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors duration-100",
                          "text-[13px]",
                          viewingUserId === "me"
                            ? "bg-muted text-foreground"
                            : "text-foreground/80 hover:bg-muted/60"
                        )}
                      >
                        <Avatar className="h-5 w-5 shrink-0">
                          {user?.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-[10px] font-bold">
                              ME
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="flex-1 text-left font-medium">Me (Default)</span>
                        {viewingUserId === "me" && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>

                      {/* Divider */}
                      <div className="h-px bg-border/40 my-1" />

                      {/* All Members Section */}
                      <button
                        onClick={() => setViewingUserId("all")}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors duration-100",
                          "text-[13px]",
                          viewingUserId === "all"
                            ? "bg-muted text-foreground"
                            : "text-foreground/80 hover:bg-muted/60"
                        )}
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <Globe className="h-3 w-3 text-primary" />
                        </div>
                        <span className="flex-1 text-left font-medium">All Members</span>
                        {viewingUserId === "all" && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>

                      {/* Divider */}
                      {members.filter((m) => m.id !== user?.id).length > 0 && (
                        <div className="h-px bg-border/40 my-1" />
                      )}

                      {/* Team Members List */}
                      <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                        {members
                          .filter((m) => m.id !== user?.id)
                          .map((member) => (
                            <button
                              key={member.id}
                              onClick={() => setViewingUserId(member.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors duration-100",
                                "text-[13px]",
                                viewingUserId === member.id
                                  ? "bg-muted text-foreground"
                                  : "text-foreground/80 hover:bg-muted/60"
                              )}
                            >
                              <Avatar className="h-5 w-5 shrink-0">
                                {member.avatarUrl ? (
                                  <AvatarImage src={member.avatarUrl} />
                                ) : (
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {member.firstName[0]}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="flex-1 text-left font-medium">
                                {member.firstName} {member.lastName}
                              </span>
                              {viewingUserId === member.id && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
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
              {activeTab === "visualize" ? (
                <div className="w-full">
                  <TaskUniverse tasks={derived.relevantTasks} />
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <MetricCard
                    label="Work items created"
                    value={derived.created.length}
                    icon={BriefcaseBusiness}
                    description={
                      viewingUserId === "me"
                        ? "Tasks you opened or authored."
                        : `Tasks created by ${selectedUser?.firstName || "this user"}.`
                    }
                  />
                  <MetricCard
                    label="Work items assigned"
                    value={derived.assigned.length}
                    icon={UserRoundCheck}
                    description={
                      viewingUserId === "me"
                        ? "Tasks currently assigned to you."
                        : `Tasks assigned to ${selectedUser?.firstName || "this user"}.`
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
                  {derived.workloadItems.map((item) => (
                    <Card
                      key={item.id}
                      className="border-border/60 bg-card/50 transition-colors hover:bg-card"
                    >
                      <CardContent className="flex h-full flex-col justify-center p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-1.5 shrink-0 rounded-full md:size-2"
                            style={{ backgroundColor: item.color }}
                          />
                          <p className="truncate text-[10px] font-medium text-muted-foreground md:text-[11px]">
                            {item.name}
                          </p>
                        </div>
                        <p className="mt-1 text-lg font-bold text-foreground md:mt-2 md:text-2xl">
                          {derived.rawStatusCounts.get(item.id) ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card className="overflow-hidden">
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
                              content={
                                <CustomChartTooltip
                                  total={derived.relevantTasks.length}
                                />
                              }
                              offset={12}
                              allowEscapeViewBox={{ x: true, y: true }}
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

                <Card className="overflow-hidden">
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
                              content={
                                <CustomChartTooltip
                                  total={derived.relevantTasks.length}
                                />
                              }
                              offset={12}
                              allowEscapeViewBox={{ x: true, y: true }}
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
                              {entry.name}
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
                          getTaskCreatorId(task) === effectiveUserId
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
                      Tasks currently assigned to {viewingUserId === "me" ? "you" : "this user"}.
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
                      Tasks created by {viewingUserId === "me" ? "you" : "this user"}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {createdTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {viewingUserId === "me" ? "You have" : "This user has"} not created any tasks yet.
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
            </>
          )}
        </div>
      </section>

       <aside className="w-full xl:w-80 shrink-0 space-y-3 pb-20 xl:pb-0 xl:space-y-6 px-0.5">
        {showProfile ? (
          <Card className="group/profile relative border-border/60 bg-card/40 shadow-sm backdrop-blur-sm transition-all hover:bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 md:p-5 md:pb-3">
              <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground md:text-sm md:text-foreground/80">
                Profile
              </CardTitle>
              <button
                onClick={() => toggleProfile(false)}
                className="rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover/profile:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:px-5 md:pb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <Avatar className="size-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background md:size-16">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="bg-primary/5 text-sm font-bold text-primary md:text-xl">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold tracking-tight text-foreground md:text-lg">
                    {user?.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 md:mt-1 md:gap-2">
                    <Badge
                      variant="outline"
                      className="h-4 border-primary/20 bg-primary/5 px-1.5 text-[9px] font-bold uppercase tracking-wider text-primary md:h-auto md:text-[10px]"
                    >
                      {user?.role}
                    </Badge>
                    <p className="truncate text-[11px] text-muted-foreground md:text-xs">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <button
            onClick={() => toggleProfile(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <User2 className="size-3.5" />
            Restore Profile Card
          </button>
        )}

        <Card className="w-full max-w-full border-border/60 bg-card/40 shadow-sm backdrop-blur-sm overflow-hidden box-border mb-4 md:mb-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-3.5 pb-2 md:p-5 md:pb-3">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground md:text-sm md:text-foreground/80">
              Projects
            </CardTitle>
            <div className="flex items-center overflow-hidden rounded-full border border-border/80 bg-muted/40 p-0.5">
              <button
                onClick={() => setProjectScope("my")}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all md:px-2.5 md:py-1 md:text-[10px] shrink-0",
                  projectScope === "my"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                My
              </button>
              <button
                onClick={() => setProjectScope("all")}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all md:px-2.5 md:py-1 md:text-[10px] shrink-0",
                  projectScope === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                Overall
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3.5 pb-4 md:px-5 md:pb-6">
            <div className="scrollbar-hide max-h-[400px] space-y-4 overflow-y-auto pr-1 xl:max-h-[500px]">
              {derived.projectSummaries.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs italic text-muted-foreground">
                    No projects found with current filter
                  </p>
                </div>
              ) : (
                derived.projectSummaries.map((project) => (
                  <div key={project.id} className="group flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-foreground/90">
                      <span className="min-w-0 flex-1 truncate transition-colors group-hover:text-primary">
                        {project.name}
                      </span>
                      <span className="text-[11px] font-bold text-primary tabular-nums">
                        {project.completion}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 overflow-hidden rounded-full bg-muted/40 p-0">
                      <div
                        className="h-full bg-primary transition-all duration-700 ease-out sm:duration-1000"
                        style={{ width: `${project.completion}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 opacity-70">
                      <span>{project.completed} DONE</span>
                      <span>{project.total} TOTAL</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
