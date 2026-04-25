"use client";
// HMR trigger luxury

import { useRouter, useSearchParams, usePathname } from "@/lib/next-navigation";
import React, { useState, useEffect, useMemo } from "react";
import { TaskContextMenu } from "./task-context-menu";
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
  Loader2,
  MoreHorizontal,
  CircleDot,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Trash2,
  X,
  Flag,
  Users,
  User,
  Check,
  Pencil,
  FileText,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";

import { Task, TaskStatus } from "@/types/task.types";
import {
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { useTaskDuplicateSuggestions } from "@/features/tasks/hooks/use-task-duplicate-suggestions";
import { TagPill } from "@/features/tags/components/tag-pill";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { resolveStatus, normalizeId } from "@/features/tasks/utils/resolve-status";

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
  { label: string; color: string; bg: string; flagColor: string }
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
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  isEmbedded?: boolean;
}

const TaskCard = React.memo(({ task, index, canEdit = true, onContextMenu, isEmbedded = false }: TaskCardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openPanel } = useTaskPanelStore();
  const { activeOrgId } = useAuthStore();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const deleteTask = useDeleteTaskMutation();
  const updateTask = useUpdateTaskMutation();
  const changeStatus = useUpdateTaskStatusMutation();
  const { data: dynamicStatuses = [] } = useStatusesQuery();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [openChip, setOpenChip] = useState<
    "status" | "priority" | "date" | "assignee" | null
  >(null);

  const createdByUser = (task as any).creatorUser ?? (task as any).createdBy ?? (task as any).creator ?? (task as any).created_by;
  const createdByName = createdByUser?.firstName
    ? `${createdByUser.firstName} ${createdByUser.lastName}`.trim()
    : createdByUser?.name || "System";
  const createdByEmail = createdByUser?.email || "";

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
  const selectedAssigneeIds = useMemo(() => {
    const fromUsers = (task.assigneeUsers ?? []).map((item) => String(item.id));
    if (fromUsers.length > 0) return fromUsers;

    const rawAssigneeIds = (task as any).assigneeIds;
    if (Array.isArray(rawAssigneeIds) && rawAssigneeIds.length > 0) {
      return rawAssigneeIds.map((id: any) => String(id));
    }

    const rawSingle = (task as any).assigneeId;
    return rawSingle ? [String(rawSingle)] : [];
  }, [task]);
  const members = useMemo(() => {
    const raw = membersQuery.data?.data.members ?? [];
    const byIdentity = new Map<string, { id: string; name: string; email: string; avatarUrl?: string }>();
    raw.forEach((member) => {
      const id = String(member.id);
      const identityKey = member.email?.toLowerCase() || id;
      if (!byIdentity.has(identityKey)) {
        byIdentity.set(identityKey, {
          id,
          name: `${member.firstName} ${member.lastName}`.trim() || member.email,
          email: member.email,
          avatarUrl: member.avatarUrl,
        });
      }
    });
    return Array.from(byIdentity.values());
  }, [membersQuery.data?.data.members]);

  const filteredMembers = useMemo(() => {
    const query = assigneeQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(query),
    );
  }, [members, assigneeQuery]);

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await changeStatus.mutateAsync({ id: tid(task), status });
      toast.success("Status updated");
      setOpenChip(null);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (nextPriority: "LOW" | "MEDIUM" | "HIGH") => {
    try {
      await updateTask.mutateAsync({
        id: tid(task),
        data: { priority: nextPriority },
      });
      toast.success("Priority updated");
      setOpenChip(null);
    } catch {
      toast.error("Failed to update priority");
    }
  };

  const handleDueDateChange = async (value: string) => {
    try {
      await updateTask.mutateAsync({
        id: tid(task),
        data: { dueDate: value || undefined },
      });
      toast.success("Date updated");
      setOpenChip(null);
    } catch {
      toast.error("Failed to update date");
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    const current = selectedAssigneeIds;
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];

    try {
      await updateTask.mutateAsync({
        id: tid(task),
        data: { assigneeIds: next },
      });
      toast.success("Assignees updated");
    } catch {
      toast.error("Failed to update assignee");
    }
  };

  const handleClearAssignees = async () => {
    try {
      await updateTask.mutateAsync({
        id: tid(task),
        data: { assigneeIds: [] },
      });
      toast.success("Assignees cleared");
      setOpenChip(null);
    } catch {
      toast.error("Failed to clear assignees");
    }
  };

  const statusItems = useMemo(() => {
    if (dynamicStatuses.length > 0) {
      return dynamicStatuses.map((s: any) => ({
        value: s.id || s._id,
        label: s.name,
      }));
    }
    return [
      { value: "BACKLOG", label: "Backlog" },
      { value: "TODO", label: "Todo" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "DONE", label: "Done" },
      { value: "REJECTED", label: "Cancelled" },
    ];
  }, [dynamicStatuses]);

  const currentStatusId = typeof task.status === 'object' ? (task.status as any).id || (task.status as any)._id : task.status;
  const currentStatus = dynamicStatuses.find((s: any) => (s.id || s._id) === currentStatusId) || 
                       dynamicStatuses.find((s: any) => s.name.toLowerCase() === String(currentStatusId).toLowerCase());
  
  const statusLabel = currentStatus?.name || (typeof task.status === 'object' ? (task.status as any).name : String(task.status).toLowerCase().replace("_", " "));
  const statusColor = currentStatus?.color || ALL_STATUS_CONFIG.find((c) => c.id === task.status)?.dotColor || "#94a3b8";

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
            onContextMenu={(e) => {
              if (canEdit) {
                e.preventDefault();
                onContextMenu(e, tid(task));
              }
            }}
            className={cn(
              "group relative flex flex-col gap-2 border bg-card mx-0.5 transition-all duration-300 ease-in-out select-none",
              isEmbedded ? "rounded-[1.5rem] p-4 border-border/10 shadow-sm" : "rounded-xl p-3 border-border/40 shadow-sm",
              "hover:-translate-y-1 hover:bg-white/2 hover:shadow-md",
              snapshot.isDragging
                ? "shadow-2xl border-primary/20 ring-1 ring-primary/10 scale-[1.02] z-50 bg-accent rounded-3xl"
                : "cursor-grab active:cursor-grabbing",
            )}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("taskId", tid(task));
              router.push(`${pathname}?${params.toString()}`, { scroll: false });
              openPanel(tid(task));
            }}>
            {/* Task ID Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                  T-{tid(task).slice(-4)}
                </span>
                {task.isDraft && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">
                    <Sparkles className="size-2 text-indigo-400" />
                    Draft
                  </div>
                )}
              </div>
            </div>
              {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-30 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-lg transition-all"
                  >
                    <MoreHorizontal className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("taskId", tid(task));
                      router.push(`${pathname}?${params.toString()}`, { scroll: false });
                      openPanel(tid(task));
                    }}>
                    <Eye className="mr-2 size-4" />
                    View Details
                  </DropdownMenuItem>
                  {canEdit ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditOpen(true);
                      }}>
                      Edit Task
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit ? <DropdownMenuSeparator /> : null}
                  {canEdit ? (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOpen(true);
                      }}>
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu> */}

            {/* Title */}
            <p className={cn(
              "leading-[1.4] text-foreground/90 line-clamp-2 tracking-tight",
              isEmbedded ? "text-[14px] font-black" : "text-[13px] font-semibold"
            )}>
              {task.title}
            </p>

            {/* Metadata Footer */}
            <div className={cn(
              "flex items-center flex-wrap mt-2",
              isEmbedded ? "gap-2.5" : "gap-2"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0 cursor-default">
                    <Avatar className="h-5 w-5 rounded-full border border-border/20 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                      <AvatarImage src={createdByUser?.avatarUrl} alt={createdByName} />
                      <AvatarFallback className="text-[7px] bg-muted text-muted-foreground font-bold">
                        {createdByName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="flex flex-col gap-0.5 p-2 rounded-lg border-border/40 bg-card/95 backdrop-blur-md shadow-xl z-[100]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Created By</span>
                  <span className="text-xs font-semibold">{createdByName}</span>
                  {createdByEmail && <span className="text-[11px] text-muted-foreground font-medium">{createdByEmail}</span>}
                </TooltipContent>
              </Tooltip>

              <DropdownMenu
                open={openChip === "status"}
                onOpenChange={(open) => setOpenChip(open ? "status" : null)}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "inline-flex items-center gap-1.5 transition-all",
                      isEmbedded 
                        ? "px-2.5 py-1.5 rounded-xl text-[9px] font-black border border-border/10 bg-muted/10 text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground uppercase tracking-wider"
                        : "px-2 py-1 rounded-full text-[10px] font-bold border border-border/40 bg-muted/50 text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isEmbedded && "shadow-[0_0_5px_currentColor]"
                      )}
                      style={{
                        backgroundColor: statusColor,
                      }}
                    />
                    <span className={cn(!isEmbedded && "capitalize")}>{statusLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-lg border-border/40">
                  {statusItems.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(item.value);
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {currentStatusId === item.value ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu
                open={openChip === "priority"}
                onOpenChange={(open) => setOpenChip(open ? "priority" : null)}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center justify-center transition-all",
                      isEmbedded 
                        ? "p-2 rounded-xl border border-border/10 bg-muted/10 hover:bg-muted/20 active:scale-90"
                        : "p-1.5 rounded-md border border-border/20 bg-muted/30 hover:bg-muted/50",
                      priority.color,
                    )}
                  >
                    <Flag className={isEmbedded ? "size-3.5" : "size-3"} fill="currentColor" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40 rounded-lg border-border/40">
                  {[
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                  ].map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePriorityChange(item.value as "LOW" | "MEDIUM" | "HIGH");
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {task.priority === item.value ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover
                open={openChip === "date"}
                onOpenChange={(open) => setOpenChip(open ? "date" : null)}>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center gap-1.5 transition-all",
                      isEmbedded 
                        ? "text-[9px] font-black px-2.5 py-1.5 rounded-xl border border-border/10 bg-muted/10 text-muted-foreground/60 hover:bg-muted/20 hover:text-foreground uppercase tracking-wider"
                        : "text-[10px] font-bold px-1.5 py-1 rounded-md border border-border/20 bg-muted/20 text-muted-foreground hover:bg-muted/40",
                      isPastDue && (isEmbedded ? "text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]" : "text-rose-400 bg-rose-500/10"),
                    )}
                  >
                    <Calendar className={cn("opacity-60", isEmbedded ? "size-3" : "size-3")} />
                    <span>{dueDate || "+ Date"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto p-0 border-border/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DatePicker
                    inline
                    value={task.dueDate}
                    onChange={(val) => handleDueDateChange(typeof val === "string" ? val : "")}
                  />
                </PopoverContent>
              </Popover>

              <Popover
                open={openChip === "assignee"}
                onOpenChange={(open) => {
                  setOpenChip(open ? "assignee" : null);
                  if (!open) setAssigneeQuery("");
                }}>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "ml-auto flex items-center gap-1.5 transition-all active:scale-95",
                      isEmbedded 
                        ? "rounded-xl border border-border/10 bg-muted/10 px-2.5 py-1.5 hover:bg-muted/20 shadow-sm"
                        : "rounded-full border border-border/30 bg-muted/20 px-1.5 py-1 hover:bg-muted/40"
                    )}
                  >
                    {assignees.length > 0 ? (
                      <div className="flex items-center -space-x-2 overflow-visible">
                        {assignees.slice(0, 3).map((item) => (
                          <Avatar key={item.id} className={cn("ring-background shadow-sm", isEmbedded ? "h-5 w-5 ring-2 border border-border/10" : "h-5 w-5 ring-1")}>
                            <AvatarImage src={item.avatarUrl} alt={item.name} />
                            <AvatarFallback className={cn("text-[8px] text-primary", isEmbedded ? "bg-primary/10 font-black" : "bg-primary/15 font-bold")}>
                              {item.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : (
                      isEmbedded ? (
                        <div className="p-1 rounded-full bg-muted/20">
                          <User className="size-3 text-muted-foreground/40" />
                        </div>
                      ) : (
                        <Users className="size-3 text-muted-foreground" />
                      )
                    )}
                    {assignees.length > 3 ? (
                      <span className={isEmbedded ? "text-[9px] font-black text-muted-foreground/40" : "text-[10px] text-muted-foreground"}>+{assignees.length - 3}</span>
                    ) : null}
                    {assignees.length === 0 ? (
                      <span className={cn(
                        isEmbedded ? "text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest" : "text-[10px] text-muted-foreground"
                      )}>+ Assign</span>
                    ) : null}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-60 rounded-lg border-border/40 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <Input
                      value={assigneeQuery}
                      onChange={(e) => setAssigneeQuery(e.target.value)}
                      placeholder="Search members..."
                      className="h-8 border-border/40 bg-muted/20 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                    <div className="max-h-52 overflow-y-auto rounded-md border border-border/30 bg-background/80 p-1">
                      {filteredMembers.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">No member found.</div>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleAssigneeChange(member.id)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40 transition-colors"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.avatarUrl} alt={member.name} />
                              <AvatarFallback className="text-[9px]">{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate">{member.name}</span>
                              <span className="block truncate text-[11px] text-muted-foreground/80">{member.email}</span>
                            </div>
                            {selectedAssigneeIds.includes(member.id) ? <Check className="size-3.5 text-primary" /> : null}
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAssignees}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <span>Unassign</span>
                      {selectedAssigneeIds.length === 0 ? <Check className="size-3.5 text-primary" /> : null}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Professional Tags Display */}
            {Array.isArray(task.tags) && task.tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 mt-1.5 min-h-[18px]">
                {task.tags.slice(0, 2).map((tag: any, i: number) => {
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
                      className="px-1.5 py-0 h-4.5 text-[9px] gap-1 font-bold border-none"
                    />
                  );
                })}
                {task.tags.length > 2 && (
                  <span className="text-[9px] font-bold text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default pl-0.5">
                    +{task.tags.length - 2} more
                  </span>
                )}
              </div>
            ) : null}

            {/* Action Buttons Row - Only visible on mobile/touch, hidden on desktop as we have context menu */}
            <div className="flex lg:hidden flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/10 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 px-2 gap-1.5 rounded-lg text-[10px] font-bold border-border/40 bg-muted/5 text-muted-foreground hover:bg-muted/10 hover:text-foreground active:scale-95 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("taskId", tid(task));
                  router.push(`${pathname}?${params.toString()}`, { scroll: false });
                  openPanel(tid(task));
                }}
              >
                <Eye className="size-3.5" />
                <span>View</span>
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 px-2 gap-1.5 rounded-lg text-[10px] font-bold border-border/40 bg-muted/5 text-muted-foreground hover:bg-muted/10 hover:text-foreground active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  <span>Edit</span>
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 px-2 gap-1.5 rounded-lg text-[10px] font-bold border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Draggable>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl border-border/10 max-w-100">
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
  const { user } = useAuthStore();
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
  isEmbedded?: boolean;
}

export function TaskBoard({
  tasks: initialTasks,
  projectId,
  canEdit = true,
  isEmbedded = false,
}: TaskBoardProps) {
  const { data: dynamicStatuses, isLoading: isLoadingStatuses } = useStatusesQuery();

  const boardColumns = useMemo(() => {
    if (!dynamicStatuses || dynamicStatuses.length === 0) {
      return ALL_STATUS_CONFIG;
    }
    
    // Sort by order
    const sorted = [...dynamicStatuses].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    
    const cols = sorted.map((s: any) => {
      const id = normalizeId(s.id || s._id) || "";
      const normalizedName = s.name.toLowerCase().replace(/[\s_-]/g, "");
      const configMatch = ALL_STATUS_CONFIG.find(c => 
        c.label.toLowerCase().replace(/[\s_-]/g, "") === normalizedName
      );
      const isCore = ["backlog", "todo", "inprogress", "done"].includes(normalizedName);
      const isExplicitHide = ["inreview", "review", "archived", "rejected", "cancelled"].includes(normalizedName);

      let isHidden = s.isHiddenIfEmpty;
      if (isHidden === undefined) {
        isHidden = !isCore;
      } else if (isExplicitHide) {
        isHidden = true;
      }

      return {
        id,
        label: s.name,
        icon: configMatch?.icon || Circle,
        dotColor: s.color || configMatch?.dotColor || "#3b82f6",
        isHiddenIfEmpty: isHidden,
      };
    });

    // PREPEND DRAFT COLUMN
    return [
      {
        id: "DRAFT_COLUMN",
        label: "Drafts",
        icon: FileText,
        dotColor: "#94a3b8",
        isHiddenIfEmpty: true, // Only show if user has drafts
      },
      ...cols
    ];
  }, [dynamicStatuses]);

  // Derived grouping from props (used when NOT syncing)
  const groupedData = useMemo(() => {
    const tasks: Record<string, Task> = {};
    const columns: Record<string, string[]> = {};
    
    // Initialize all columns from the current board config
    boardColumns.forEach((c) => {
      columns[c.id] = [];
    });

    initialTasks.forEach((t) => {
      const id = normalizeId(t.id || (t as any)._id) || "";
      tasks[id] = t;
      
      // IF DRAFT, PUT IN DRAFT COLUMN
      if (t.isDraft) {
        if (columns["DRAFT_COLUMN"]) {
          columns["DRAFT_COLUMN"].push(id);
        }
        return;
      }

      const resolved = resolveStatus(t, dynamicStatuses);
      const statusId = resolved ? (normalizeId(resolved._id) || normalizeId(resolved.id)) : normalizeId(t.status);

      if (statusId && columns[statusId]) {
        columns[statusId].push(id);
      } else if (statusId) {
        // Fallback for robust matching if strict ID comparison fails
        const matchedCol = boardColumns.find(c => 
          normalizeId(c.id) === statusId || 
          (c.id !== "DRAFT_COLUMN" && c.label.toLowerCase().replace(/[\s_-]/g, "") === String(statusId).toLowerCase().replace(/[\s_-]/g, ""))
        );
        if (matchedCol) {
          const mId = normalizeId(matchedCol.id);
          if (mId && columns[mId]) {
            columns[mId].push(id);
          }
        }
      }
    });

    return { tasks, columns };
  }, [initialTasks, boardColumns]);

  // Local state for optimistic updates during drag and drop
  const [optimisticData, setOptimisticData] = useState<{
    tasks: Record<string, Task>;
    columns: Record<string, string[]>;
  } | null>(null);

  // The final data to render (prefer optimistic data if syncing)
  const data = optimisticData || groupedData;

  // --- 3. APPLY VISIBILITY FILTER (AFTER GROUPING) ---
  const visibleColumns = useMemo(() => {
    // Helper to enforce string comparison
    const normalizeId = (id: any) => id?.toString();

    const cols = boardColumns.filter((col) => {
      const colId = normalizeId(col.id);
      const tasksInColumn = data.columns[colId] || [];
      const hasTasks = tasksInColumn.length > 0;
      
      // ALWAYS show if tasks exist
      if (hasTasks) return true;
      
      // Hide only if explicitly allowed (isHiddenIfEmpty = true)
      if (col.isHiddenIfEmpty) return false;
      
      return true;
    });

    // ⚠️ EDGE CASE HANDLING: If all filtered columns are empty, still show at least one primary column (e.g. Backlog or Todo)
    if (cols.length === 0 && boardColumns.length > 0) {
      const primaryFallback = boardColumns.find(c => !c.isHiddenIfEmpty);
      return [primaryFallback || boardColumns[0]];
    }

    return cols;
  }, [data.columns, boardColumns]);

  const changeStatus = useUpdateTaskStatusMutation();
  const updateTask = useUpdateTaskMutation();
  const createTask = useCreateTaskMutation();
  const deleteTask = useDeleteTaskMutation();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openPanel } = useTaskPanelStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Clear optimistic data when props change and we are NOT syncing
  useEffect(() => {
    if (!isSyncing) {
      setOptimisticData(null);
    }
  }, [initialTasks, isSyncing]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const prevData = { ...data };
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const newColumns = { ...data.columns };
    const sourceTaskIds = Array.from(newColumns[sourceColId]);
    sourceTaskIds.splice(source.index, 1);
    const destTaskIds =
      sourceColId === destColId
        ? sourceTaskIds
        : Array.from(newColumns[destColId]);
    destTaskIds.splice(destination.index, 0, draggableId);
    newColumns[sourceColId] = sourceTaskIds;
    newColumns[destColId] = destTaskIds;

    const newTasks = { ...data.tasks };
    if (sourceColId !== destColId) {
      newTasks[draggableId] = {
        ...newTasks[draggableId],
        status: destColId as TaskStatus,
      };
    }

    setOptimisticData({ tasks: newTasks, columns: newColumns });
    setIsSyncing(true);

    try {
      // IF MOVING OUT OF DRAFT_COLUMN, AUTO-PUBLISH
      if (sourceColId === "DRAFT_COLUMN" && destColId !== "DRAFT_COLUMN") {
        await updateTask.mutateAsync({
          id: draggableId,
          data: {
            status: destColId as TaskStatus,
            isDraft: false,
            isPublic: true,
            position: destination.index
          }
        });
      } 
      // IF MOVING INTO DRAFT_COLUMN, UNPUBLISH
      else if (sourceColId !== "DRAFT_COLUMN" && destColId === "DRAFT_COLUMN") {
        await updateTask.mutateAsync({
          id: draggableId,
          data: {
            isDraft: true,
            isPublic: false,
            position: destination.index
          }
        });
      }
      // NORMAL STATUS CHANGE
      else {
        await changeStatus.mutateAsync({
          id: draggableId,
          status: destColId as TaskStatus,
          position: destination.index,
        });
      }
    } catch (err) {
      setOptimisticData(null);
      toast.error("Failed to sync task move.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoadingStatuses && (!dynamicStatuses || dynamicStatuses.length === 0)) {
    return (
      <div className="flex flex-1 items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-primary opacity-20" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading board columns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-full select-none overflow-hidden">
      <div className={cn(
        "flex h-full w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-2 transition-all duration-300",
        isEmbedded ? "px-0" : "px-0" // We handle padding in the flex container
      )}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={cn(
            "flex gap-4 h-full min-w-max",
            isEmbedded ? "p-0 pt-4" : "p-4 pr-12"
          )}>
            {visibleColumns.map((col) => {
              const columnTasks = data.columns[col.id]?.map(
                (id) => data.tasks[id],
              ) || [];
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={columnTasks}
                  canEdit={canEdit}
                  projectId={projectId}
                  onContextMenu={(e, id) => setContextMenu({ x: e.clientX, y: e.clientY, taskId: id })}
                  isEmbedded={isEmbedded}
                />
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {contextMenu && (
        <TaskContextMenu
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onOpen={handleOpen}
          onOpenNewTab={handleOpenNewTab}
          onEdit={(id) => setEditingTaskId(id)}
          onDuplicate={handleDuplicate}
          onCopyLink={handleCopyLink}
          onDelete={handleDelete}
        />
      )}

      {editingTaskId && data.tasks[editingTaskId] && (
        <EditTaskModal
          task={data.tasks[editingTaskId]}
          open={!!editingTaskId}
          onOpenChange={(open) => !open && setEditingTaskId(null)}
        />
      )}
    </div>
  );
}

// --- Kanban Column Component -------------------------------------------------

function KanbanColumn({
  col,
  tasks,
  canEdit,
  projectId,
  onContextMenu,
  isEmbedded = false,
}: {
  col: ColumnDef;
  tasks: Task[];
  canEdit: boolean;
  projectId?: string;
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  isEmbedded?: boolean;
}) {
  const [isQuickAdd, setQuickAdd] = useState(false);

  return (
    <div className={cn(
      "group flex flex-col w-80 shrink-0 rounded-[2rem] border h-full overflow-hidden transition-all duration-300 shadow-sm",
      isEmbedded 
        ? "bg-muted/5 border-border/20 ring-1 ring-border/5" 
        : "bg-muted/10 border-border/50"
    )}>
      {/* Sticky Column Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-6 shrink-0 border-b border-border/20",
        isEmbedded ? "bg-muted/10 backdrop-blur-sm" : "bg-muted/20"
      )}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]"
            style={{ backgroundColor: col.dotColor }}
          />
          <h3 className="text-[14px] font-black tracking-tight text-foreground/70 lowercase first-letter:uppercase truncate">
            {col.label}
          </h3>
          <Badge variant="outline" className="h-5 px-1.5 rounded-md text-[10px] font-black bg-muted/20 border-border/20 text-muted-foreground/50">
            {tasks.length}
          </Badge>
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
              snapshot.isDraggingOver ? "bg-white/1" : "bg-transparent",
            )}>
            <div className="space-y-2.5">
              {tasks.map((task, index) => (
                <TaskCard
                  key={tid(task)}
                  task={task}
                  index={index}
                  canEdit={canEdit}
                  onContextMenu={onContextMenu}
                  isEmbedded={isEmbedded}
                />
              ))}
            </div>

            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/2 py-12 opacity-20 mt-2 mx-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  No tasks
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Sticky "Add Task" area at bottom */}
      <div className={cn(
        "shrink-0 p-3 bg-transparent",
        isEmbedded && "px-4 pb-4"
      )}>
        {isQuickAdd ? (
          <QuickAddInput
            projectId={projectId}
            status={col.id}
            onDone={() => setQuickAdd(false)}
          />
        ) : (
          <button
            onClick={() => setQuickAdd(true)}
            className="group flex items-center justify-start gap-3 w-full h-11 px-4 rounded-[1.25rem] text-muted-foreground/30 transition-all hover:bg-muted hover:text-foreground active:scale-[0.98]">
            <Plus className="size-4 transition-transform group-hover:scale-110" />
            <span className="text-[12px] font-black tracking-tight uppercase">
              New work item
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

