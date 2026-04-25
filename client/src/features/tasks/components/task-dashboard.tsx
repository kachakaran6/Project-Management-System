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
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
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
import { TaskListSkeleton, TaskBoardSkeleton, TaskTableSkeleton } from "@/features/tasks/components/task-skeleton";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { resolveStatus, filterVisibleTasks, normalizeId } from "@/features/tasks/utils/resolve-status";

// Pagination Constants
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "list" | "kanban" | "table";

interface TaskDashboardProps {
  fixedProjectId?: string;
  isEmbedded?: boolean;
}

export function TaskDashboard({ fixedProjectId, isEmbedded = false }: TaskDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    if (typeof window === "undefined") return "kanban";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY) as TaskViewMode;
    const isMobileInitial = window.innerWidth < 768;

    if (isMobileInitial) {
      if (saved === "table" || saved === "list") return saved;
      return "list"; // Kanban not allowed on mobile
    } else {
      if (saved === "kanban" || saved === "list") return saved;
      return "kanban"; // Table not allowed on desktop
    }
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
    } else if (!isMobile && viewMode === "table") {
      setViewMode("list");
    }
  }, [isMobile, viewMode]);

  useEffect(() => {
    if (fixedProjectId) {
      setProjectId(fixedProjectId);
    }
  }, [fixedProjectId]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [status, setStatus] = useState<string>(
    searchParams.get("status") || "ALL",
  );
  const [priority, setPriority] = useState<string>(
    searchParams.get("priority") || "ALL",
  );
  // IF fixedProjectId is passed, WE IGNORE the URL param and use the prop
  const [projectId, setProjectId] = useState<string>(
    fixedProjectId || searchParams.get("projectId") || "ALL",
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
  const { data: dynamicStatuses = [] } = useStatusesQuery();

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

  // Sync status if URL has a legacy string but dynamic statuses are loaded
  useEffect(() => {
    if (dynamicStatuses.length > 0 && status !== "ALL" && status) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(status);
      if (!isObjectId) {
        const dummyTask = { status: status };
        const matched = resolveStatus(dummyTask, dynamicStatuses);
        if (matched) {
          const matchedId = normalizeId(matched._id) || normalizeId(matched.id);
          if (matchedId) setStatus(matchedId);
        }
      }
    }
  }, [dynamicStatuses, status]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (status !== "ALL") params.set("status", status);
    else params.delete("status");
    if (priority !== "ALL") params.set("priority", priority);
    else params.delete("priority");

    // Only update projectId param if it's NOT fixed
    if (!fixedProjectId) {
      if (projectId !== "ALL") params.set("projectId", projectId);
      else params.delete("projectId");
    }

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
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, tagIds, page, limit, router, fixedProjectId, searchParams]);

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
  const listRows = useMemo(() => filterVisibleTasks(listQuery.data?.data.items ?? []), [listQuery.data]);
  const kanbanRows = useMemo(() => filterVisibleTasks(kanbanQuery.data?.data.items ?? []), [kanbanQuery.data]);

  const getTaskId = (task: Task) => String(task.id || (task as any)._id || "");
  const getAssignees = (task: Task) => task.assigneeUsers ?? [];

  const getStatusName = (status: any) => {
    if (!status) return "Unknown";
    if (typeof status === 'object') return status.name || "Unknown";
    return String(status).replace("_", " ");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status !== "ALL") count++;
    if (priority !== "ALL") count++;
    // Don't count project filter if it's fixed
    if (!fixedProjectId && projectId !== "ALL") count++;
    if (assigneeId !== "ALL") count++;
    if (creatorId !== "ALL") count++;
    if (dueDate) count++;
    if (tagIds.length > 0) count += tagIds.length;
    return count;
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, tagIds, fixedProjectId]);

  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    if (!fixedProjectId) setProjectId("ALL");
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

  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col overflow-hidden",
        !isEmbedded && viewMode !== "kanban" && "mx-auto max-w-7xl"
      )}
    >
      {/* PROFESSIONAL TOOLBAR */}
      <div
        className={cn(
          "shrink-0 py-3 flex flex-col gap-4 border-b border-border/10 sticky top-0 z-30",
          !isEmbedded && "bg-background/50 backdrop-blur-md",
          viewMode === "kanban" ? "px-4" : isEmbedded ? "px-0" : "px-1"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Search and Filters Unified */}
            <div className="relative max-w-md w-full group">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search tasks..."
                className="h-10 rounded-2xl pl-10 pr-4 text-[13px] font-medium w-full bg-muted/10 border-border/40 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            {!isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 rounded-2xl px-5 gap-2.5 border-border/40 bg-muted/10 font-bold text-xs transition-all hover:bg-muted/20 hover:border-border/60 active:scale-95",
                      activeFilterCount > 0 && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    )}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <Badge className="h-4.5 min-w-[18px] px-1 ml-0.5 flex items-center justify-center text-[9px] bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 rounded-3xl shadow-2xl border-border/40 bg-card/95 backdrop-blur-xl" align="start">
                  <FilterContent
                    status={status} setStatus={setStatus}
                    priority={priority} setPriority={setPriority}
                    projectId={projectId} setProjectId={setProjectId}
                    assigneeId={assigneeId} setAssigneeId={setAssigneeId}
                    creatorId={creatorId} setCreatorId={setCreatorId}
                    dueDate={dueDate} setDueDate={setDueDate}
                    tagIds={tagIds} setTagIds={setTagIds}
                    clearFilters={clearFilters}
                    projectsQuery={projectsQuery}
                    membersQuery={membersQuery}
                    dynamicStatuses={dynamicStatuses}
                    hideProjectFilter={Boolean(fixedProjectId)}
                  />
                </PopoverContent>
              </Popover>
            )}

            {isMobile && (
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
                dynamicStatuses={dynamicStatuses}
                hideProjectFilter={Boolean(fixedProjectId)}
                trigger={
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border/40 bg-muted/10 relative shrink-0">
                    <SlidersHorizontal className="size-4" />
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 size-3.5 bg-primary text-[8px] rounded-full flex items-center justify-center text-white font-black shadow-sm">{activeFilterCount}</span>}
                  </Button>
                }
              />
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher - Premium Toggle */}
            <div className="inline-flex rounded-2xl border border-border/40 bg-muted/10 p-1 h-10 items-center shadow-inner-sm">
              {!isMobile && (
                <Button
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "h-8 px-4 rounded-xl text-[11px] gap-1.5 font-black transition-all shrink-0",
                    viewMode === "kanban" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Kanban className="size-3.5" /> <span className={cn(isMobile && "hidden")}>Board</span>
                </Button>
              )}

              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-8 px-4 rounded-xl text-[11px] gap-1.5 font-black transition-all shrink-0",
                  viewMode === "list" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-3.5" /> <span className={cn(isMobile && "hidden")}>List</span>
              </Button>

              {isMobile && (
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-8 px-4 rounded-xl text-[11px] gap-1.5 font-black transition-all shrink-0",
                    viewMode === "table" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TableIcon className="size-3.5" /> <span className={cn(isMobile && "hidden")}>Table</span>
                </Button>
              )}
            </div>

            {/* Export Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isExporting}
                      className="h-10 w-10 rounded-2xl border-border/40 bg-muted/10 hover:bg-muted/20 transition-all text-muted-foreground shrink-0 shadow-sm"
                    >
                      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] font-bold">Export Data</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/40 shadow-2xl p-1.5 bg-card/95 backdrop-blur-xl">
                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer font-medium" disabled={isExporting} onClick={() => handleExport("pdf")}>
                  <FileText className="mr-2.5 size-4 opacity-70" /> Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl py-2 cursor-pointer font-medium" disabled={isExporting} onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="mr-2.5 size-4 opacity-70" /> Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Task - Only show in global view or if specified */}
            {canMutate && !fixedProjectId && (
              <CreateTaskModal
                defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                trigger={
                  <Button size="sm" className="hidden md:inline-flex h-10 rounded-2xl font-black px-6 shadow-premium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all">
                    New Task
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* ACTIVE FILTERS CHIPS */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-top-1 duration-300">
            <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] px-2 shrink-0">Active</span>
            <div className="flex items-center gap-2">
              {status !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {dynamicStatuses.find((s: any) => (s.id || s._id) === status)?.name || status}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setStatus("ALL")} />
                </Badge>
              )}
              {priority !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {priority}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setPriority("ALL")} />
                </Badge>
              )}
              {!fixedProjectId && projectId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {resolveProjectName(projectId)}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setProjectId("ALL")} />
                </Badge>
              )}
              {assigneeId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {resolveAssigneeName(assigneeId)}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setAssigneeId("ALL")} />
                </Badge>
              )}
              {tagIds.map(tid => {
                const tag = allTags.find(t => t.id === tid);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                    style={{ borderColor: `${tag.color}40`, color: tag.color, backgroundColor: `${tag.color}10` }}
                  >
                    {tag.label}
                    <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setTagIds(tagIds.filter(id => id !== tag.id))} />
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-3 text-[10px] font-black text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 rounded-full"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          viewMode === "kanban" ? "mt-3" : "mt-0",
        )}
      >
        {(viewMode === "list" || viewMode === "table") && (
          <>
            <div className="flex-1 overflow-auto custom-scrollbar pr-1 relative bg-card/20 rounded-2xl border border-border/40 shadow-inner-sm">
              {listQuery.isLoading ? (
                <div className="animate-in fade-in duration-500">
                  {viewMode === "table" ? <TaskTableSkeleton /> : <div className="p-4"><TaskListSkeleton /></div>}
                </div>
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
                            <TableHead className="py-4 pl-6 font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Task Title
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Assignee
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Status
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Priority
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Created By
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Created Time
                            </TableHead>
                            <TableHead className={cn("font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50", fixedProjectId && "hidden")}>
                              Project
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Due Date
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
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
                              assignees={getAssignees(task)}
                              isOverdue={
                                task.dueDate &&
                                new Date(task.dueDate) < new Date() &&
                                getStatusName(task.status).toUpperCase() !== "DONE"
                              }
                              canMutate={canMutate}
                              setSelectedTask={setSelectedTask}
                              setDeleteId={setDeleteId}
                              hideProject={Boolean(fixedProjectId)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {viewMode === "list" && isMobile && (
                    <div className="grid gap-3 p-3">
                      {listRows.map((task) => {
                        const taskId = getTaskId(task);
                        const assignees = getAssignees(task);
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
                                {getStatusName(task.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-4 border-t border-border/30 pt-3">
                              <div className="flex items-center gap-2">
                                {assignees.length > 0 ? (
                                  <div className="flex items-center -space-x-2">
                                    {assignees.slice(0, 3).map((a) => (
                                      <Avatar key={a.id} className="h-6 w-6 ring-2 ring-background border border-border/10 shadow-sm">
                                        <AvatarImage src={a.avatarUrl} />
                                        <AvatarFallback className="text-[8px] bg-primary/5 text-primary">
                                          {a.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {assignees.length > 3 && (
                                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold border-2 border-background shadow-sm">
                                        +{assignees.length - 3}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <User className="size-3 text-muted-foreground/40" />
                                  </div>
                                )}
                                <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[120px]">
                                  {assignees.length === 0
                                    ? "Unassigned"
                                    : assignees.length === 1
                                      ? assignees[0].name
                                      : `${assignees.length} members`}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <Button
                                  asChild
                                  variant="outline"
                                  className="h-8 rounded-xl text-[10px] font-bold border-border/40 bg-muted/5 text-muted-foreground hover:bg-muted/10"
                                >
                                  <Link href={`/tasks/${taskId}`}>
                                    <Eye className="size-3 mr-1" />
                                    View
                                  </Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-8 rounded-xl text-[10px] font-bold border-border/40 bg-muted/5 text-muted-foreground hover:bg-muted/10"
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <Pencil className="size-3 mr-1" />
                                  Edit
                                </Button>
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
                            <TableHead className="py-4 pl-8 font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Task Title
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Assignee
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Status
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Priority
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Created By
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Created Time
                            </TableHead>
                            <TableHead className={cn("font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50", fixedProjectId && "hidden")}>
                              Project
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
                              Due Date
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/50 border-b border-border/50">
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
                              assignees={getAssignees(task)}
                              isOverdue={
                                task.dueDate &&
                                new Date(task.dueDate) < new Date() &&
                                getStatusName(task.status).toUpperCase() !== "DONE"
                              }
                              canMutate={canMutate}
                              setSelectedTask={setSelectedTask}
                              setDeleteId={setDeleteId}
                              hideProject={Boolean(fixedProjectId)}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
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
                isEmbedded={isEmbedded}
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

// Helper components
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
  dynamicStatuses,
  hideProjectFilter,
  trigger
}: any) {
  const clearFilters = () => {
    setStatus("ALL");
    setPriority("ALL");
    if (!hideProjectFilter) setProjectId("ALL");
    setAssigneeId("ALL");
    setCreatorId("ALL");
    setDueDate("");
    setTagIds([]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
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
            ...(dynamicStatuses || []).map((s: any) => ({
              v: s.id || s._id,
              l: s.name
            }))
          ]} />

          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={[
            { v: "ALL", l: "All Priorities" },
            { v: "LOW", l: "Low" },
            { v: "MEDIUM", l: "Medium" },
            { v: "HIGH", l: "High" },
            { v: "URGENT", l: "Urgent" }
          ]} />

          {!hideProjectFilter && (
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
          )}

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

function FilterContent({
  isMobileView = false,
  status, setStatus,
  priority, setPriority,
  projectId, setProjectId,
  assigneeId, setAssigneeId,
  creatorId, setCreatorId,
  dueDate, setDueDate,
  tagIds, setTagIds,
  clearFilters,
  projectsQuery,
  membersQuery,
  dynamicStatuses,
  hideProjectFilter
}: any) {
  return (
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
              {dynamicStatuses.map((s: any) => (
                <SelectItem key={s.id || s._id} value={s.id || s._id}>
                  {s.name}
                </SelectItem>
              ))}
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

        {!hideProjectFilter && (
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
        )}

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
        {!isMobileView && (
          <PopoverClose asChild>
            <Button
              className="flex-1 h-10 rounded-xl text-xs font-bold shadow-lg shadow-primary/20"
            >
              Apply
            </Button>
          </PopoverClose>
        )}
      </div>
    </div>
  );
}
