
import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task.types";
import { resolveStatus, filterVisibleTasks } from "@/features/tasks/utils/resolve-status";
import {
  getDefaultTaskSortState,
  readTaskSortPreference,
} from "@/features/tasks/utils/task-sort";

interface ProjectTasksMobileViewProps {
  projectId: string;
}

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
function getStatusStyle(statusName: string) {
  const name = statusName.toLowerCase();
  if (name.includes("done") || name.includes("complete") || name.includes("finished")) {
    return {
      dot: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      header: "text-emerald-400",
      ring: "ring-emerald-500/20",
    };
  }
  if (name.includes("progress") || name.includes("active") || name.includes("review")) {
    return {
      dot: "bg-blue-500",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      header: "text-blue-400",
      ring: "ring-blue-500/20",
    };
  }
  if (name.includes("block") || name.includes("cancel")) {
    return {
      dot: "bg-red-500",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
      header: "text-red-400",
      ring: "ring-red-500/20",
    };
  }
  return {
    dot: "bg-muted-foreground/40",
    badge: "bg-muted/30 text-muted-foreground border-border/20",
    header: "text-muted-foreground",
    ring: "ring-border/20",
  };
}

// ─── PRIORITY BADGE ────────────────────────────────────────────────────────────
function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-amber-400",
    LOW: "bg-slate-400",
  };
  return (
    <span className={cn("size-1.5 rounded-full shrink-0", colors[priority] ?? "bg-slate-400")} />
  );
}

// ─── SINGLE TASK CARD ─────────────────────────────────────────────────────────
function MobileTaskCard({ task, statusName }: { task: Task; statusName: string }) {
  const style = getStatusStyle(statusName);
  const taskId = (task as any)._id || task.id;
  const assignee = (task as any).assignee;
  const firstName = assignee?.firstName || "";
  const lastName = assignee?.lastName || "";
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?";

  return (
    <Link href={`/tasks/${taskId}`} className="block active:scale-[0.98] transition-transform">
      <div className="bg-card/40 backdrop-blur-sm border border-border/10 rounded-button px-4 py-3.5 space-y-2.5 hover:border-primary/20 hover:bg-card/60 transition-all">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <PriorityDot priority={task.priority} />
          <p className="text-sm font-bold text-foreground/90 leading-snug line-clamp-2 flex-1">
            {task.title}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
            {(task as any).taskCode || `#${taskId?.slice(-6)}`}
          </span>

          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className="text-[10px] font-medium text-muted-foreground/60">
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {assignee ? (
              <Avatar className="size-5 ring-1 ring-border/20 rounded-full">
                <AvatarImage src={assignee.avatarUrl} />
                <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-5 rounded-full bg-muted/20 ring-1 ring-border/10 flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground/40">?</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── ACCORDION STATUS GROUP ────────────────────────────────────────────────────
function StatusGroup({
  statusName,
  tasks,
  defaultOpen,
}: {
  statusName: string;
  tasks: Task[];
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const style = getStatusStyle(statusName);

  return (
    <div className={cn("rounded-button overflow-hidden ring-1 transition-all", style.ring)}>
      {/* HEADER */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 bg-card/30 backdrop-blur-sm active:bg-muted/30 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={cn("size-2 rounded-full shrink-0", style.dot)} />
          <span className={cn("text-[11px] font-black uppercase tracking-[0.15em]", style.header)}>
            {statusName}
          </span>
          <Badge
            className={cn(
              "h-5 min-w-[20px] px-1.5 text-[9px] font-black border rounded-xs",
              style.badge
            )}
          >
            {tasks.length}
          </Badge>
        </div>
        <div className="text-muted-foreground/50">
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </button>

      {/* TASK LIST */}
      {isOpen && (
        <div className="px-3 pb-3 pt-2 space-y-2 bg-muted/5 animate-in fade-in slide-in-from-top-1 duration-200">
          {tasks.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground/40 py-4 font-medium">
              No tasks in this status
            </p>
          ) : (
            tasks.map((task) => (
              <MobileTaskCard
                key={(task as any)._id || task.id}
                task={task}
                statusName={statusName}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function ProjectTasksMobileView({ projectId }: ProjectTasksMobileViewProps) {
  const [search, setSearch] = useState("");
  const { activeOrgId, activeOrg } = useAuth();
  const [sortPreference] = useState(() => readTaskSortPreference() ?? getDefaultTaskSortState());

  const canMutate =
    activeOrg?.role === "OWNER" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER" ||
    activeOrg?.role === "MEMBER";

  // Fetch ALL tasks for this project (high limit for grouped accordion view)
  const tasksQuery = useTasksQuery(
    {
      projectId,
      limit: 500,
      sortBy: sortPreference.field,
      sortOrder: sortPreference.direction,
    },
    { staleTime: 0 }
  );

  // Fetch dynamic statuses (no args — org-scoped in context)
  const { data: dynamicStatuses = [], isLoading: statusesLoading } = useStatusesQuery();

  const allTasks: Task[] = useMemo(() => {
    const raw = tasksQuery.data?.data?.items ?? [];
    return filterVisibleTasks(raw);
  }, [tasksQuery.data]);

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return allTasks;
    const q = search.toLowerCase();
    return allTasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        (t as any).taskCode?.toLowerCase().includes(q)
    );
  }, [allTasks, search]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};

    // Build initial groups from dynamic statuses (preserves order)
    for (const s of dynamicStatuses) {
      const key = s.name;
      groups[key] = [];
    }

    // If no dynamic statuses yet, create a fallback
    if (dynamicStatuses.length === 0) {
      groups["TODO"] = [];
      groups["IN PROGRESS"] = [];
      groups["DONE"] = [];
    }

    // Place each task
    for (const task of filteredTasks) {
      const resolved = resolveStatus(task, dynamicStatuses);
      const statusName = resolved?.name ?? "TODO";
      if (!groups[statusName]) groups[statusName] = [];
      groups[statusName].push(task);
    }

    return groups;
  }, [filteredTasks, dynamicStatuses]);

  // Determine which status should be open by default (first non-empty, or first)
  const defaultOpenStatus = useMemo(() => {
    const keys = Object.keys(groupedTasks);
    // Open the first status that has tasks, fallback to first key
    return keys.find((k) => groupedTasks[k].length > 0) ?? keys[0] ?? "";
  }, [groupedTasks]);

  const isLoading = tasksQuery.isLoading || statusesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pb-[100px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-button bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-[100px]">
      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="pl-10 h-11 rounded-button bg-muted/10 border-border/30 text-sm placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:bg-background"
        />
      </div>

      {/* TASK COUNT SUMMARY */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
          {filteredTasks.length} Tasks
        </span>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-[10px] font-bold text-primary underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* STATUS ACCORDION GROUPS */}
      {Object.entries(groupedTasks).map(([statusName, tasks], idx) => (
        <StatusGroup
          key={statusName}
          statusName={statusName}
          tasks={tasks}
          defaultOpen={statusName === defaultOpenStatus}
        />
      ))}

      {/* EMPTY STATE */}
      {filteredTasks.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <CheckCircle2 className="size-12 text-muted-foreground/10" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            {search ? "No tasks match your search" : "No tasks yet"}
          </p>
          {!search && canMutate && (
            <CreateTaskModal
              defaultProjectId={projectId}
              trigger={
                <Button size="sm" className="rounded-button mt-1 h-9 px-5 text-xs font-bold">
                  Create First Task
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* FAB */}
      {canMutate && (
        <CreateTaskModal
          defaultProjectId={projectId}
          trigger={
            <Button
              size="icon"
              className="fixed bottom-20 right-4 size-14 rounded-button shadow-2xl shadow-primary/40 z-50 animate-in zoom-in slide-in-from-bottom-10 duration-500 active:scale-95 transition-transform"
            >
              <Plus className="size-7" />
            </Button>
          }
        />
      )}
    </div>
  );
}
