import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {TableCell, TableRow} from "@/components/ui/table";
import {cn} from "@/lib/utils";
import {
  Task,
  TaskAssigneeUser,
  TaskPriority,
  TaskStatus,
} from "@/types/task.types";
import {toast} from "sonner";
import {
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
} from "../hooks/use-tasks-query";
import {AlertCircle, Eye, MoreHorizontal, Pencil, Trash2} from "lucide-react";
import {Dispatch, SetStateAction} from "react";
import {useTaskPanelStore} from "../store/task-panel-store";
import {usePathname, useRouter, useSearchParams} from "@/lib/next-navigation";

export const TaskRow = ({
  taskId,
  idx,
  task,
  assignee,
  canMutate,
  isOverdue,
  setSelectedTask,
  setDeleteId,
}: {
  taskId: string;
  idx: number;
  task: Task;
  assignee: TaskAssigneeUser | null;
  isOverdue: boolean | "" | undefined;
  canMutate: boolean;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setDeleteId: Dispatch<SetStateAction<string | null>>;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {openPanel} = useTaskPanelStore();
  const updateTask = useUpdateTaskMutation();
  const updateStatus = useUpdateTaskStatusMutation();

  const getProjectName = (task: Task) => {
    const projectValue = task.projectId as unknown as
      | {name?: string; _id?: string; id?: string}
      | string;
    if (typeof projectValue === "string") return projectValue;
    return (
      projectValue?.name || projectValue?._id || projectValue?.id || "Unknown"
    );
  };

  const handleInlineStatusChange = async (
    taskId: string,
    newStatus: TaskStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({id: taskId, status: newStatus});
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleInlinePriorityChange = async (
    taskId: string,
    newPriority: TaskPriority,
  ) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: {priority: newPriority},
      });
      toast.success("Task priority updated");
    } catch {
      toast.error("Failed to update priority");
    }
  };

  function tid(t: Task) {
    return (t.id || (t as any)._id) as string;
  }

  return (
    <TableRow
      key={taskId || `task-${idx}`}
      className="h-[72px] border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
      <TableCell className="py-4">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              const params = new URLSearchParams(searchParams.toString());
              params.set("taskId", tid(task));
              router.push(`${pathname}?${params.toString()}`, {scroll: false});
              openPanel(tid(task));
            }}
            className="font-semibold text-[15px] hover:text-primary transition-colors line-clamp-1 cursor-pointer text-left">
            {task.title}
          </button>
          <span className="text-[11px] font-mono text-muted-foreground/60">
            #{taskId.slice(-6).toUpperCase()}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {assignee ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 rounded-lg shadow-sm">
              <AvatarImage src={assignee.avatarUrl} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold rounded-lg border border-primary/10">
                {assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground/90 leading-none mb-1">
                {assignee.name}
              </span>
              <span className="text-[11px] text-muted-foreground/80 leading-none">
                {assignee.email}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Unassigned
          </span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger disabled={!canMutate} asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-7 rounded-full border-0 px-3 py-0 text-[11px] font-bold tracking-tight uppercase shadow-sm whitespace-nowrap",
                task.status === "DONE" &&
                  "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
                task.status === "IN_PROGRESS" &&
                  "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15",
                task.status === "IN_REVIEW" &&
                  "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15",
                task.status === "REJECTED" &&
                  "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15",
                ["TODO", "BACKLOG", "ARCHIVED"].includes(task.status || "") &&
                  "bg-slate-500/10 text-slate-600 hover:bg-slate-500/15",
              )}>
              {(task.status || "TODO").replace("_", " ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-xl border-border/50 shadow-xl">
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "TODO")}>
              To Do
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "IN_PROGRESS")}>
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "IN_REVIEW")}>
              In Review
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "DONE")}>
              Done
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "REJECTED")}>
              Rejected
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "BACKLOG")}>
              Backlog
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlineStatusChange(taskId, "ARCHIVED")}>
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger disabled={!canMutate} asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-7 rounded-full border-0 px-3 py-0 text-[11px] font-bold tracking-tight uppercase shadow-sm",
                task.priority === "URGENT" &&
                  "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15",
                task.priority === "HIGH" &&
                  "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15",
                task.priority === "MEDIUM" &&
                  "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15",
                task.priority === "LOW" &&
                  "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
              )}>
              {task.priority || "MEDIUM"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="rounded-xl border-border/50 shadow-xl">
            <DropdownMenuItem
              onClick={() => handleInlinePriorityChange(taskId, "URGENT")}>
              Urgent
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlinePriorityChange(taskId, "HIGH")}>
              High
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlinePriorityChange(taskId, "MEDIUM")}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleInlinePriorityChange(taskId, "LOW")}>
              Low
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        {task.dueDate ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              isOverdue ? "text-rose-600" : "text-muted-foreground/90",
            )}>
            {isOverdue && <AlertCircle className="size-3.5 fill-rose-600/10" />}
            <span className={cn(isOverdue && "font-bold tracking-tight")}>
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 tracking-widest">
            --/--
          </span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs font-medium text-muted-foreground/70 truncate max-w-[120px] block">
          {getProjectName(task)}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted focus-visible:ring-0">
              <MoreHorizontal className="size-4 text-muted-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border-border/50 shadow-2xl p-1.5 slide-in-from-right-2">
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10"
              asChild
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("taskId", tid(task));
                router.push(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
                openPanel(tid(task));
              }}>
              <span className="flex items-center">
                <Eye className="mr-2.5 size-4 text-muted-foreground" />
                <span className="text-sm font-medium">View Details</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTask(task);
              }}>
              <Pencil className="mr-2.5 size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Edit Task
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2 bg-border/40" />
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(taskId);
              }}>
              <Trash2 className="mr-2.5 size-4" />
              <span className="text-sm font-bold">Delete Task</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

