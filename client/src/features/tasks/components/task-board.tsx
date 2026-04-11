"use client";

import {
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
  Flag,
  Calendar,
  GripVertical,
  Loader2,
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
  useCreateTaskMutation,
} from "@/features/tasks/hooks/use-tasks-query";

// ─── Column definitions ────────────────────────────────────────────────────────

interface ColumnDef {
  id: TaskStatus;
  label: string;
  icon: React.ElementType;
  accent: string;       // Tailwind border-color class
  headerBg: string;     // column header tint
  dotColor: string;     // indicator dot CSS color
}

const COLUMNS: ColumnDef[] = [
  {
    id: "BACKLOG",
    label: "Backlog",
    icon: Circle,
    accent: "border-t-slate-400",
    headerBg: "bg-slate-50 dark:bg-slate-900/40",
    dotColor: "#94a3b8",
  },
  {
    id: "TODO",
    label: "To Do",
    icon: CircleDot,
    accent: "border-t-blue-500",
    headerBg: "bg-blue-50/60 dark:bg-blue-950/30",
    dotColor: "#3b82f6",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    icon: Clock,
    accent: "border-t-violet-500",
    headerBg: "bg-violet-50/60 dark:bg-violet-950/30",
    dotColor: "#8b5cf6",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    icon: Eye,
    accent: "border-t-amber-500",
    headerBg: "bg-amber-50/60 dark:bg-amber-950/30",
    dotColor: "#f59e0b",
  },
  {
    id: "DONE",
    label: "Done",
    icon: CheckCircle2,
    accent: "border-t-emerald-500",
    headerBg: "bg-emerald-50/60 dark:bg-emerald-950/30",
    dotColor: "#10b981",
  },
];

// ─── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; flagColor: string }
> = {
  LOW:    { label: "Low",    color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-800",   flagColor: "#94a3b8" },
  MEDIUM: { label: "Medium", color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950",      flagColor: "#3b82f6" },
  HIGH:   { label: "High",   color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950",  flagColor: "#f97316" },
  URGENT: { label: "Urgent", color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950",        flagColor: "#dc2626" },
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
}

function TaskCard({ task, isDragging = false, projectId }: TaskCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTask = useDeleteTaskMutation();
  const changeStatus = useUpdateTaskStatusMutation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: tid(task) });

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

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={[
          "group relative rounded-xl border border-border/60 bg-card shadow-sm",
          "transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-md hover:border-border",
          isDragging ? "shadow-xl scale-105 rotate-1 cursor-grabbing" : "cursor-auto",
        ].join(" ")}
      >
        {/* Priority accent strip */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: priority.flagColor }}
        />

        <div className="p-3 pl-4">
          {/* Header row */}
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 flex-shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
              aria-label="Drag task"
            >
              <GripVertical className="size-3.5" />
            </button>

            {/* Title */}
            <p className="flex-1 min-w-0 text-sm font-semibold leading-snug break-words">
              {task.title}
            </p>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0 -mr-1"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description snippet */}
          {task.description && (
            <p className="mt-1.5 ml-5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 ml-5 flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-primary/8 px-1.5 py-px text-[10px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="rounded-md bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2.5 ml-5 flex items-center justify-between gap-2">
            {/* Priority pill */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[10px] font-semibold ${priority.bg} ${priority.color}`}
            >
              <Flag className="size-2.5" />
              {priority.label}
            </span>

            {/* Due date */}
            {dueDate && (
              <div
                className={`flex items-center gap-1 text-[10px] font-medium ${
                  isPastDue ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <Calendar className="size-2.5" />
                {dueDate}
                {isPastDue && (
                  <AlertCircle className="size-2.5 text-destructive" />
                )}
              </div>
            )}
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
    <div className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-2.5 py-2 shadow-sm">
      <Input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Task name…"
        className="h-7 border-none bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onDone();
        }}
      />
      <div className="flex gap-1">
        {createTask.isPending ? (
          <Loader2 className="size-4 animate-spin text-primary" />
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
}

function TaskColumn({ col, tasks, isOver, projectId }: TaskColumnProps) {
  const [quickAdd, setQuickAdd] = useState(false);
  const { setNodeRef } = useDroppable({ id: col.id });
  const Icon = col.icon;

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex flex-col rounded-2xl border border-border/60 border-t-4",
        col.accent,
        "min-h-[400px] w-[300px] flex-shrink-0 shadow-sm transition-all duration-200",
        isOver ? "ring-2 ring-primary/30 shadow-md scale-[1.01]" : "",
      ].join(" ")}
    >
      {/* Column header */}
      <div
        className={`flex items-center justify-between rounded-t-xl px-3 py-3 ${col.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: col.dotColor + "22" }}
          >
            <Icon className="size-3.5" style={{ color: col.dotColor }} />
          </div>
          <span className="text-sm font-semibold">{col.label}</span>
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
            style={{ background: col.dotColor }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setQuickAdd(true)}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
          aria-label={`Add task to ${col.label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Cards area */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5 pb-3">
        <SortableContext
          items={tasks.map(tid)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={tid(task)} task={task} projectId={projectId} />
          ))}
        </SortableContext>

        {/* Quick-add input */}
        {quickAdd && (
          <QuickAddInput
            projectId={projectId}
            status={col.id}
            onDone={() => setQuickAdd(false)}
          />
        )}

        {/* Empty state */}
        {tasks.length === 0 && !quickAdd && (
          <div
            className={[
              "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center",
              isOver ? "border-primary/40 bg-primary/5" : "bg-muted/10",
            ].join(" ")}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: col.dotColor + "18" }}
            >
              <Icon className="size-5" style={{ color: col.dotColor + "80" }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {isOver ? "Drop here" : "No tasks yet"}
            </p>
            <button
              onClick={() => setQuickAdd(true)}
              className="text-[11px] text-primary hover:underline"
            >
              + Add task
            </button>
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
  /** @deprecated — kept for backward compat with project detail page */
  addTaskSlot?: React.ReactNode;
}

export function TaskBoard({ tasks: initialTasks, projectId }: TaskBoardProps) {
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
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col.id}
            col={col}
            tasks={g[col.id] ?? []}
            isOver={overColumnId === col.id}
            projectId={projectId}
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
