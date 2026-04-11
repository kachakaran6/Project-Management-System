"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  X,
  Trash2,
  Pencil,
  CheckSquare,
  FolderOpen,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useBulkTaskStatusMutation,
  useDeleteTaskMutation,
  useTasksQuery,
} from "@/features/tasks/hooks/use-tasks-query";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { StatusDropdown } from "@/features/tasks/components/status-dropdown";
import { Task, TaskStatus } from "@/types/task.types";

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const PRIORITY_CONFIG: Record<
  string,
  { cls: string; dot: string; label: string }
> = {
  LOW:    { cls: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400",   label: "Low" },
  MEDIUM: { cls: "bg-blue-100 text-blue-700 border-blue-200",      dot: "bg-blue-500",    label: "Medium" },
  HIGH:   { cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", label: "High" },
  URGENT: { cls: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-500",     label: "Urgent" },
};

// ─── TaskRow ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  projectName: string;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  canMutate: boolean;
}

function TaskRow({ task, projectName, selected, onSelect, onDelete, canMutate }: TaskRowProps) {
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isPastDue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE" &&
    task.status !== "ARCHIVED";

  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <tr className="group border-b border-border transition-colors hover:bg-muted/30">
      {/* Checkbox */}
      <td className="w-10 py-3 pl-4 pr-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-primary"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>

      {/* Title + Description */}
      <td className="max-w-[280px] py-3 pr-4">
        <p className="truncate text-sm font-medium leading-tight">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
      </td>

      {/* Status — inline dropdown */}
      <td className="py-3 pr-4">
        <StatusDropdown
          taskId={task.id}
          currentStatus={task.status}
          disabled={!canMutate}
        />
      </td>

      {/* Priority */}
      <td className="py-3 pr-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${priority?.cls ?? ""}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${priority?.dot ?? ""}`} />
          {priority?.label ?? task.priority}
        </span>
      </td>

      {/* Project */}
      <td className="py-3 pr-4">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FolderOpen className="size-3.5 flex-shrink-0" />
          <span className="truncate max-w-[140px]">{projectName || "—"}</span>
        </span>
      </td>

      {/* Due Date */}
      <td className="py-3 pr-4">
        {dueDateStr ? (
          <span
            className={`flex items-center gap-1.5 text-xs ${
              isPastDue ? "font-medium text-destructive" : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="size-3.5 flex-shrink-0" />
            {dueDateStr}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 pl-2 pr-4">
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canMutate && (
            <>
              <EditTaskModal
                task={task}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Edit task"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                title="Delete task"
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── TasksPage ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [priority, setPriority] = useState<string>("ALL");
  const [projectId, setProjectId] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const tasksQuery = useTasksQuery({ page: 1, limit: 500 });
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const deleteTask = useDeleteTaskMutation();
  const bulkStatus = useBulkTaskStatusMutation();
  const { activeOrg, user } = useAuth();

  const userRole = activeOrg?.role || user?.role;
  const canMutate =
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN" ||
    userRole === "MANAGER";

  // projectId → name lookup
  const projectMap = useMemo(() => {
    return Object.fromEntries(
      (projectsQuery.data?.data.items ?? []).map((p: any) => [p.id || p._id, p.name]),
    );
  }, [projectsQuery.data?.data.items]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const rows = tasksQuery.data?.data.items ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((task) => {
      if (term && !`${task.title} ${task.description ?? ""}`.toLowerCase().includes(term)) return false;
      if (status !== "ALL" && task.status !== status) return false;
      if (priority !== "ALL" && task.priority !== priority) return false;
      if (projectId !== "ALL" && task.projectId !== projectId) return false;
      return true;
    });
  }, [tasksQuery.data?.data.items, search, status, priority, projectId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([id]) => id);

  const activeFilterCount = [
    search.trim() !== "",
    status !== "ALL",
    priority !== "ALL",
    projectId !== "ALL",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setProjectId("ALL");
    setPage(1);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const all: Record<string, boolean> = {};
      rows.forEach((t) => { all[t.id] = true; });
      setSelected(all);
    } else {
      setSelected({});
    }
  };

  const isAllSelected = rows.length > 0 && selectedIds.length === rows.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < rows.length;

  const totalTasks = tasksQuery.data?.data.items.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasksQuery.isLoading
              ? "Loading tasks…"
              : `${totalTasks} task${totalTasks !== 1 ? "s" : ""} across all projects`}
          </p>
        </div>
        <CreateTaskModal
          trigger={
            <Button size="md" className="gap-2">
              <Plus className="size-4" />
              Create Task
            </Button>
          }
        />
      </div>

      {/* ── Filter Bar ── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search tasks…"
              className="pl-9"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); }}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Status */}
          <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priority} onValueChange={(v) => { setPage(1); setPriority(v); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Project */}
          <Select value={projectId} onValueChange={(v) => { setPage(1); setProjectId(v); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {(projectsQuery.data?.data.items ?? []).map((p: any) => (
                <SelectItem key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
              Clear
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            </Button>
          )}

          {/* Filter indicator */}
          {activeFilterCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="size-3.5" />
              Showing {filtered.length} of {totalTasks}
            </span>
          )}
        </div>
      </div>



      {/* ── Bulk Action Bar ── */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedIds.length} task{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canMutate || bulkStatus.isPending}
              onClick={async () => {
                try {
                  await bulkStatus.mutateAsync({ ids: selectedIds, status: "IN_PROGRESS" as TaskStatus });
                  setSelected({});
                  toast.success("Marked as In Progress");
                } catch {
                  toast.error("Bulk update failed");
                }
              }}
            >
              → In Progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canMutate || bulkStatus.isPending}
              onClick={async () => {
                try {
                  await bulkStatus.mutateAsync({ ids: selectedIds, status: "DONE" as TaskStatus });
                  setSelected({});
                  toast.success("Marked as Done");
                } catch {
                  toast.error("Bulk update failed");
                }
              }}
            >
              ✓ Mark Done
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* ── Loading Skeletons ── */}
      {tasksQuery.isLoading && (
        <div className="space-y-2 rounded-xl border border-border bg-card">
          {[...Array(10)].map((_, i) => (
            <div key={`task-skeleton-row-${i}`} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!tasksQuery.isLoading && rows.length === 0 && (
        <EmptyState
          title={totalTasks === 0 ? "No tasks yet" : "No tasks match filters"}
          description={
            totalTasks === 0
              ? "Create your first task to start tracking work."
              : "Try adjusting your search or filters to find tasks."
          }
          actionLabel={totalTasks === 0 ? "Create Task" : "Clear Filters"}
          onAction={
            totalTasks === 0
              ? undefined
              : clearFilters
          }
        />
      )}

      {/* ── Task Table ── */}
      {!tasksQuery.isLoading && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 py-3 pl-4 pr-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Title
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Priority
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Due Date
                </th>
                <th className="py-3 pl-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {rows.map((task) => (
                <TaskRow
                  key={task.id || (task as any)._id}
                  task={task}
                  projectName={projectMap[task.projectId] ?? ""}
                  selected={Boolean(selected[task.id || (task as any)._id])}
                  onSelect={(checked) =>
                    setSelected((prev) => ({ ...prev, [task.id || (task as any)._id]: checked }))
                  }
                  onDelete={() => setDeleteTarget(task)}
                  canMutate={canMutate}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={p === currentPage ? "primary" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground">
                    …
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.title}&quot;
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  const targetId = deleteTarget.id || (deleteTarget as any)._id;
                  await deleteTask.mutateAsync(targetId);
                  setDeleteTarget(null);
                  // remove from selection
                  setSelected((prev) => {
                    const next = { ...prev };
                    delete next[targetId];
                    return next;
                  });
                  toast.success("Task deleted");
                } catch {
                  toast.error("Failed to delete task");
                }
              }}
            >
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
