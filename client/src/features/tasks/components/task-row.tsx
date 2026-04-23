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
import {Badge} from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";
import {TagPill} from "@/features/tags/components/tag-pill";
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
import { ChevronRight, Clock, User, Calendar, Tag, Folder, Hash } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

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

  const [isExpanded, setIsExpanded] = useState(false);

  const createdByUser =
    (task as any).createdBy ?? (task as any).creator ?? (task as any).created_by;
  const createdByName =
    createdByUser?.name ||
    [createdByUser?.firstName, createdByUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "System";
  const createdByEmail = createdByUser?.email || "";
  const createdAt = task.createdAt;
  const tags = task.tags || [];

  return (
    <TableRow
      key={taskId || `task-${idx}`}
      className="group border-b border-border/30 last:border-0 hover:bg-muted/5 transition-all h-16">
      <TableCell className="py-4 pl-6">
        <div className="flex flex-col gap-0.5 min-w-[140px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const params = new URLSearchParams(searchParams.toString());
              params.set("taskId", tid(task));
              router.push(`${pathname}?${params.toString()}`, {scroll: false});
              openPanel(tid(task));
            }}
            className="font-semibold text-[14px] md:text-[15px] hover:text-primary transition-colors line-clamp-1 cursor-pointer text-left">
            {task.title}
          </button>
          <span className="text-[10px] font-mono text-muted-foreground/60">
            #{taskId.slice(-6).toUpperCase()}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 md:gap-3">
          <Avatar className="h-7 w-7 md:h-8 md:w-8 rounded-lg shadow-sm">
            <AvatarImage src={assignee?.avatarUrl} />
            <AvatarFallback className="bg-primary/5 text-primary text-[10px] md:text-xs font-bold rounded-lg border border-primary/10">
              {assignee?.name.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-medium text-foreground/90 whitespace-nowrap">
            {assignee?.name || "Unassigned"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger disabled={!canMutate} asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              className={cn(
                "h-7 rounded-full border-0 px-3 py-0 text-[10px] font-bold tracking-tight uppercase shadow-sm whitespace-nowrap",
                task.status === "DONE" && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
                task.status === "IN_PROGRESS" && "bg-blue-500/10 text-blue-600 hover:bg-blue-500/15",
                task.status === "IN_REVIEW" && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15",
                task.status === "REJECTED" && "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15",
                ["TODO", "BACKLOG", "ARCHIVED"].includes(task.status || "") && "bg-slate-500/10 text-slate-600 hover:bg-slate-500/15",
              )}>
              {(task.status || "TODO").replace("_", " ")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl border-border/50 shadow-xl">
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "TODO")}>To Do</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "IN_PROGRESS")}>In Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "IN_REVIEW")}>In Review</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "DONE")}>Done</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "REJECTED")}>Rejected</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "BACKLOG")}>Backlog</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlineStatusChange(taskId, "ARCHIVED")}>Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger disabled={!canMutate} asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              className={cn(
                "h-7 rounded-full border-0 px-3 py-0 text-[10px] font-bold tracking-tight uppercase shadow-sm",
                task.priority === "URGENT" && "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15",
                task.priority === "HIGH" && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15",
                task.priority === "MEDIUM" && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15",
                task.priority === "LOW" && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
              )}>
              {task.priority || "MEDIUM"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl border-border/50 shadow-xl">
            <DropdownMenuItem onClick={() => handleInlinePriorityChange(taskId, "URGENT")}>Urgent</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlinePriorityChange(taskId, "HIGH")}>High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlinePriorityChange(taskId, "MEDIUM")}>Medium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleInlinePriorityChange(taskId, "LOW")}>Low</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help group/creator">
               <Avatar className="h-6 w-6 rounded-md border border-border/40 transition-shadow group-hover/creator:shadow-sm">
                <AvatarImage src={createdByUser?.avatarUrl} />
                <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-bold">
                  {createdByName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold whitespace-nowrap group-hover/creator:text-primary transition-colors">{createdByName}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col gap-0.5 p-2 rounded-lg border-border/40 bg-card/95 backdrop-blur-md shadow-xl z-[100]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Created By</span>
            <span className="text-xs font-semibold">{createdByName}</span>
            {createdByEmail && <span className="text-[11px] text-muted-foreground font-medium">{createdByEmail}</span>}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : "Unknown"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs font-medium text-muted-foreground/70 truncate max-w-[120px] block">
          {getProjectName(task)}
        </span>
      </TableCell>
      <TableCell>
        {task.dueDate ? (
          <div className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors", isOverdue ? "text-rose-600" : "text-muted-foreground/90")}>
            <span className={cn(isOverdue && "font-bold tracking-tight")}>
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 tracking-widest">--/--</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {tags.length > 0 ? (
            tags.map((tag: any, i: number) => {
              const isObject = typeof tag === "object" && tag !== null;
              const label = isObject ? tag.label : tag;
              const color = isObject ? tag.color : "#64748b";
              const icon = isObject ? tag.icon : "Tag";
              
              return (
                <TagPill 
                  key={isObject ? tag.id : i} 
                  label={label} 
                  color={color} 
                  iconName={icon}
                  className="px-1.5 py-0 h-4.5 text-[8px] gap-1 font-bold border-none"
                />
              );
            })
          ) : (
            <span className="text-[10px] text-muted-foreground/40 italic">--</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted focus-visible:ring-0 active:scale-90 transition-all">
              <MoreHorizontal className="size-4.5 text-muted-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50 shadow-2xl p-1.5 slide-in-from-right-2">
            <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10" onClick={() => openPanel(tid(task))}>
              <Eye className="mr-2.5 size-4 text-muted-foreground" />
              <span className="text-sm font-medium">View Details</span>
            </DropdownMenuItem>
            {/* <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10" onClick={() => setSelectedTask(task)}>
              <Pencil className="mr-2.5 size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Edit Task</span>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator className="my-2 bg-border/40" />
            <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer focus:bg-destructive/10 text-destructive focus:text-destructive" onClick={() => setDeleteId(taskId)}>
              <Trash2 className="mr-2.5 size-4" />
              <span className="text-sm font-bold">Delete Task</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

