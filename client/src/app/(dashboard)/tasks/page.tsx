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
  Plus,
  ChevronLeft,
  ChevronRight,
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
  SheetClose,
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
import { TagSelect } from "@/features/tags/components/tag-select";
import { useTagsQuery } from "@/features/tags/hooks/use-tags";
import { TaskListSkeleton, TaskBoardSkeleton } from "@/features/tasks/components/task-skeleton";

// Pagination Constants
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "list" | "kanban" | "table";

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    if (typeof window === "undefined") return "kanban";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "table") return "table";
    return "kanban";
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
    } else if (!isMobile && viewMode === "list") {
      setViewMode("kanban");
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
  const [page, setPage] = useState(() => {
    const p = searchParams.get("page");
    return p ? parseInt(p, 10) : 1;
  });
  const [limit, setLimit] = useState(() => {
    const l = searchParams.get("limit");
    return l ? parseInt(l, 10) : DEFAULT_PAGE_SIZE;
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>(
    searchParams.get("tagIds")?.split(",").filter(Boolean) || [],
  );
  const [isExporting, setIsExporting] = useState(false);

  const { activeOrg, activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const deleteTask = useDeleteTaskMutation();

  const canMutate =
    activeOrg?.role === "OWNER" ||
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
    const params = new URLSearchParams();
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
    if (tagIds.length > 0) params.set("tagIds", tagIds.join(","));
    else params.delete("tagIds");
    
    // Pagination params
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    if (limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(limit));
    else params.delete("limit");

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, tagIds, page, limit, router]);

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
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    }),
    [debouncedSearch, status, priority, projectId, assigneeId, creatorId, dueDate, tagIds],
  );

  const listFilters = useMemo(
    () => ({ ...sharedFilters, page, limit }),
    [sharedFilters, page, limit],
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
    if (tagIds.length > 0) count += tagIds.length;
    return count;
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, tagIds]);

  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setProjectId("ALL");
    setAssigneeId("ALL");
    setCreatorId("ALL");
    setDueDate("");
    setTagIds([]);
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
    if (id === "UNASSIGNED") return "Unassigned";
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
    } catch (err: any) {
      toast.error(err.message || "Failed to export tasks. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const { data: allTags = [] } = useTagsQuery(activeOrgId || "");

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
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
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
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
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

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Tags (AND Logic)</label>
          <TagSelect 
            selectedTagIds={tagIds}
            onChange={(ids) => {
              setPage(1);
              setTagIds(ids);
            }}
          />
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
          <div className="flex items-center gap-2 w-full lg:max-w-xl">
            {/* Search Bar - Flexible on Desktop, Compact on Mobile */}
            <div className={`relative ${isMobile ? 'flex-[1.5]' : 'flex-1'} min-w-0`}>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search..."
                className="h-8.5 sm:h-9 rounded-xl pl-9 text-xs w-full bg-muted/20 border-border/40 focus:bg-background transition-all"
              />
            </div>

            {/* Mobile-Only Combined Action Row */}
            {isMobile && (
              <div className="flex items-center gap-1.5 flex-1 shrink-0">
                <FilterDrawer 
                  status={status} setStatus={setStatus}
                  priority={priority} setPriority={setPriority}
                  projectId={projectId} setProjectId={setProjectId}
                  assigneeId={assigneeId} setAssigneeId={setAssigneeId}
                  creatorId={creatorId} setCreatorId={setCreatorId}
                  dueDate={dueDate} setDueDate={setDueDate}
                  tagIds={tagIds} setTagIds={setTagIds}
                  activeFilterCount={activeFilterCount}
                  membersQuery={membersQuery}
                  projectsQuery={projectsQuery}
                  allTags={allTags}
                  trigger={
                    <Button variant="outline" size="icon" className="h-8.5 w-8.5 rounded-xl border-border/40 bg-muted/20 relative">
                      <SlidersHorizontal className="size-3.5" />
                      {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 size-3 bg-primary text-[8px] rounded-full flex items-center justify-center text-white font-bold">{activeFilterCount}</span>}
                    </Button>
                  }
                />
                
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isExporting}
                  onClick={() => handleExport("excel")}
                  className="h-8.5 w-8.5 rounded-xl border-border/40 bg-muted/20"
                >
                  <Download className="size-3.5" />
                </Button>

                <div className="flex items-center bg-muted/20 p-0.5 rounded-xl border border-border/40 h-8.5">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={cn("h-7 w-7 rounded-lg", viewMode === "list" && "bg-background shadow-sm")}
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="icon"
                    className={cn("h-7 w-7 rounded-lg", viewMode === "table" && "bg-background shadow-sm")}
                    onClick={() => setViewMode("table")}
                  >
                    <TableIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop-Only Filter Trigger */}
            {!isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 rounded-xl px-4 gap-2 border-border/40 bg-muted/20 font-medium text-xs transition-all hover:bg-muted/30 shrink-0",
                      activeFilterCount > 0 && "border-primary/40 bg-primary/5 text-primary"
                    )}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Filters</span>
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
            )}
          </div>

          {/* Desktop-Only Actions Group */}
          {!isMobile && (
            <div className="flex items-center gap-3 shrink-0">
              {canMutate && (
                <CreateTaskModal
                  defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                  trigger={
                    <Button size="sm" className="h-9 rounded-xl font-bold px-5 shadow-premium/5">
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
                        className="h-9 w-9 rounded-xl border-border/40 bg-muted/20 hover:bg-muted/30 transition-all text-muted-foreground shrink-0"
                      >
                        {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export Tasks</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/40 shadow-premium">
                  <DropdownMenuItem className="rounded-lg" disabled={isExporting} onClick={() => handleExport("pdf")}>
                    <FileText className="mr-2 size-4" /> Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg" disabled={isExporting} onClick={() => handleExport("excel")}>
                    <FileSpreadsheet className="mr-2 size-4" /> Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="inline-flex rounded-xl border border-border/40 bg-muted/30 p-1 h-9 items-center">
                <Button
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className="h-7 px-4 rounded-lg text-xs gap-1.5 font-bold transition-all"
                >
                  <Kanban className="size-3.5" /> Board
                </Button>

                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-7 px-4 rounded-lg text-xs gap-1.5 font-bold transition-all"
                >
                  <TableIcon className="size-3.5" /> Table
                </Button>
              </div>
            </div>
          )}
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
            {tagIds.map(tid => {
              const tag = allTags.find(t => t.id === tid);
              if (!tag) return null;
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap"
                  style={{ borderColor: `${tag.color}40`, color: tag.color, backgroundColor: `${tag.color}10` }}
                >
                  {tag.label}
                  <X
                    className="size-3 opacity-50 hover:opacity-100 cursor-pointer"
                    onClick={() => setTagIds(tagIds.filter(id => id !== tag.id))}
                  />
                </Badge>
              );
            })}
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

      {/* FIXED CONTENT AREA: Task List with internal scroll */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          viewMode === "kanban" ? "mt-3" : "mt-0",
        )}
      >
        {(viewMode === "list" || viewMode === "table") && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative bg-card/20 rounded-2xl border border-border/40 shadow-inner-sm">
              {listQuery.isLoading ? (
                <div className="p-4"><TaskListSkeleton /></div>
              ) : listRows.length === 0 ? (
                <div className="flex h-full items-center justify-center py-20">
                  <EmptyState
                    title="No tasks found"
                    description="Try adjusting filters or create a task."
                    action={
                      canMutate ? (
                        <CreateTaskModal
                          defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                          trigger={
                            <Button className="mt-4 rounded-xl font-bold px-8">
                              Create First Task
                            </Button>
                          }
                        />
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <div className="min-w-full">
                  {viewMode === "list" && !isMobile && (
                    <div className="animate-in fade-in duration-500">
                      <Table className="relative border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-md shadow-sm">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="py-4 pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Task Title
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Assignee
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Status
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Priority
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Created By
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Created Time
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Project
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Due Date
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Tags
                            </TableHead>
                            <TableHead className="w-16 border-b border-border/50"></TableHead>
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
                    <div className="grid gap-3 p-3">
                      {/* Mobile cards */}
                      {listRows.map((task, idx) => {
                        const taskId = getTaskId(task);
                        const assignee = getAssignee(task);
                        return (
                          <div
                            key={taskId}
                            className="rounded-xl border border-border/50 bg-card p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/tasks/${taskId}`}
                                  className="font-bold text-[14px] hover:text-primary transition-colors block line-clamp-1"
                                >
                                  {task.title}
                                </Link>
                                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-tighter">
                                  #{taskId.slice(-8)}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className="h-5 px-2 rounded-full text-[9px] font-bold uppercase tracking-tight shrink-0"
                              >
                                {task.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-4 border-t border-border/30 pt-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={assignee?.avatarUrl} />
                                  <AvatarFallback className="text-[8px] bg-primary/5 text-primary">
                                    {assignee?.name?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[100px]">
                                  {assignee?.name || "Unassigned"}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg"
                                >
                                  <Link href={`/tasks/${taskId}`}>
                                    <Eye className="size-3.5 text-muted-foreground" />
                                  </Link>
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <Pencil className="size-3.5 text-muted-foreground" />
                                </Button>
                                {canMutate && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50/50"
                                    onClick={() => setDeleteId(taskId)}
                                  >
                                    <Trash2 className="size-3.5" />
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
                     <div className="animate-in fade-in duration-500">
                      <Table className="min-w-[1200px] border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-md shadow-sm">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="py-4 pl-8 font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Task Title
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Assignee
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Status
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Priority
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Created By
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Created Time
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Project
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Due Date
                            </TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/50">
                              Tags
                            </TableHead>
                            <TableHead className="w-16 border-b border-border/50"></TableHead>
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
                </div>
              )}
            </div>
            {/* Pagination controls: ALWAYS VISIBLE outside scroll area */}
            <div className="shrink-0 py-3 flex items-center justify-between gap-2 border-t border-border/10 px-4 sm:px-0.5 bg-background sticky bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
              <div className="flex items-center gap-2">
                 <Select 
                    value={String(limit)} 
                    onValueChange={(val) => {
                      setLimit(parseInt(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[105px] sm:w-28 rounded-xl bg-muted/20 border-border/40 text-[10px] sm:text-[11px] font-bold shadow-sm">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      {PAGE_SIZE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={String(opt)} className="text-xs font-medium">
                          {opt} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="hidden md:inline text-[11px] text-muted-foreground/60 font-bold uppercase tracking-tight">
                    Showing {listRows.length} tasks
                  </span>
              </div>
              
              <div className="flex-1 sm:flex-none">
                <PaginationMeta
                  page={page}
                  totalPages={totalPages}
                  isFetching={listQuery.isFetching}
                  onPageChange={setPage}
                />
              </div>
            </div>
          </>
        )}

        {viewMode === "kanban" && (
          <div className="h-full animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            {kanbanQuery.isLoading ? (
              <TaskBoardSkeleton />
            ) : kanbanRows.length === 0 ? (
              <div className="h-full flex items-center justify-center py-20 bg-card/20 rounded-2xl border border-border/40">
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

      {canMutate && (
        <CreateTaskModal
          defaultProjectId={projectId !== "ALL" ? projectId : undefined}
          trigger={
            <Button
              size="icon"
              className="lg:hidden fixed bottom-20 right-4 size-14 rounded-full shadow-2xl shadow-primary/40 z-50 animate-in zoom-in slide-in-from-bottom-10 duration-500 active:scale-95 transition-transform"
            >
              <Plus className="size-7" />
            </Button>
          }
        />
      )}
    </div>
  );
}

// Sub-component for Filters to avoid repetition
function FilterDrawer({ 
  status, setStatus, 
  priority, setPriority, 
  projectId, setProjectId,
  assigneeId, setAssigneeId, 
  creatorId, setCreatorId, 
  dueDate, setDueDate, 
  tagIds, setTagIds, 
  activeFilterCount, 
  membersQuery, 
  projectsQuery,
  allTags,
  trigger 
}: any) {
  const clearFilters = () => {
    setStatus("ALL");
    setPriority("ALL");
    setProjectId("ALL");
    setAssigneeId("ALL");
    setCreatorId("ALL");
    setDueDate("");
    setTagIds([]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-border/40 bg-card/50 relative hover:bg-muted/50"
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:max-w-md bg-background/95 backdrop-blur-md border-border/10 rounded-l-[1.5rem] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border/10 shrink-0">
          <SheetTitle className="text-2xl font-black tracking-tighter">Filters</SheetTitle>
          <SheetDescription className="font-medium text-muted-foreground/70">
            Narrow down tasks by specific criteria
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[
            { v: "ALL", l: "All Statuses" },
            { v: "BACKLOG", l: "Backlog" },
            { v: "TODO", l: "To Do" },
            { v: "IN_PROGRESS", l: "In Progress" },
            { v: "IN_REVIEW", l: "In Review" },
            { v: "DONE", l: "Done" },
            { v: "REJECTED", l: "Rejected" },
            { v: "ARCHIVED", l: "Archived" }
          ]} />

          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={[
            { v: "ALL", l: "All Priorities" },
            { v: "LOW", l: "Low" },
            { v: "MEDIUM", l: "Medium" },
            { v: "HIGH", l: "High" },
            { v: "URGENT", l: "Urgent" }
          ]} />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="rounded-xl bg-muted/10 border-border/40 h-11">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
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
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Assignee</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="rounded-xl bg-muted/10 border-border/40 h-11">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">All Assignees</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {(membersQuery.data?.data.members ?? []).map((m: any) => (
                  <SelectItem key={m.id || m._id} value={m.id || m._id}>
                    {`${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Created By</label>
            <Select value={creatorId} onValueChange={setCreatorId}>
              <SelectTrigger className="rounded-xl bg-muted/10 border-border/40 h-11">
                <SelectValue placeholder="All Creators" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
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
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Due Date</label>
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

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Tags (AND Logic)</label>
            <TagSelect 
              selectedTagIds={tagIds}
              onChange={(ids) => {
                setTagIds(ids);
              }}
            />
          </div>

          <p className="text-[10px] text-muted-foreground italic text-center py-4">Scroll for more filters</p>
        </div>

        <div className="p-6 mt-auto border-t border-border/10 flex gap-3 bg-muted/5">
          <Button variant="outline" onClick={clearFilters} className="flex-1 rounded-xl h-11 font-bold">Clear</Button>
          <SheetClose asChild>
            <Button className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20">Apply</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="rounded-xl bg-muted/10 border-border/40 h-11">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {options.map((o: any) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
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
    <div className="flex items-center justify-end gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 rounded-lg sm:rounded-xl border-border/40 bg-background/50"
        disabled={page <= 1 || isFetching}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        <ChevronLeft className="size-4 sm:hidden" />
        <span className="hidden sm:inline text-[11px] font-bold">Previous</span>
      </Button>
      
      <div className="flex items-baseline px-2 sm:px-4 shrink-0">
        <span className="text-[13px] font-black text-foreground tracking-tighter">
          {page}
          <span className="text-muted-foreground/40 font-medium mx-1 text-xs">/</span> 
          {totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 rounded-lg sm:rounded-xl border-border/40 bg-background/50"
        disabled={page >= totalPages || isFetching}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4 sm:hidden" />
        <span className="hidden sm:inline text-[11px] font-bold">Next</span>
      </Button>
    </div>
  );
}
