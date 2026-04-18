"use client";

import {useRouter, useSearchParams, usePathname} from "@/lib/next-navigation";
import React, {useState, useEffect, useMemo} from "react";
import {toast} from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import {
  Plus,
  Calendar,
  Loader2,
  Pencil,
  CircleDot,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Trash2,
  X,
  Flag,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

import {Task, TaskStatus} from "@/types/task.types";
import {
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
  useCreateTaskMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import {EditTaskModal} from "@/features/tasks/components/edit-task-modal";
import {useTaskPanelStore} from "@/features/tasks/store/task-panel-store";
import {useAuthStore} from "@/store/auth-store";
import {cn} from "@/lib/utils";

// --- Column definitions --------------------------------------------------------

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
  {label: string; color: string; bg: string; flagColor: string}
> = {
  LOW: {
    label: "Low",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    flagColor: "#10b981",
  },
  MEDIUM: {
    label: "Medium",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    flagColor: "#3b82f6",
  },
  HIGH: {
    label: "High",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    flagColor: "#f59e0b",
  },
  URGENT: {
    label: "Urgent",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    flagColor: "#f43f5e",
  },
};

function tid(t: Task) {
  return (t.id || (t as any)._id) as string;
}

// --- TaskCard -----------------------------------------------------------------

interface TaskCardProps {
  task: Task;
  index: number;
  canEdit?: boolean;
}

const TaskCard = React.memo(({task, index, canEdit = true}: TaskCardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {openPanel} = useTaskPanelStore();
  const deleteTask = useDeleteTaskMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const isPastDue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

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
      <Draggable
        draggableId={tid(task)}
        index={index}
        isDragDisabled={!canEdit}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "group relative flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-3 mx-0.5",
              "transition-all duration-200 ease-in-out select-none shadow-sm",
              "hover:border-primary/20 hover:shadow-md",
              snapshot.isDragging
                ? "shadow-2xl border-primary/20 ring-1 ring-primary/10 scale-[1.02] z-50 bg-accent"
                : "cursor-grab active:cursor-grabbing",
            )}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("taskId", tid(task));
              router.push(`${pathname}?${params.toString()}`, {scroll: false});
              openPanel(tid(task));
            }}>
            {/* Task ID Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                T-{tid(task).slice(-4)}
              </span>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/[0.05] rounded transition-opacity">
                  <Pencil className="size-3 text-muted-foreground/40" />
                </button>
              )}
            </div>

            {/* Title */}
            <p className="text-[13px] font-semibold leading-snug text-foreground/90 line-clamp-2">
              {task.title}
            </p>

            {/* Metadata Footer */}
            <div className="flex items-center flex-wrap gap-2 mt-1">
              {/* Status Badge - Refined */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-border/40",
                  "bg-muted/50 text-muted-foreground",
                )}>
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: ALL_STATUS_CONFIG.find(
                      (c) => c.id === task.status,
                    )?.dotColor,
                  }}
                />
                <span className="capitalize">
                  {task.status.toLowerCase().replace("_", " ")}
                </span>
              </div>

              {/* Priority Icon */}
              <div
                className={cn(
                  "flex items-center justify-center p-1 rounded-md bg-muted/30 border border-border/20",
                  priority.color,
                )}>
                <Flag className="size-3" fill="currentColor" />
              </div>

              {/* Due Date */}
              {dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted/20",
                    isPastDue
                      ? "text-rose-500/80 bg-rose-500/5"
                      : "text-muted-foreground/60",
                  )}>
                  <Calendar className="size-3 opacity-60" />
                  <span>{dueDate}</span>
                </div>
              )}

              {/* Assignee - Smaller */}
              <div className="flex -space-x-1.5 items-center ml-auto">
                {assignees.slice(0, 1).map((user) => (
                  <Avatar
                    key={user.id}
                    className="h-5 w-5 ring-1 ring-background grayscale-[0.3]">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>
        )}
      </Draggable>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl border-border/10 max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Task</DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure? This will permanently remove{" "}
              <span className="text-foreground font-semibold">
                &quot;{task.title}&quot;
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="rounded-xl px-6">
              {deleteTask.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editOpen && (
        <EditTaskModal task={task} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </>
  );
});

TaskCard.displayName = "TaskCard";

// --- QuickAdd -----------------------------------------------------------------

function QuickAddInput({
  projectId,
  status,
  onDone,
}: {
  projectId?: string;
  status: TaskStatus;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const createTask = useCreateTaskMutation();
  const {user} = useAuthStore();
  const isMember = user?.role === "MEMBER";

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title) {
      onDone();
      return;
    }
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
    <div className="mx-3 my-2 rounded-xl border border-border/20 bg-card p-3 shadow-lg ring-1 ring-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What needs to be done?"
        className="h-9 border-none bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/40 focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onDone();
        }}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="h-8 px-3 text-xs">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createTask.isPending}
          className="h-8 px-4 text-xs font-semibold">
          {createTask.isPending && (
            <Loader2 className="mr-1.5 size-3 animate-spin" />
          )}
          Add Task
        </Button>
      </div>
    </div>
  );
}

// --- TaskBoard (Main) ---------------------------------------------------------

// --- Mobile Collapsible Column -----------------------------------------------

// --- TaskBoard (Main) ---------------------------------------------------------

interface TaskBoardProps {
  tasks: Task[];
  projectId?: string;
  canEdit?: boolean;
}

export function TaskBoard({
  tasks: initialTasks,
  projectId,
  canEdit = true,
}: TaskBoardProps) {
  const [data, setData] = useState<{
    tasks: Record<string, Task>;
    columns: Record<string, string[]>;
  }>(() => {
    const tasks: Record<string, Task> = {};
    const columns: Record<string, string[]> = {};
    ALL_STATUS_CONFIG.forEach((c) => {
      columns[c.id] = [];
    });

    initialTasks.forEach((t) => {
      const id = tid(t);
      tasks[id] = t;
      if (columns[t.status]) columns[t.status].push(id);
    });
    return {tasks, columns};
  });

  const changeStatus = useUpdateTaskStatusMutation();
  const [isSyncing, setIsSyncing] = useState(false);

  const visibleColumns = useMemo(() => {
    return ALL_STATUS_CONFIG.filter(
      (col) =>
        CORE_STATUSES.includes(col.id as TaskStatus) ||
        (data.columns[col.id] && data.columns[col.id].length > 0),
    );
  }, [data.columns]);

  useEffect(() => {
    if (isSyncing) return;
    const tasks: Record<string, Task> = {};
    const columns: Record<string, string[]> = {};
    ALL_STATUS_CONFIG.forEach((c) => {
      columns[c.id] = [];
    });

    initialTasks.forEach((t) => {
      const id = tid(t);
      tasks[id] = t;
      if (columns[t.status]) columns[t.status].push(id);
    });
    setData({tasks, columns});
  }, [initialTasks, isSyncing]);

  const onDragEnd = async (result: DropResult) => {
    const {source, destination, draggableId} = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const prevData = {...data};
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const newColumns = {...data.columns};
    const sourceTaskIds = Array.from(newColumns[sourceColId]);
    sourceTaskIds.splice(source.index, 1);
    const destTaskIds =
      sourceColId === destColId
        ? sourceTaskIds
        : Array.from(newColumns[destColId]);
    destTaskIds.splice(destination.index, 0, draggableId);
    newColumns[sourceColId] = sourceTaskIds;
    newColumns[destColId] = destTaskIds;

    const newTasks = {...data.tasks};
    if (sourceColId !== destColId) {
      newTasks[draggableId] = {
        ...newTasks[draggableId],
        status: destColId as TaskStatus,
      };
    }

    setData({tasks: newTasks, columns: newColumns});
    setIsSyncing(true);

    try {
      await changeStatus.mutateAsync({
        id: draggableId,
        status: destColId as TaskStatus,
        position: destination.index,
      });
    } catch (err) {
      setData(prevData);
      toast.error("Failed to sync task move.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative flex-1 w-full h-full select-none overflow-hidden">
      <div className="flex h-full w-full overflow-x-auto overflow-y-hidden custom-scrollbar-hidden md:custom-scrollbar pb-2 touch-pan-x">
        <div className="flex gap-4 p-1 px-4 md:px-0 pr-10 min-w-max h-full">
          <DragDropContext onDragEnd={onDragEnd}>
            {visibleColumns.map((col) => {
              const columnTasks = data.columns[col.id].map(
                (id) => data.tasks[id],
              );
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={columnTasks}
                  canEdit={canEdit}
                  projectId={projectId}
                />
              );
            })}
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}

// --- Kanban Column Component -------------------------------------------------

function KanbanColumn({
  col,
  tasks,
  canEdit,
  projectId,
}: {
  col: ColumnDef;
  tasks: Task[];
  canEdit: boolean;
  projectId?: string;
}) {
  const [isQuickAdd, setQuickAdd] = useState(false);

  return (
    <div className="flex flex-col w-[300px] shrink-0 bg-muted/10 rounded-2xl border border-border/50 h-full overflow-hidden transition-all duration-300 shadow-sm">
      {/* Sticky Column Header */}
      <div className="flex items-center justify-between px-4 py-5 shrink-0 bg-muted/20 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-2 w-2 rounded-full shrink-0 shadow-sm"
            style={{backgroundColor: col.dotColor}}
          />
          <h3 className="text-[13px] font-bold tracking-tight text-foreground/80 lowercase first-letter:uppercase truncate">
            {col.label}
          </h3>
          <span className="text-[11px] font-bold text-muted-foreground/40">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
            onClick={() => setQuickAdd(true)}>
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Internal Scrollable Task Area */}
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-3 custom-scrollbar scroll-smooth",
              "transition-colors duration-200",
              snapshot.isDraggingOver ? "bg-white/[0.01]" : "bg-transparent",
            )}>
            <div className="space-y-2.5">
              {tasks.map((task, index) => (
                <TaskCard
                  key={tid(task)}
                  task={task}
                  index={index}
                  canEdit={canEdit}
                />
              ))}
            </div>

            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.02] py-12 opacity-20 mt-2 mx-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  No tasks
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Sticky "Add Task" area at bottom */}
      <div className="shrink-0 p-2 bg-transparent">
        {isQuickAdd ? (
          <QuickAddInput
            projectId={projectId}
            status={col.id}
            onDone={() => setQuickAdd(false)}
          />
        ) : (
          <button
            onClick={() => setQuickAdd(true)}
            className="group flex items-center justify-start gap-2.5 w-full h-10 px-3 rounded-xl text-muted-foreground/40 transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]">
            <Plus className="size-3.5 transition-transform group-hover:scale-110" />
            <span className="text-[12px] font-bold tracking-tight">
              New work item
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

