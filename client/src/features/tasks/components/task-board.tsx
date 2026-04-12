"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useOptimistic,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Plus,
  Calendar,
  GripVertical,
  Loader2,
  Pencil,
  AlertCircle,
  CircleDot,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Trash2,
  MoreHorizontal,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Task, TaskStatus } from "@/types/task.types";
import {
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
  useCreateTaskMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";

// ─── Column definitions ────────────────────────────────────────────────────────

interface ColumnDef {
  id: TaskStatus;
  label: string;
  icon: React.ElementType;
  dotColor: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "BACKLOG",
    label: "Backlog",
    icon: Circle,
    dotColor: "#6C757D",
  },
  {
    id: "TODO",
    label: "To Do",
    icon: CircleDot,
    dotColor: "#0D6EFD",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    icon: Clock,
    dotColor: "#6F42C1",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    icon: Eye,
    dotColor: "#FD7E14",
  },
  {
    id: "DONE",
    label: "Done",
    icon: CheckCircle2,
    dotColor: "#198754",
  },
];

// ─── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; flagColor: string }
> = {
  LOW:    { label: "Low",    color: "text-slate-600 dark:text-slate-300",   bg: "bg-slate-100 dark:bg-slate-800",   flagColor: "#6C757D" },
  MEDIUM: { label: "Medium", color: "text-blue-700 dark:text-blue-300",      bg: "bg-blue-50 dark:bg-blue-900/40",   flagColor: "#0D6EFD" },
  HIGH:   { label: "High",   color: "text-orange-700 dark:text-orange-300",  bg: "bg-orange-50 dark:bg-orange-900/40", flagColor: "#FD7E14" },
  URGENT: { label: "Urgent", color: "text-red-700 dark:text-red-300",        bg: "bg-red-50 dark:bg-red-900/40",      flagColor: "#dc2626" },
};

// ─── Helper: stable task ID ────────────────────────────────────────────────────

function tid(t: Task) {
  return (t.id || (t as any)._id) as string;
}

// ─── TaskCard (Sortable) ───────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  projectId?: string;
  canEdit?: boolean;
}

function TaskCard({ task, isDragging = false, projectId, canEdit = true }: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteTask = useDeleteTaskMutation();
  const changeStatus = useUpdateTaskStatusMutation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: tid(task), disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: sortableDragging ? 0.35 : 1,
  };

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const isPastDue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(tid(task));
      toast.success("Task deleted");
      setDeleteOpen(false);
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  const assignees = task.assigneeUsers || [];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={[
          "group rounded-[10px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
          "transition-all duration-150",
          "hover:-translate-y-px hover:shadow-[0_3px_8px_rgba(16,24,40,0.08)]",
          isDragging ? "scale-[1.02] shadow-[0_8px_20px_rgba(16,24,40,0.14)] cursor-grabbing" : "cursor-pointer",
        ].join(" ")}
        onClick={() => {
          if (canEdit) setEditOpen(true);
        }}
      >
        <div className="p-3.5">
          {/* Header row */}
          <div className="flex items-start gap-2.5">
            {/* Drag handle */}
            {canEdit ? (
              <button
                {...attributes}
                {...listeners}
                onClick={(event) => event.stopPropagation()}
                className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label="Drag task"
              >
                <GripVertical className="size-3.5" />
              </button>
            ) : (
              <div className="mt-0.5 shrink-0 text-muted-foreground/50">
                <GripVertical className="size-3.5" />
              </div>
            )}

            {/* Title */}
            <p className="flex-1 min-w-0 text-[14px] font-semibold leading-5 text-foreground wrap-break-word">
              {task.title}
            </p>

            {/* Actions menu */}
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-3.5" />
                    Edit task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {/* Description snippet */}
          {task.description && (
            <p className="mt-1.5 ml-6 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 ml-6 flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 ml-6 flex items-end justify-between gap-2">
            <TooltipProvider>
              <div className="flex -space-x-1.5 overflow-hidden items-center">
                {assignees.slice(0, 3).map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5.5 w-5.5 border border-white dark:border-[#111827] cursor-default">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs font-medium">{user.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {assignees.length > 3 && (
                  <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground border border-background">
                    +{assignees.length - 3}
                  </div>
                )}
                {assignees.length === 0 && (
                  <span className="text-[12px] text-muted-foreground/60">Unassigned</span>
                )}
              </div>
            </TooltipProvider>

            <div className="flex items-center gap-2">
              {dueDate ? (
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    isPastDue
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="size-3" />
                  <span>{dueDate}</span>
                  {isPastDue ? <AlertCircle className="size-3" /> : null}
                </div>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${priority.bg} ${priority.color}`}
              >
                {priority.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Permanently delete &quot;{task.title}&quot;? This cannot be undone.
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
              {deleteTask.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canEdit ? (
        <EditTaskModal task={task} open={editOpen} onOpenChange={setEditOpen} />
      ) : null}
    </>
  );
}

// ─── Overlay card (shown while dragging) ──────────────────────────────────────

function DragOverlayCard({ task }: { task: Task }) {
  return <TaskCard task={task} isDragging />;
}

// ─── Quick-add input ───────────────────────────────────────────────────────────

interface QuickAddProps {
  projectId?: string;
  status: TaskStatus;
  onDone: () => void;
}

function QuickAddInput({ projectId, status, onDone }: QuickAddProps) {
  const [value, setValue] = useState("");
  const createTask = useCreateTaskMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title) { onDone(); return; }
    try {
      await createTask.mutateAsync({
        title,
        projectId: projectId ?? "",
        status,
        priority: "MEDIUM",
      });
      toast.success("Task created");
      onDone();
    } catch {
      toast.error("Failed to create task.");
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#DEE2E6] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-slate-700 dark:bg-slate-900">
      <Input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Task name…"
        className="h-7 border-none bg-transparent p-0 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onDone();
        }}
      />
      <div className="flex gap-1">
        {createTask.isPending ? (
          <Loader2 className="size-4 animate-spin text-[#0D6EFD]" />
        ) : (
          <button
            onClick={handleSubmit}
            className="rounded-md p-0.5 text-primary hover:bg-primary/10"
            aria-label="Save"
          >
            <Plus className="size-4" />
          </button>
        )}
        <button
          onClick={onDone}
          className="rounded-md p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── TaskColumn ────────────────────────────────────────────────────────────────

interface TaskColumnProps {
  col: ColumnDef;
  tasks: Task[];
  isOver: boolean;
  projectId?: string;
  canEdit?: boolean;
}

function TaskColumn({ col, tasks, isOver, projectId, canEdit = true }: TaskColumnProps) {
  const [quickAdd, setQuickAdd] = useState(false);
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex flex-col rounded-xl border border-border bg-transparent",
        "min-h-100 w-75 shrink-0 px-1 transition-colors duration-150",
        isOver ? "border-muted-foreground/50 ring-1 ring-border" : "",
      ].join(" ")}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.dotColor }} />
          <span className="text-[15px] font-semibold text-foreground">{col.label}</span>
          <span className="text-[12px] text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {canEdit ? (
          <button
            onClick={() => setQuickAdd(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Add task to ${col.label}`}
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Cards area */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-2 py-1.5 pb-3">
        <SortableContext
          items={tasks.map(tid)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={tid(task)} task={task} projectId={projectId} canEdit={canEdit} />
          ))}
        </SortableContext>

        {/* Quick-add input */}
        {quickAdd && canEdit && (
          <QuickAddInput
            projectId={projectId}
            status={col.id}
            onDone={() => setQuickAdd(false)}
          />
        )}

        {/* Empty state */}
        {tasks.length === 0 && !quickAdd && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              {isOver ? "Drop here" : "No tasks"}
            </p>
            {canEdit ? (
              <button
                onClick={() => setQuickAdd(true)}
                className="mt-1 text-[12px] text-primary hover:underline"
              >
                + Add task
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskBoard (Main export) ───────────────────────────────────────────────────

interface TaskBoardProps {
  tasks: Task[];
  projectId?: string;
  canEdit?: boolean;
  /** @deprecated — kept for backward compat with project detail page */
  addTaskSlot?: React.ReactNode;
}

export function TaskBoard({ tasks: initialTasks, projectId, canEdit = true }: TaskBoardProps) {
  // Local optimistic state
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks);
  const [, startTransition] = useTransition();

  // Sync when parent re-fetches
  // (use effect-like sync via key on parent is the cleanest, but we track ref)
  const prevInitial = useRef<Task[]>(initialTasks);
  if (prevInitial.current !== initialTasks) {
    prevInitial.current = initialTasks;
    setLocalTasks(initialTasks);
  }

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overColumnId, setOverColumnId] = useState<TaskStatus | null>(null);

  const changeStatus = useUpdateTaskStatusMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const grouped = useCallback(() => {
    const map: Record<TaskStatus, Task[]> = {
      BACKLOG: [], TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], ARCHIVED: [],
    };
    for (const t of localTasks) {
      const s = t.status as TaskStatus;
      if (map[s]) map[s].push(t);
    }
    return map;
  }, [localTasks]);

  const activeTask = activeId
    ? localTasks.find((t) => tid(t) === activeId)
    : null;

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setOverColumnId(null); return; }
    // over.id can be a column id or a task id
    const colIds = COLUMNS.map((c) => c.id as string);
    if (colIds.includes(over.id as string)) {
      setOverColumnId(over.id as TaskStatus);
    } else {
      // Find which column the hovered task is in
      const hovered = localTasks.find((t) => tid(t) === over.id);
      setOverColumnId(hovered?.status ?? null);
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!canEdit) {
      setActiveId(null);
      setOverColumnId(null);
      return;
    }

    setActiveId(null);
    setOverColumnId(null);
    if (!over || !activeTask) return;

    const colIds = COLUMNS.map((c) => c.id as string);
    let targetStatus: TaskStatus;

    if (colIds.includes(over.id as string)) {
      targetStatus = over.id as TaskStatus;
    } else {
      const targetTask = localTasks.find((t) => tid(t) === over.id);
      if (!targetTask) return;
      targetStatus = targetTask.status;
    }

    const oldStatus = activeTask.status;

    // Within same column — reorder
    if (targetStatus === oldStatus) {
      startTransition(() => {
        setLocalTasks((prev) => {
          const col = prev.filter((t) => t.status === oldStatus);
          const rest = prev.filter((t) => t.status !== oldStatus);
          const oldIdx = col.findIndex((t) => tid(t) === active.id);
          const newIdx = col.findIndex((t) => tid(t) === over.id);
          if (oldIdx === -1 || newIdx === -1) return prev;
          return [...rest, ...arrayMove(col, oldIdx, newIdx)];
        });
      });
      return;
    }

    // Cross-column — optimistic update then API call
    startTransition(() => {
      setLocalTasks((prev) =>
        prev.map((t) =>
          tid(t) === active.id ? { ...t, status: targetStatus } : t,
        ),
      );
    });

    try {
      await changeStatus.mutateAsync({ id: tid(activeTask), status: targetStatus });
      toast.success(`Moved to ${targetStatus.replace(/_/g, " ")}`);
    } catch {
      // Rollback
      startTransition(() => {
        setLocalTasks((prev) =>
          prev.map((t) =>
            tid(t) === active.id ? { ...t, status: oldStatus } : t,
          ),
        );
      });
      toast.error("Failed to update task status.");
    }
  };

  const g = grouped();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col.id}
            col={col}
            tasks={g[col.id] ?? []}
            isOver={overColumnId === col.id}
            projectId={projectId}
            canEdit={canEdit}
          />
        ))}
      </div>

      {/* Drag overlay (floating ghost) */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
