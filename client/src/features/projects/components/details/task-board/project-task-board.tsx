
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Filter, ChevronDown, Kanban, List, Table as TableIcon, Plus, X, Calendar, User, EyeOff, Eye, ChevronRight, LayoutGrid, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import {
  DragDropContext,
  DropResult
} from "@hello-pangea/dnd";
import {
  useTasksQuery,
  useUpdateTaskStatusMutation,
} from "@/features/tasks/hooks/use-tasks-query";
import { ProjectTaskColumn } from "./project-task-column";
import { Task, TaskStatus } from "@/types/task.types";
import { cn } from "@/lib/utils";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { resolveStatus } from "@/features/tasks/utils/resolve-status";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { useTagsQuery } from "@/features/tags/hooks/use-tags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ProjectTaskCard } from "./project-task-card";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-navigation";
import { buildSnapshotTaskPanelContext } from "@/features/tasks/utils/task-panel-navigation";

interface ProjectTaskBoardProps {
  projectId: string;
  defaultAssigneeIds?: string[];
}

export function ProjectTaskBoard({ projectId, defaultAssigneeIds = [] }: ProjectTaskBoardProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list" | "table">("board");
  const [hideEmptyColumns, setHideEmptyColumns] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  
  // Mobile Specific State
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [mobileActiveStatus, setMobileActiveStatus] = useState<string>("");

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [creatorFilter, setCreatorFilter] = useState<string>("ALL");
  const [dueDateFilter, setDueDateFilter] = useState<string>("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  
  // Sorting State
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { activeOrg, activeOrgId } = useAuth();
  const canEdit = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || activeOrg?.role === "MANAGER";
  const { openPanel } = useTaskPanelStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: tasksResult, isLoading } = useTasksQuery({
    projectId,
    limit: 1000,
    search: search || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
    assigneeId: assigneeFilter !== "ALL" ? assigneeFilter : undefined,
    creatorId: creatorFilter !== "ALL" ? creatorFilter : undefined,
    dueDate: dueDateFilter || undefined,
    tagIds: tagFilters.length > 0 ? tagFilters : undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined
  });

  const { data: statuses = [] } = useStatusesQuery();
  const { data: membersResult } = useOrganizationMembersQuery(activeOrgId || "");
  const { data: tagsResult } = useTagsQuery(activeOrgId || "");
  const updateStatus = useUpdateTaskStatusMutation();

  const tasks = tasksResult?.data.items || [];
  const members = membersResult?.data.members || [];
  const tags = tagsResult?.data || [];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (priorityFilter !== "ALL") count++;
    if (assigneeFilter !== "ALL") count++;
    if (creatorFilter !== "ALL") count++;
    if (dueDateFilter) count++;
    if (tagFilters.length > 0) count++;
    return count;
  }, [statusFilter, priorityFilter, assigneeFilter, creatorFilter, dueDateFilter, tagFilters]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const sortedStatuses = [...statuses].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedStatuses.forEach(s => {
      groups[s.id || (s as any)._id] = [];
    });

    tasks.forEach(task => {
      const statusObj = resolveStatus(task, statuses);
      if (statusObj) {
        const statusId = statusObj.id || (statusObj as any)._id;
        if (groups[statusId]) {
          groups[statusId].push(task);
        }
      }
    });

    // Final filter for empty columns if requested
    const finalStatuses = hideEmptyColumns
      ? sortedStatuses.filter(s => {
        const id = s.id || (s as any)._id;
        const totalCount = tasksResult?.data.groupedStatusCounts?.[id] || groups[id]?.length || 0;
        return totalCount > 0;
      })
      : sortedStatuses;

    const displayedStatuses = finalStatuses.length === 0 && sortedStatuses.length > 0
      ? [sortedStatuses[0]]
      : finalStatuses;

    return { groups, sortedStatuses: displayedStatuses };
  }, [tasks, statuses, hideEmptyColumns]);

  // Set default mobile status
  useEffect(() => {
    if (groupedTasks.sortedStatuses.length > 0 && !mobileActiveStatus) {
      const firstStatus = groupedTasks.sortedStatuses[0];
      setMobileActiveStatus(firstStatus.id || (firstStatus as any)._id);
    }
  }, [groupedTasks.sortedStatuses, mobileActiveStatus]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      await updateStatus.mutateAsync({
        id: draggableId,
        status: destination.droppableId as TaskStatus
      });
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const activeMobileStatus = groupedTasks.sortedStatuses.find(s => (s.id || (s as any)._id) === mobileActiveStatus) || groupedTasks.sortedStatuses[0];
	  const openTaskDetails = (task: Task, sourceLabel: string, scopeTasks: Task[]) => {
	    const taskId = String(task.id || (task as any)._id || "");
	    const params = new URLSearchParams(searchParams.toString());
	    params.set("taskId", taskId);
	    openPanel(
	      taskId,
	      buildSnapshotTaskPanelContext({
	        sourceKey: `project-task-board:${projectId}:${sourceLabel}`,
	        sourceLabel,
	        tasks: scopeTasks,
	      }),
	    );
	    router.push(`${pathname}?${params.toString()}`, { scroll: false });
	  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2 md:gap-4">
      {/* COMPACT TOOLBAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2 md:gap-3 w-full md:flex-1 md:max-w-xl">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Search tasks..."
              className="pl-9 h-8 md:h-9 text-xs bg-muted/30 border-border/10 focus:ring-primary/20 rounded-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <CreateTaskModal
            defaultProjectId={projectId}
            defaultAssigneeIds={defaultAssigneeIds}
            trigger={
              <Button
                size="sm"
                className="h-8 md:h-9 text-xs px-3 rounded-card gap-2"
              >
                <Plus className="size-3.5" />
                <span className="hidden xs:inline">Add Task</span>
              </Button>
            }
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {/* HIDE EMPTY TOGGLE - Desktop Only or Icon only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 text-[10px] px-2 rounded-card gap-2 font-bold uppercase tracking-wider transition-all shrink-0",
              hideEmptyColumns ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            onClick={() => setHideEmptyColumns(!hideEmptyColumns)}
          >
            {hideEmptyColumns ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            <span className="hidden sm:inline">{hideEmptyColumns ? "Empty Hidden" : "Show Empty"}</span>
          </Button>

          {/* FILTERS */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-card border-border/10 gap-2 relative shrink-0">
                <Filter className="size-3.5" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-primary text-[9px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-auto" style={{ width: 541 }}>
              <SheetHeader className="pb-4 border-b border-border/10">
                <SheetTitle className="text-xl font-bold tracking-tight">Project Filters</SheetTitle>
                <SheetDescription>Narrow down tasks in this project.</SheetDescription>
              </SheetHeader>

              <div className="py-6 space-y-6">
                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    ...statuses.map(s => ({ value: s.id || (s as any)._id, label: s.name }))
                  ]}
                />

                <FilterSelect
                  label="Priority"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: "ALL", label: "All Priorities" },
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                    { value: "URGENT", label: "Urgent" }
                  ]}
                />

                <FilterSelect
                  label="Assignee"
                  value={assigneeFilter}
                  onChange={setAssigneeFilter}
                  options={[
                    { value: "ALL", label: "All Members" },
                    ...members.map(m => ({ value: String(m.id), label: `${m.firstName} ${m.lastName}` }))
                  ]}
                />

                <FilterSelect
                  label="Creator"
                  value={creatorFilter}
                  onChange={setCreatorFilter}
                  options={[
                    { value: "ALL", label: "All Creators" },
                    ...members.map(m => ({ value: String(m.id), label: `${m.firstName} ${m.lastName}` }))
                  ]}
                />

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Due Date</label>
                  <Input
                    type="date"
                    className="h-9 text-xs bg-muted/20 border-border/10 rounded-card"
                    value={dueDateFilter}
                    onChange={(e) => setDueDateFilter(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setTagFilters(prev =>
                            prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                          );
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                          tagFilters.includes(tag.id)
                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                            : "bg-muted/50 border-border/10 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-6 border-t border-border/10">
                <Button
                  variant="ghost"
                  className="text-xs font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-500/5"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPriorityFilter("ALL");
                    setAssigneeFilter("ALL");
                    setCreatorFilter("ALL");
                    setDueDateFilter("");
                    setTagFilters([]);
                  }}
                >
                  Reset Filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* SORTING */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs px-3 rounded-card border-border/10 gap-2 shrink-0">
                <ChevronDown className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-card">
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Sort By</DropdownMenuLabel>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortBy === "createdAt" && "bg-muted font-bold")} onClick={() => setSortBy("createdAt")}>Created Date</DropdownMenuItem>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortBy === "dueDate" && "bg-muted font-bold")} onClick={() => setSortBy("dueDate")}>Due Date</DropdownMenuItem>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortBy === "priority" && "bg-muted font-bold")} onClick={() => setSortBy("priority")}>Priority</DropdownMenuItem>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortBy === "title" && "bg-muted font-bold")} onClick={() => setSortBy("title")}>Title</DropdownMenuItem>

              <DropdownMenuSeparator className="my-2 opacity-50" />

              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Direction</DropdownMenuLabel>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortOrder === "asc" && "bg-muted font-bold")} onClick={() => setSortOrder("asc")}>Ascending</DropdownMenuItem>
              <DropdownMenuItem className={cn("text-xs rounded-card", sortOrder === "desc" && "bg-muted font-bold")} onClick={() => setSortOrder("desc")}>Descending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-card border border-border/10 ml-2 shrink-0">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-8 p-0 rounded-button"
              onClick={() => setViewMode("board")}
            >
              <Kanban className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-8 p-0 rounded-button"
              onClick={() => setViewMode("list")}
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-8 p-0 rounded-button"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {viewMode === "board" ? (
        isMobile ? (
          <div className="flex-1 flex flex-col min-h-0 bg-background/50 rounded-card border border-border/10 overflow-hidden">
             {/* Mobile Column Selector */}
             <div className="shrink-0 flex items-center justify-between p-3 border-b border-border/10 bg-muted/20">
               <div className="flex items-center gap-2">
                 <div className="size-2 rounded-full bg-primary animate-pulse" />
                 <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                    {activeMobileStatus?.name.replace(/_/g, ' ') || "STAGE"}
                 </span>
                 <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-primary/20 bg-primary/5 text-primary">
                    {tasksResult?.data.groupedStatusCounts?.[mobileActiveStatus] || groupedTasks.groups[mobileActiveStatus]?.length || 0}
                 </Badge>
               </div>

               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest gap-2 px-2 hover:bg-primary/10 hover:text-primary transition-all">
                       Switch Stage
                       <ChevronDown className="size-3" />
                    </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-56 p-2 rounded-card">
                    {statuses.map(s => {
                      const id = s.id || (s as any)._id;
                      const count = tasksResult?.data.groupedStatusCounts?.[id] || groupedTasks.groups[id]?.length || 0;
                      return (
                        <DropdownMenuItem 
                          key={id} 
                          className={cn("text-xs rounded-card flex justify-between", mobileActiveStatus === id && "bg-muted font-bold")}
                          onClick={() => setMobileActiveStatus(id)}
                        >
                          {s.name.replace(/_/g, ' ')}
                          <span className="text-[10px] text-muted-foreground">{count}</span>
                        </DropdownMenuItem>
                      );
                    })}
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>

	             {/* Mobile Task List */}
	             <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar pb-20">
	                {groupedTasks.groups[mobileActiveStatus]?.map((task) => (
	                   <ProjectTaskCard 
	                      key={task.id} 
	                      task={task} 
	                      index={0}
	                      onClick={(currentTask) =>
                            openTaskDetails(
                              currentTask,
                              activeMobileStatus?.name?.replace(/_/g, " ") || "Stage",
                              groupedTasks.groups[mobileActiveStatus] || [],
                            )
                          }
	                      canEdit={canEdit}
	                      isDraggable={false}
	                   />
                ))}
                {(!groupedTasks.groups[mobileActiveStatus] || groupedTasks.groups[mobileActiveStatus].length === 0) && (
                   <div className="h-40 flex flex-col items-center justify-center gap-3 border border-dashed border-border/10 rounded-card bg-muted/5">
                      <LayoutGrid className="size-8 text-muted-foreground/10" />
                      <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">No tasks in this stage</p>
                   </div>
                )}
             </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar pb-4">
              <div className="flex gap-4 h-full">
                {groupedTasks.sortedStatuses.map((status: any) => (
                  <ProjectTaskColumn
                    key={status.id || status._id}
                    id={status.id || status._id}
	                    title={status.name.replace(/_/g, ' ')}
	                    count={tasksResult?.data.groupedStatusCounts?.[status.id || (status as any)._id] || groupedTasks.groups[status.id || (status as any)._id]?.length || 0}
	                    tasks={groupedTasks.groups[status.id || (status as any)._id] || []}
	                    onTaskClick={(task) =>
                          openTaskDetails(
                            task,
                            status.name.replace(/_/g, " "),
                            groupedTasks.groups[status.id || (status as any)._id] || [],
                          )
                        }
	                    canEdit={canEdit}
	                  />
                ))}
                {groupedTasks.sortedStatuses.length === 0 && !isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 rounded-card border border-dashed border-border/10 h-full">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">No Active Columns</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-1">Try disabling "Empty Hidden" to see all stages.</p>
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        )
      ) : viewMode === "list" ? (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10 pr-1 md:pr-2">
          <div className="flex flex-col gap-2">
            {groupedTasks.sortedStatuses.map((status: any) => {
              const statusId = status.id || status._id;
              const groupTasks = groupedTasks.groups[statusId] || [];
              const statusColor = status.color || "#94a3b8";

              if (hideEmptyColumns && groupTasks.length === 0) return null;

              return (
                <AccordionSection
                  key={statusId}
                  title={status.name.replace(/_/g, ' ')}
                  color={statusColor}
                  count={tasksResult?.data.groupedStatusCounts?.[statusId] || groupTasks.length}
                  defaultOpen={!collapsedGroups.includes(statusId)}
                >
                  <div className="grid gap-2 p-1.5 pt-1">
	                    {groupTasks.map((task) => (
	                      <div
	                        key={task.id}
	                        className="rounded-button border border-border/10 bg-card/40 p-2.5 md:p-3 shadow-sm hover:border-primary/20 transition-all cursor-pointer group/card"
	                        onClick={() => openTaskDetails(task, status.name.replace(/_/g, " "), groupTasks)}
	                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <h4 className="font-bold text-[14px] hover:text-primary transition-colors block line-clamp-1 text-left w-full">
                              {task.title}
                            </h4>
                            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-tighter">
                              {task.taskCode || (task as any).code || `#${String(task.id).slice(-8)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.priority && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "h-4 px-1.5 rounded-full text-[8px] font-bold uppercase",
                                  task.priority === "HIGH" || task.priority === "URGENT" ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-muted-foreground"
                                )}
                              >
                                {String(task.priority)}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="h-5 px-2 rounded-full text-[9px] font-bold uppercase tracking-tight shrink-0 border-none"
                              style={{ 
                                color: statusColor, 
                                backgroundColor: `${statusColor}15` 
                              }}
                            >
                              {status.name.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5 border-t border-border/10 pt-2">
                          <div className="flex items-center gap-2">
                            {task.assigneeUsers && task.assigneeUsers.length > 0 ? (
                              <div className="flex items-center -space-x-2">
                                {task.assigneeUsers.slice(0, 3).map((a) => (
                                  <Avatar key={a.id} className="h-6 w-6 ring-2 ring-background border border-border/10 shadow-sm">
                                    <AvatarImage src={a.avatarUrl} />
                                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary uppercase flex items-center justify-center font-bold">
                                       {a.firstName?.[0] || a.name?.[0] || <User className="size-2.5" />}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {task.assigneeUsers.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold border-2 border-background shadow-sm">
                                    +{task.assigneeUsers.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                <User className="size-3 text-muted-foreground/40" />
                              </div>
                            )}
                            <span className="text-[11px] font-semibold text-muted-foreground truncate" style={{ maxWidth: 121 }}>
                              {(!task.assigneeUsers || task.assigneeUsers.length === 0)
                                ? "Unassigned"
                                : task.assigneeUsers.length === 1
                                  ? task.assigneeUsers[0].name || `${task.assigneeUsers[0].firstName} ${task.assigneeUsers[0].lastName}`
                                  : `${task.assigneeUsers.length} members`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
	                              onClick={(e) => {
	                                e.stopPropagation();
	                                openTaskDetails(task, status.name.replace(/_/g, " "), groupTasks);
	                              }}
	                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // This would trigger delete logic if available
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {groupTasks.length === 0 && (
                      <div className="py-4 text-center border border-dashed border-border/5 rounded-card bg-muted/5">
                        <p className="text-[9px] text-muted-foreground/20 font-bold uppercase">No tasks in this stage</p>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-card/20 rounded-card border border-border/10 shadow-inner-sm custom-scrollbar">
          <table className="w-full border-separate border-spacing-0" style={{ minWidth: 801 }}>
             <thead className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
                <tr>
                   <th className="py-3 pl-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/10">Task</th>
                   <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/10">Assignee</th>
                   <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/10">Status</th>
                   <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/10">Priority</th>
                   <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border-b border-border/10">Due Date</th>
                   <th className="py-3 pr-6 text-right border-b border-border/10"></th>
                </tr>
             </thead>
             <tbody>
	                {tasks.map((task) => {
	                  const statusObj = resolveStatus(task, statuses);
	                  const statusColor = statusObj?.color || "#94a3b8";
	                  return (
	                    <tr 
	                      key={task.id} 
	                      className="group hover:bg-muted/5 cursor-pointer transition-colors"
	                      onClick={() => openTaskDetails(task, "Filtered project tasks", tasks)}
	                    >
                      <td className="py-3 pl-6 border-b border-border/5">
                         <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{task.title}</span>
                            <span className="text-[9px] font-mono text-muted-foreground/40">{task.taskCode || (task as any).code || `#${String(task.id).slice(-8)}`}</span>
                         </div>
                      </td>
                      <td className="py-3 border-b border-border/5">
                        <div className="flex items-center gap-2">
                           {task.assigneeUsers?.[0] ? (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assigneeUsers[0].avatarUrl} />
                                <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                                  {task.assigneeUsers[0].name?.[0] || <User className="size-2.5" />}
                                </AvatarFallback>
                              </Avatar>
                           ) : (
                              <div className="size-6 rounded-full border border-dashed border-border/10 flex items-center justify-center">
                                 <User className="size-3 text-muted-foreground/20" />
                              </div>
                           )}
                           <span className="text-xs text-muted-foreground font-medium">
                              {task.assigneeUsers?.[0]?.name || "Unassigned"}
                           </span>
                        </div>
                      </td>
                      <td className="py-3 border-b border-border/5">
                        <Badge variant="outline" className="h-5 px-2 text-[9px] font-bold border-none" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>
                          {statusObj?.name || "Unknown"}
                        </Badge>
                      </td>
                      <td className="py-3 border-b border-border/5">
                         {task.priority && (
                            <Badge variant="outline" className={cn("h-5 px-2 text-[9px] font-bold", task.priority === "HIGH" ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-muted-foreground")}>
                               {task.priority}
                            </Badge>
                         )}
                      </td>
                      <td className="py-3 border-b border-border/5">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                           <Calendar className="size-3" />
                           {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                        </div>
                      </td>
                      <td className="py-3 pr-6 text-right border-b border-border/5">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><Pencil className="size-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/10 rounded-card">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent className="rounded-card border-border/10">
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AccordionSection({ title, color, count, children, defaultOpen = false }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/10 rounded-card overflow-hidden bg-card/20 shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 md:p-2.5 hover:bg-muted/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <span className="text-[10px] font-bold bg-muted/30 px-2 py-0.5 rounded-full text-muted-foreground">
            {count}
          </span>
        </div>
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-90")} />
      </button>
      {isOpen && (
        <div className="border-t border-border/10 bg-muted/5 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
