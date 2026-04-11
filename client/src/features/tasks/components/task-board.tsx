"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Calendar,
  Flag,
  Trash2,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task, TaskStatus } from "@/types/task.types";
import {
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
} from "@/features/tasks/hooks/use-tasks-query";

// ─── Constants ─────────────────────────────────────────────────────────────

const BOARD_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  {
    id: "TODO",
    label: "To Do",
    color: "border-t-slate-400 bg-slate-50 dark:bg-slate-900/30",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    color: "border-t-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    color: "border-t-amber-500 bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "DONE",
    label: "Done",
    color: "border-t-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  BACKLOG: "TODO",
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "IN_REVIEW",
  IN_REVIEW: "DONE",
  DONE: null,
  ARCHIVED: null,
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600",
};

// ─── TaskCard ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const changeStatus = useUpdateTaskStatusMutation();
  const deleteTask = useDeleteTaskMutation();

  const nextStatus = task.status ? NEXT_STATUS[task.status] : null;

  const handleMoveForward = async () => {
    if (!nextStatus) return;
    try {
      await changeStatus.mutateAsync({ id: task.id, status: nextStatus });
      toast.success(`Moved to ${nextStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update task status.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted");
      setDeleteOpen(false);
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const isPastDue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <>
      <div className="group rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug flex-1 min-w-0 break-words">
            {task.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStatus && (
                <DropdownMenuItem onClick={handleMoveForward}>
                  <ArrowRight className="mr-2 size-4" />
                  Move to {nextStatus.replace("_", " ")}
                </DropdownMenuItem>
              )}
              {nextStatus && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flag
              className={`size-3 flex-shrink-0 ${PRIORITY_COLORS[task.priority] ?? ""}`}
            />
            <span className="text-xs text-muted-foreground">{task.priority}</span>
          </div>
          {dueDate && (
            <div
              className={`flex items-center gap-1 text-xs ${isPastDue ? "text-destructive" : "text-muted-foreground"}`}
            >
              <Calendar className="size-3" />
              {dueDate}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── TaskColumn ────────────────────────────────────────────────────────────

interface TaskColumnProps {
  id: TaskStatus;
  label: string;
  colorClass: string;
  tasks: Task[];
  onAddTask?: () => void;
  addButtonSlot?: React.ReactNode;
}

function TaskColumn({
  label,
  colorClass,
  tasks,
  addButtonSlot,
}: TaskColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-xl border-t-4 border border-border ${colorClass} min-h-[300px] w-[280px] flex-shrink-0`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
            {tasks.length}
          </Badge>
        </div>
        {addButtonSlot}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No tasks here
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

// ─── TaskBoard ─────────────────────────────────────────────────────────────

interface TaskBoardProps {
  tasks: Task[];
  addTaskSlot?: React.ReactNode;
}

export function TaskBoard({ tasks, addTaskSlot }: TaskBoardProps) {
  const grouped = BOARD_COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  // Also collect BACKLOG tasks into TODO column
  const backlogTasks = tasks.filter((t) => t.status === "BACKLOG");
  grouped["TODO"] = [...(grouped["TODO"] ?? []), ...backlogTasks];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((col, idx) => (
        <TaskColumn
          key={col.id}
          id={col.id}
          label={col.label}
          colorClass={col.color}
          tasks={grouped[col.id] ?? []}
          addButtonSlot={idx === 0 ? addTaskSlot : undefined}
        />
      ))}
    </div>
  );
}
