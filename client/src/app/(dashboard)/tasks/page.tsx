"use client";

import Link from "@/lib/next-link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Kanban,
  List,
  Table as TableIcon,
  Search as SearchIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Filter,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useDeleteTaskMutation,
  useTasksQuery,
} from "@/features/tasks/hooks/use-tasks-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { Task, TaskStatus, TaskPriority } from "@/types/task.types";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "@/lib/next-navigation";
import { TaskRow } from "@/features/tasks/components/task-row";
import { taskApi } from "@/features/tasks/api/task.api";
import {
  generateExcel,
  generatePDF,
  type TaskExportFilters,
} from "@/features/tasks/utils/task-export";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";

const PAGE_SIZE = 10;
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "list" | "kanban" | "table";

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "kanban" ? "kanban" : "list";
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && viewMode === "kanban") {
      setViewMode("list");
    }
  }, [isMobile, viewMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const htmlOverflowY = document.documentElement.style.overflowY;
    const bodyOverflowY = document.body.style.overflowY;
    const shouldLockPageScroll = !isMobile && viewMode === "kanban";

    if (shouldLockPageScroll) {
      document.documentElement.style.overflowY = "hidden";
      document.body.style.overflowY = "hidden";
    }

    return () => {
      document.documentElement.style.overflowY = htmlOverflowY;
      document.body.style.overflowY = bodyOverflowY;
    };
  }, [isMobile, viewMode]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [status, setStatus] = useState<string>(
    searchParams.get("status") || "ALL",
  );
  const [priority, setPriority] = useState<string>(
    searchParams.get("priority") || "ALL",
  );
  const [projectId, setProjectId] = useState<string>(
    searchParams.get("projectId") || "ALL",
  );
  const [assigneeId, setAssigneeId] = useState<string>(
    searchParams.get("assigneeId") || "ALL",
  );
  const [creatorId, setCreatorId] = useState<string>(
    searchParams.get("creatorId") || "ALL",
  );
  const [dueDate, setDueDate] = useState(searchParams.get("dueDate") || "");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { activeOrg, activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const deleteTask = useDeleteTaskMutation();

  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (status !== "ALL") params.set("status", status);
    else params.delete("status");
    if (priority !== "ALL") params.set("priority", priority);
    else params.delete("priority");
    if (projectId !== "ALL") params.set("projectId", projectId);
    else params.delete("projectId");
    if (assigneeId !== "ALL") params.set("assigneeId", assigneeId);
    else params.delete("assigneeId");
    if (creatorId !== "ALL") params.set("creatorId", creatorId);
    else params.delete("creatorId");
    if (dueDate) params.set("dueDate", dueDate);
    else params.delete("dueDate");
    router.replace(`?${params.toString()}`);
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, router]);

  const sharedFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status === "ALL" || !status ? undefined : (status as TaskStatus),
      priority:
        priority === "ALL" || !priority
          ? undefined
          : (priority as TaskPriority),
      projectId: projectId === "ALL" || !projectId ? undefined : projectId,
      assigneeId: assigneeId === "ALL" || !assigneeId ? undefined : assigneeId,
      creatorId: creatorId === "ALL" || !creatorId ? undefined : creatorId,
      dueDate: dueDate || undefined,
    }),
    [debouncedSearch, status, priority, projectId, assigneeId, creatorId, dueDate],
  );

  const listFilters = useMemo(
    () => ({ ...sharedFilters, page, limit: PAGE_SIZE }),
    [sharedFilters, page],
  );
  const kanbanFilters = useMemo(
    () => ({ ...sharedFilters, page: 1, limit: 1000 }),
    [sharedFilters],
  );

  const listQuery = useTasksQuery(listFilters, {
    enabled: viewMode === "list" || viewMode === "table",
  });
  const kanbanQuery = useTasksQuery(kanbanFilters, {
    enabled: viewMode === "kanban" && !isMobile,
  });

  const totalPages = Math.max(1, listQuery.data?.data.meta?.totalPages ?? 1);
  const listRows = listQuery.data?.data.items ?? [];
  const kanbanRows = kanbanQuery.data?.data.items ?? [];

  const getTaskId = (task: Task) => String(task.id || (task as any)._id || "");
  const getAssignee = (task: Task) => task.assigneeUsers?.[0] ?? null;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status !== "ALL") count++;
    if (priority !== "ALL") count++;
    if (projectId !== "ALL") count++;
    if (assigneeId !== "ALL") count++;
    if (creatorId !== "ALL") count++;
    if (dueDate) count++;
    return count;
  }, [status, priority, projectId, assigneeId, creatorId, dueDate]);

  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setProjectId("ALL");
    setAssigneeId("ALL");
    setCreatorId("ALL");
    setDueDate("");
    router.push("?");
  };

  const resolveProjectName = (id?: string) => {
    if (!id || id === "ALL") return "ALL";
    const project = (projectsQuery.data?.data.items ?? []).find(
      (p: any) => String(p.id || p._id) === String(id),
    );
    return project?.name || id;
  };

  const resolveAssigneeName = (id?: string) => {
    if (!id || id === "ALL") return "ALL";
    const member = (membersQuery.data?.data.members ?? []).find(
      (m: any) => String(m.id || m._id) === String(id),
    );
    if (!member) return id;
    return `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email || id;
  };

  const exportFilters: TaskExportFilters = useMemo(
    () => ({
      workspace: activeOrg?.name || "Current Workspace",
      search: debouncedSearch || undefined,
      status: status === "ALL" ? undefined : status,
      priority: priority === "ALL" ? undefined : priority,
      project: resolveProjectName(projectId),
      assignee: resolveAssigneeName(assigneeId),
      dueDate: dueDate || undefined,
    }),
    [
      debouncedSearch,
      activeOrg?.name,
      status,
      priority,
      projectId,
      assigneeId,
      dueDate,
      projectsQuery.data?.data.items,
      membersQuery.data?.data.members,
    ],
  );

  const fetchAllFilteredTasks = async () => {
    const limit = 250;
    let currentPage = 1;
    const allTasks: Task[] = [];

    while (true) {
      const response = await taskApi.getTasks({
        ...sharedFilters,
        page: currentPage,
        limit,
      });

      const items = response.data.items ?? [];
      allTasks.push(...items);

      if (!response.data.meta?.hasNextPage || items.length === 0) break;
      currentPage += 1;
    }

    return allTasks;
  };

  const handleExport = async (format: "pdf" | "excel") => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const tasks = await fetchAllFilteredTasks();
      if (tasks.length === 0) {
        toast.info("No tasks available for export with the current filters.");
        return;
      }

      if (format === "pdf") {
        await generatePDF(tasks, exportFilters);
      } else {
        await generateExcel(tasks);
      }

      toast.success(`Tasks exported as ${format === "pdf" ? "PDF" : "Excel"}.`);
    } catch {
      toast.error("Failed to export tasks. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const FilterContent = ({ isMobileView = false }) => (
    <div className={cn("flex flex-col h-full", !isMobileView && "max-h-[480px]")}>
      <div className={cn("flex-1 overflow-y-auto pr-1 space-y-4 pt-1 pb-4 custom-scrollbar")}>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Project</label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="ALL">All Projects</SelectItem>
              {(projectsQuery.data?.data.items ?? []).map((p: any) => (
                <SelectItem key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Assignee</label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="ALL">All Assignees</SelectItem>
              {(membersQuery.data?.data.members ?? []).map((m: any) => (
                <SelectItem key={m.id || m._id} value={m.id || m._id}>
                  {`${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Created By</label>
          <Select value={creatorId} onValueChange={setCreatorId}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Creators" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40">
              <SelectItem value="ALL">All Creators</SelectItem>
              {(membersQuery.data?.data.members ?? []).map((m: any) => (
                <SelectItem key={m.id || m._id} value={m.id || m._id}>
                  {`${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Due Date</label>
          <div className="w-full flex justify-start pl-1">
             <DatePicker
              value={dueDate ? new Date(dueDate) : undefined}
              onChange={(date) => setDueDate(date ? date.toISOString() : "")}
              placeholder="Select date"
              className="p-1 border border-border/20 rounded-2xl bg-muted/5 origin-left"
              inline
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 mt-auto border-t border-border/40">
        <Button
          variant="outline"
          className="flex-1 h-10 rounded-xl text-xs font-semibold hover:bg-muted/30"
          onClick={clearFilters}
        >
          Clear
        </Button>
        {!isMobile && (
           <Button
            className="flex-1 h-10 rounded-xl text-xs font-bold shadow-lg shadow-primary/20"
            onClick={() => {}} 
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col overflow-hidden",
        viewMode !== "kanban" && "mx-auto max-w-7xl px-4 lg:px-6"
      )}
    >
      <div
        className={cn("shrink-0 space-y-3 pb-3 pt-1", viewMode === "kanban" && "px-4")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT GROUP: Search & Filters */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-1 lg:max-w-xl">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search tasks..."
                className="h-9 rounded-full pl-9 text-xs w-full bg-muted/20 border-border/40 focus:bg-background transition-all"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 rounded-full px-4 gap-2 border-border/40 bg-muted/20 font-medium text-xs transition-all hover:bg-muted/30 shrink-0",
                    activeFilterCount > 0 && "border-primary/40 bg-primary/5 text-primary"
                  )}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge className="h-4.5 min-w-[18px] px-1 ml-0.5 flex items-center justify-center text-[9px] bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 rounded-2xl shadow-premium border-border/40" align="start">
                <FilterContent isMobileView={isMobile} />
              </PopoverContent>
            </Popover>

            {/* Mobile Sheet Trigger (Redundant if Popover works on mobile, but better for mobile UX) */}
            {isMobile && (
              <Sheet>
                {/* We can hide this trigger or use the same button. 
                    Actually, if the Popover works, we don't need the sheet, 
                    but the sheet is better on mobile. Let's keep it. */}
              </Sheet>
            )}
          </div>

          {/* RIGHT GROUP: Actions & View Switcher */}
          <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
            <div className="flex items-center gap-2 flex-1 lg:flex-none">
              {canMutate && (
                <CreateTaskModal
                  defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                  trigger={
                    <Button
                      size="sm"
                      className="h-9 rounded-full font-bold px-5 flex-1 lg:flex-none shadow-premium/5"
                      variant="secondary"
                    >
                      Create Task
                    </Button>
                  }
                />
              )}
              
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={isExporting}
                        className="h-9 w-9 rounded-full border-border/40 bg-muted/20 hover:bg-muted/30 transition-all text-muted-foreground shrink-0"
                      >
                        {isExporting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export Tasks</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/40 shadow-premium">
                  <DropdownMenuItem
                    className="rounded-lg"
                    disabled={isExporting}
                    onClick={() => handleExport("pdf")}
                  >
                    <FileText className="mr-2 size-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-lg"
                    disabled={isExporting}
                    onClick={() => handleExport("excel")}
                  >
                    <FileSpreadsheet className="mr-2 size-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="inline-flex rounded-full border border-border/40 bg-muted/30 p-1 h-9 items-center">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-4 rounded-full text-xs gap-1.5 font-bold transition-all"
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className="h-7 px-4 rounded-full text-xs gap-1.5 font-bold transition-all"
              >
                <Kanban className="size-3.5" />
                <span className="hidden sm:inline">Board</span>
              </Button>
              {isMobile && (
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-7 px-4 rounded-full text-xs gap-1.5 font-bold transition-all"
                >
                  <TableIcon className="size-3.5" />
                  Table
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-top-2 duration-300">
            {status !== "ALL" && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Status: {status}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setStatus("ALL")}
                />
              </Badge>
            )}
            {priority !== "ALL" && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Priority: {priority}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setPriority("ALL")}
                />
              </Badge>
            )}
            {projectId !== "ALL" && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Project: {resolveProjectName(projectId)}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setProjectId("ALL")}
                />
              </Badge>
            )}
            {assigneeId !== "ALL" && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Assignee: {resolveAssigneeName(assigneeId)}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setAssigneeId("ALL")}
                />
              </Badge>
            )}
            {creatorId !== "ALL" && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Creator: {resolveAssigneeName(creatorId)}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setCreatorId("ALL")}
                />
              </Badge>
            )}
            {dueDate && (
              <Badge
                variant="outline"
                className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
              >
                Due: {new Date(dueDate).toLocaleDateString()}
                <X
                  className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                  onClick={() => setDueDate("")}
                />
              </Badge>
            )}
            {activeFilterCount > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                Reset All
              </Button>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0",
          viewMode === "kanban" ? "mt-3" : "mt-0",
        )}
      >
        {(viewMode === "list" || viewMode === "table") && (
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            {listQuery.isLoading && (
              <div className="space-y-3 pt-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            )}
            {!listQuery.isLoading && listRows.length === 0 && (
              <div className="pt-14">
                <EmptyState
                  title="No tasks found"
                  description="Try adjusting filters or create a task."
                />
              </div>
            )}
            {!listQuery.isLoading && listRows.length > 0 && (
              <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                {viewMode === "list" && !isMobile && (
                  <div className="hidden md:block rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/40">
                          <TableHead className="py-4 font-semibold text-foreground/70">
                            Task Title
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Assignee
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Priority
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Created By
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Created Time
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Project
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Due Date
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/70">
                            Tags
                          </TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listRows.map((task, idx) => (
                          <TaskRow
                            key={getTaskId(task)}
                            task={task}
                            idx={idx}
                            taskId={getTaskId(task)}
                            assignee={getAssignee(task)}
                            isOverdue={
                              task.dueDate &&
                              new Date(task.dueDate) < new Date() &&
                              task.status !== "DONE"
                            }
                            canMutate={canMutate}
                            setSelectedTask={setSelectedTask}
                            setDeleteId={setDeleteId}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {viewMode === "list" && isMobile && (
                  <div className="grid gap-3">
                    {listRows.map((task, idx) => {
                      const taskId = getTaskId(task);
                      const assignee = getAssignee(task);
                      return (
                        <div
                          key={taskId}
                          className="rounded-xl border border-border bg-card p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <Link
                                href={`/tasks/${taskId}`}
                                className="font-bold text-sm hover:text-primary transition-colors block"
                              >
                                {task.title}
                              </Link>
                              <span className="text-[10px] text-muted-foreground/60 uppercase">
                                #{taskId.slice(-6)}
                              </span>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[9px] uppercase tracking-tighter shrink-0"
                            >
                              {task.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-4 border-t pt-3">
                            <div className="flex items-center gap-2">
                              {assignee && (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={assignee.avatarUrl} />
                                  <AvatarFallback className="text-[8px]">
                                    {assignee.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="text-xs text-muted-foreground truncate max-w-24">
                                {assignee?.name || "Unassigned"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Link href={`/tasks/${taskId}`}>
                                  <Eye className="size-4" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setSelectedTask(task)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              {canMutate && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(taskId)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {viewMode === "table" && (
                  <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-x-auto relative no-scrollbar md:custom-scrollbar">
                    <Table className="min-w-[800px] md:min-w-0 border-separate border-spacing-0">
                      <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="py-4 pl-6 min-w-[200px]">
                            Task Title
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Assignee
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Status
                          </TableHead>
                          <TableHead className="min-w-[120px]">
                            Priority
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Created By
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Created Time
                          </TableHead>
                          <TableHead className="min-w-[150px]">
                            Project
                          </TableHead>
                          <TableHead className="min-w-[140px]">
                            Due Date
                          </TableHead>
                          <TableHead className="min-w-[150px]">Tags</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listRows.map((task, idx) => (
                          <TaskRow
                            key={getTaskId(task)}
                            task={task}
                            idx={idx}
                            taskId={getTaskId(task)}
                            assignee={getAssignee(task)}
                            isOverdue={
                              task.dueDate &&
                              new Date(task.dueDate) < new Date() &&
                              task.status !== "DONE"
                            }
                            canMutate={canMutate}
                            setSelectedTask={setSelectedTask}
                            setDeleteId={setDeleteId}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <PaginationMeta
                  page={page}
                  totalPages={totalPages}
                  isFetching={listQuery.isFetching}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}

        {viewMode === "kanban" && (
          <div className="h-full animate-in fade-in zoom-in-95 duration-500">
            {kanbanQuery.isLoading ? (
              <div className="flex h-full gap-4 overflow-hidden p-4">
                <Skeleton className="h-full w-72 rounded-2xl" />
                <Skeleton className="h-full w-72 rounded-2xl" />
                <Skeleton className="h-full w-72 rounded-2xl" />
              </div>
            ) : kanbanRows.length === 0 ? (
              <div className="pt-14">
                <EmptyState
                  title="No tasks found"
                  description="Try changing filters or create a task to get started."
                />
              </div>
            ) : (
              <TaskBoard
                tasks={kanbanRows}
                canEdit={canMutate}
                projectId={projectId !== "ALL" ? projectId : undefined}
              />
            )}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-110">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Confirm task deletion for this organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTask.isPending || !deleteId}
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteTask.mutateAsync(deleteId);
                  setDeleteId(null);
                  toast.success("Task deleted");
                } catch {
                  toast.error("Task deletion failed");
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          open={Boolean(selectedTask)}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

function PaginationMeta({
  page,
  totalPages,
  isFetching,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  isFetching: boolean;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pb-4 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1 || isFetching}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </Button>
      <p className="text-sm text-muted-foreground font-medium px-2">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages || isFetching}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
