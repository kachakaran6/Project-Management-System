"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

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
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

// ─── Column definitions ────────────────────────────────────────────────────────

interface ColumnDef {
  id: TaskStatus;
  label: string;
  icon: React.ElementType;
  dotColor: string;
}

const ALL_STATUS_CONFIG: ColumnDef[] = [
  {
    id: "BACKLOG",
    label: "Backlog",
    icon: Circle,
    dotColor: "#94a3b8", // slate-400
  },
  {
    id: "TODO",
    label: "To Do",
    icon: CircleDot,
    dotColor: "#3b82f6", // blue-500
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    icon: Clock,
    dotColor: "#8b5cf6", // purple-500
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    icon: Eye,
    dotColor: "#f59e0b", // amber-500
  },
  {
    id: "DONE",
    label: "Done",
    icon: CheckCircle2,
    dotColor: "#22c55e", // green-500
  },
  {
    id: "REJECTED",
    label: "Rejected",
    icon: X,
    dotColor: "#f43f5e", // rose-500
  },
  {
    id: "ARCHIVED",
    label: "Archived",
    icon: Trash2,
    dotColor: "#64748b", // slate-500
  },
];

const CORE_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; flagColor: string }
> = {
  LOW:    { label: "Low",    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10",   flagColor: "#10b981" },
  MEDIUM: { label: "Medium", color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-500/10",      flagColor: "#3b82f6" },
  HIGH:   { label: "High",   color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-500/10",     flagColor: "#f59e0b" },
  URGENT: { label: "Urgent", color: "text-rose-600 dark:text-rose-400",      bg: "bg-rose-500/10",      flagColor: "#f43f5e" },
};

function tid(t: Task) {
  return (t.id || (t as any)._id) as string;
}

// ─── TaskCard ───────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  index: number;
  canEdit?: boolean;
}

const TaskCard = React.memo(({ task, index, canEdit = true }: TaskCardProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteTask = useDeleteTaskMutation();
  const { openPanel } = useTaskPanelStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
      <Draggable draggableId={tid(task)} index={index} isDragDisabled={!canEdit}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "group relative mb-3 rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
              "transition-shadow duration-200 ease-in-out",
              "hover:shadow-md hover:border-border",
              snapshot.isDragging ? "shadow-xl border-primary/30 z-50 ring-2 ring-primary/5" : "cursor-pointer"
            )}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("taskId", tid(task));
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
              openPanel(tid(task));
            }}
          >
            <div className="p-3.5">
              <div className="flex items-start gap-2.5">
                {/* Drag handle */}
                <div
                  {...provided.dragHandleProps}
                  className={cn(
                    "mt-0.5 shrink-0 cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing",
                    !canEdit && "opacity-20 cursor-default pointer-events-none"
                  )}
                >
                  <GripVertical className="size-3.5" />
                </div>

                {/* Title */}
                <p className="flex-1 min-w-0 text-[14px] font-semibold leading-5 text-foreground wrap-break-word">
                  {task.title}
                </p>

                {/* Actions */}
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/tasks/${tid(task)}`} onClick={(e) => e.stopPropagation()}>
                          <Eye className="mr-2 size-3.5" />
                          View details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}>
                        <Pencil className="mr-2 size-3.5" />
                        Edit task
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive font-medium"
                        onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Description */}
              {task.description && (
                <p className="mt-1.5 ml-6 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                  {task.description
                    .replace(/<[^>]*>?/gm, " ")
                    .replace(/&nbsp;/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()}
                </p>
              )}

              {/* Footer */}
              <div className="mt-3 ml-6 flex items-end justify-between gap-2">
                <TooltipProvider>
                  <div className="flex -space-x-1.5 overflow-hidden items-center">
                    {assignees.slice(0, 3).map((user) => (
                      <Tooltip key={user.id}>
                        <TooltipTrigger asChild>
                          <Avatar className="h-5.5 w-5.5 border-2 border-card shadow-sm">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="text-[9px] bg-muted font-bold">
                              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px] font-medium">
                          {user.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {assignees.length > 3 && (
                      <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground border-2 border-card">
                        +{assignees.length - 3}
                      </div>
                    )}
                  </div>
                </TooltipProvider>

                <div className="flex items-center gap-2">
                  {dueDate && (
                    <div className={cn(
                      "flex items-center gap-1 text-[11px] font-medium",
                      isPastDue ? "text-rose-500" : "text-muted-foreground/80"
                    )}>
                      <Calendar className="size-3" />
                      <span>{dueDate}</span>
                    </div>
                  )}
                  <span className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-tight uppercase",
                    priority.bg,
                    priority.color
                  )}>
                    {priority.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Draggable>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Permanently delete &quot;{task.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
              {deleteTask.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editOpen && <EditTaskModal task={task} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  );
});

TaskCard.displayName = "TaskCard";

// ─── QuickAdd ───────────────────────────────────────────────────────────────

function QuickAddInput({ projectId, status, onDone }: { projectId?: string; status: TaskStatus; onDone: () => void }) {
  const [value, setValue] = useState("");
  const createTask = useCreateTaskMutation();
  const { user } = useAuthStore();
  const isMember = user?.role === "MEMBER";

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title) { onDone(); return; }
    try {
      await createTask.mutateAsync({
        title,
        projectId: projectId ?? "",
        status,
        priority: "MEDIUM",
        assigneeId: isMember ? user?.id : undefined,
      });
      toast.success("Task created");
      onDone();
    } catch {
      toast.error("Failed to create task.");
    }
  };

  return (
    <div className="mb-3 rounded-xl border border-border/60 bg-card/50 p-3 shadow-sm ring-1 ring-primary/5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Task title..."
        className="h-8 border-none bg-transparent p-0 text-sm font-semibold placeholder:text-muted-foreground/40 focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onDone();
        }}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} className="h-7 text-xs">Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={createTask.isPending} className="h-7 text-xs font-bold">
          {createTask.isPending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
          Add Task
        </Button>
      </div>
    </div>
  );
}

// ─── TaskBoard (Main) ───────────────────────────────────────────────────────

interface TaskBoardProps {
  tasks: Task[];
  projectId?: string;
  canEdit?: boolean;
}

export function TaskBoard({ tasks: initialTasks, projectId, canEdit = true }: TaskBoardProps) {
  // mapped state for dnd logic
  const [data, setData] = useState<{
    tasks: Record<string, Task>;
    columns: Record<string, string[]>;
  }>(() => {
    const tasks: Record<string, Task> = {};
    const columns: Record<string, string[]> = {};
    ALL_STATUS_CONFIG.forEach(c => { columns[c.id] = []; });

    initialTasks.forEach(t => {
      const id = tid(t);
      tasks[id] = t;
      if (columns[t.status]) columns[t.status].push(id);
    });
    return { tasks, columns };
  });

  const changeStatus = useUpdateTaskStatusMutation();
  const [isSyncing, setIsSyncing] = useState(false);

  const visibleColumns = useMemo(() => {
    return ALL_STATUS_CONFIG.filter(col => 
      CORE_STATUSES.includes(col.id as TaskStatus) || 
      (data.columns[col.id] && data.columns[col.id].length > 0)
    );
  }, [data.columns]);

  // Sync when initialTasks change, unless we are syncing/dragging
  useEffect(() => {
    if (isSyncing) return;
    const tasks: Record<string, Task> = {};
    const columns: Record<string, string[]> = {};
    ALL_STATUS_CONFIG.forEach(c => { columns[c.id] = []; });

    initialTasks.forEach(t => {
      const id = tid(t);
      tasks[id] = t;
      if (columns[t.status]) columns[t.status].push(id);
    });
    setData({ tasks, columns });
  }, [initialTasks, isSyncing]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // PREPARE OPTIMISTIC UPDATE
    const prevData = { ...data };
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    
    const newColumns = { ...data.columns };
    const sourceTaskIds = Array.from(newColumns[sourceColId]);
    sourceTaskIds.splice(source.index, 1);
    
    const destTaskIds = sourceColId === destColId 
      ? sourceTaskIds 
      : Array.from(newColumns[destColId]);
    
    destTaskIds.splice(destination.index, 0, draggableId);

    newColumns[sourceColId] = sourceTaskIds;
    newColumns[destColId] = destTaskIds;

    const newTasks = { ...data.tasks };
    if (sourceColId !== destColId) {
      newTasks[draggableId] = { ...newTasks[draggableId], status: destColId as TaskStatus };
    }

    // APPLY OPTIMISTIC STATE
    setData({ tasks: newTasks, columns: newColumns });
    setIsSyncing(true);

    // PERSIST TO BACKEND
    try {
      await changeStatus.mutateAsync({ 
        id: draggableId, 
        status: destColId as TaskStatus,
        position: destination.index
      });
      if (sourceColId !== destColId) {
        toast.success(`Task moved to ${destColId.replace(/_/g, " ")}`);
      }
    } catch (err) {
      // ROLLBACK
      setData(prevData);
      toast.error("Failed to sync task move.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Outer wrapper for horizontal scrolling */}
      <div className="w-full overflow-x-auto pb-6 pt-1 custom-scrollbar">
        <div className="flex gap-6 min-w-max px-1">
          {visibleColumns.map((col) => {
            const columnTasks = data.columns[col.id].map(id => data.tasks[id]);
            return (
              <div 
                key={col.id} 
                className="flex flex-col w-[300px] shrink-0 rounded-2xl bg-muted/20 border border-border/40 shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 mb-2 bg-muted/10 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: col.dotColor }} />
                    <span className="text-[15px] font-bold tracking-tight text-foreground/90 uppercase">{col.label}</span>
                    <span className="text-[11px] font-bold text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded-full ring-1 ring-border/20 shadow-inner">
                      {columnTasks.length}
                    </span>
                  </div>
                  {canEdit && <ColumnActions colId={col.id} projectId={projectId} />}
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id} ignoreContainerClipping={true}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex flex-1 flex-col px-3 py-2 min-h-[600px] max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden transition-colors duration-300",
                        snapshot.isDraggingOver ? "bg-primary/[0.03]" : "bg-transparent"
                      )}
                    >
                      <div className="space-y-3">
                        {columnTasks.map((task, index) => (
                          <TaskCard key={tid(task)} task={task} index={index} canEdit={canEdit} />
                        ))}
                      </div>
                      {provided.placeholder}
                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/30 py-16 opacity-40 transition-opacity hover:opacity-60">
                          <p className="text-[12px] font-semibold text-muted-foreground tracking-tight">No tasks in {col.label.toLowerCase()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}

function ColumnActions({ colId, projectId }: { colId: TaskStatus; projectId?: string }) {
  const [quickAdd, setQuickAdd] = useState(false);
  
  if (quickAdd) {
    return <QuickAddInput projectId={projectId} status={colId} onDone={() => setQuickAdd(false)} />;
  }

  return (
    <button
      onClick={() => setQuickAdd(true)}
      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-all hover:bg-white hover:text-foreground hover:shadow-sm"
    >
      <Plus className="size-3.5" />
    </button>
  );
}
