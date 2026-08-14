
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
  GitBranch,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  SlidersHorizontal,
  User,
  Calendar,
  Check,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { DeleteTaskModal } from "@/features/tasks/components/delete-task-modal";
import { ExportTasksModal } from "@/features/tasks/components/export-tasks-modal";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { Task, TaskStatus, TaskPriority } from "@/types/task.types";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "@/lib/next-navigation";
// import { TaskRow } from "@/features/tasks/components/task-row";
import { taskApi } from "@/features/tasks/api/task.api";
import {
  generateExcel,
  generatePDF,
  type TaskExportFilters,
} from "@/features/tasks/utils/task-export";
import { formatGitBranchCommand } from "@/features/tasks/utils/git-branch-formatter";
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
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import {
  buildPaginatedTaskPanelContext,
  buildSnapshotTaskPanelContext,
} from "@/features/tasks/utils/task-panel-navigation";

// Pagination Constants
import {
  DEFAULT_TASK_SORT_DIRECTION,
  DEFAULT_TASK_SORT_FIELD,
  TASK_SORT_OPTIONS,
  getDefaultTaskSortState,
  getTaskSortLabel,
  isTaskSortDirection,
  isTaskSortField,
  readTaskSortPreference,
  writeTaskSortPreference,
} from "@/features/tasks/utils/task-sort";
import { TaskSortDirection, TaskSortField } from "@/types/task.types";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const LIMIT_STORAGE_KEY = "tasks:load-limit";
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "kanban" | "list" | "table";

function getStoredLimit(): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  const stored = localStorage.getItem(LIMIT_STORAGE_KEY);
  if (stored === "all") return 500;
  const parsed = parseInt(stored || "", 10);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

const getInitialTaskSortState = (searchParams: { get: (key: string) => string | null }) => {
  const stored = readTaskSortPreference() ?? getDefaultTaskSortState();
  const urlField = searchParams.get("sortBy");
  const urlDirection = searchParams.get("sortOrder");

  return {
    field: isTaskSortField(urlField) ? urlField : stored.field,
    direction: isTaskSortDirection(urlDirection) ? urlDirection : stored.direction,
  };
};

interface TaskDashboardProps {
  fixedProjectId?: string;
  isEmbedded?: boolean;
}

export function TaskDashboard({ fixedProjectId, isEmbedded = false }: TaskDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  // Initialize viewMode from URL or default to kanban
  const initialView = (searchParams.get("view") as any) || "kanban";
  const [viewMode, setViewMode] = useState<TaskViewMode>(initialView);

  // Sync isMounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { openPanel } = useTaskPanelStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    if (l) {
      const parsed = parseInt(l, 10);
      if (PAGE_SIZE_OPTIONS.includes(parsed)) return parsed;
      if (parsed >= 500) return 500;
    }
    return getStoredLimit();
  });
  const [limitIsAll, setLimitIsAll] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LIMIT_STORAGE_KEY) === "all";
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>(
    searchParams.get("tagIds")?.split(",").filter(Boolean) || [],
  );
  const [boardIds, setBoardIds] = useState<string[]>(
    searchParams.get("boardIds")?.split(",").filter(Boolean) || [],
  );
  const initialSort = useMemo(() => getInitialTaskSortState(searchParams), [searchParams]);
  const [selectedSortField, setSelectedSortField] = useState<TaskSortField>(initialSort.field);
  const [selectedSortDirection, setSelectedSortDirection] = useState<TaskSortDirection>(initialSort.direction);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

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

  // --- 4. URL & LOCALSTORAGE SYNC ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    writeTaskSortPreference({
      field: selectedSortField,
      direction: selectedSortDirection,
    });
  }, [selectedSortField, selectedSortDirection]);

  // Sync state FROM URL (Initial and on back/forward)
  useEffect(() => {
    const urlField = searchParams.get("sortBy");
    const urlDirection = searchParams.get("sortOrder");
    const urlView = searchParams.get("view");

    if (isTaskSortField(urlField) && urlField !== selectedSortField) {
      setSelectedSortField(urlField);
    }
    if (isTaskSortDirection(urlDirection) && urlDirection !== selectedSortDirection) {
      setSelectedSortDirection(urlDirection);
    }
    if (urlView && (urlView === "kanban" || urlView === "list" || urlView === "table") && urlView !== viewMode) {
      setViewMode(urlView as TaskViewMode);
    }
  }, [searchParams]);

  // Consolidated URL State Sync (State -> URL)
  useEffect(() => {
    if (!isMounted) return;

    const params = new URLSearchParams(searchParams.toString());
    
    // Core parameters
    params.set("view", viewMode);
    params.set("sortBy", selectedSortField);
    params.set("sortOrder", selectedSortDirection);
    
    // Filters
    if (status !== "ALL") params.set("status", status); else params.delete("status");
    if (priority !== "ALL") params.set("priority", priority); else params.delete("priority");
    if (search) params.set("q", search); else params.delete("q");
    
    if (!fixedProjectId) {
      if (projectId !== "ALL") params.set("projectId", projectId); else params.delete("projectId");
    }
    
    if (assigneeId !== "ALL") params.set("assigneeId", assigneeId); else params.delete("assigneeId");
    if (creatorId !== "ALL") params.set("creatorId", creatorId); else params.delete("creatorId");
    if (dueDate) params.set("dueDate", dueDate); else params.delete("dueDate");
    if (tagIds.length > 0) params.set("tagIds", tagIds.join(",")); else params.delete("tagIds");
    if (boardIds.length > 0) params.set("boardIds", boardIds.join(",")); else params.delete("boardIds");

    if (page > 1) params.set("page", page.toString()); else params.delete("page");
    
    // Limit is view-dependent
    const targetLimit = viewMode === "kanban" ? 1000 : limit;
    params.set("limit", targetLimit.toString());

    const newQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (newQuery !== currentQuery) {
      router.replace(`${pathname}?${newQuery}`, { scroll: false });
    }
  }, [
    isMounted,
    viewMode,
    selectedSortField,
    selectedSortDirection,
    status,
    priority,
    search,
    projectId,
    assigneeId,
    creatorId,
    dueDate,
    tagIds,
    boardIds,
    page,
    limit,
    pathname,
    router,
    fixedProjectId,
    searchParams
  ]);

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
      boardIds: boardIds.length > 0 ? boardIds : undefined,
      sortBy: viewMode === "kanban" ? "position" : selectedSortField,
      sortOrder: viewMode === "kanban" ? "asc" : selectedSortDirection,
    }),
    [debouncedSearch, status, priority, projectId, assigneeId, creatorId, dueDate, tagIds, boardIds, selectedSortField, selectedSortDirection, viewMode],
  );

  const listFilters = useMemo(
    () => ({
      ...sharedFilters,
      page,
      limit,
    }),
    [sharedFilters, page, limit],
  );
  const selectedSortLabel = getTaskSortLabel(selectedSortField);
  const isDefaultSort = selectedSortField === DEFAULT_TASK_SORT_FIELD && selectedSortDirection === DEFAULT_TASK_SORT_DIRECTION;

  const handleLimitChange = (newLimit: number | "all") => {
    if (newLimit === "all") {
      setLimit(500);
      setLimitIsAll(true);
      localStorage.setItem(LIMIT_STORAGE_KEY, "all");
    } else {
      setLimit(newLimit);
      setLimitIsAll(false);
      localStorage.setItem(LIMIT_STORAGE_KEY, String(newLimit));
    }
    setPage(1);
  };

  const handleSortFieldChange = (field: TaskSortField) => {
      if (selectedSortField === field) {
        setSelectedSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSelectedSortField(field);
        // Default to desc for dates, asc for others
        if (field === "createdAt" || field === "updatedAt" || field === "dueDate") {
          setSelectedSortDirection("desc");
        } else {
          setSelectedSortDirection("asc");
        }
      }
      setPage(1);
    };

    const toggleSortDirection = () => {
      setSelectedSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      setPage(1);
    };

    const resetSort = () => {
      setSelectedSortField(DEFAULT_TASK_SORT_FIELD);
      setSelectedSortDirection(DEFAULT_TASK_SORT_DIRECTION);
      setPage(1);
    };
  const kanbanFilters = useMemo(
    () => ({ ...sharedFilters, page: 1, limit: limitIsAll ? 1000 : limit }),
    [sharedFilters, limit, limitIsAll],
  );

  const listQuery = useTasksQuery(listFilters, {
    enabled: viewMode === "list" || viewMode === "table",
  });

  const isAnyFetching = listQuery.isFetching;

  const totalPages = Math.max(1, listQuery.data?.data.meta?.totalPages ?? 1);
  const listRows = useMemo(() => filterVisibleTasks(listQuery.data?.data.items ?? [], true), [listQuery.data]);
  
  const groupedTasks = useMemo(() => {
    if (viewMode !== "list") return {};
    const groups: Record<string, Task[]> = {};
    
    // Always initialize DRAFTS group first
    groups["DRAFTS"] = [];

    // Initialize groups from dynamic statuses using NAMES
    dynamicStatuses.forEach(s => {
      groups[s.name.toUpperCase()] = [];
    });
    
    // Fallback groups if none loaded
    if (dynamicStatuses.length === 0) {
      ["TODO", "IN PROGRESS", "DONE"].forEach(s => { groups[s] = []; });
    }
    
    listRows.forEach(task => {
      let normalizedName = "TODO";
      
      if (task.isDraft) {
        normalizedName = "DRAFTS";
      } else {
        const resolved = resolveStatus(task, dynamicStatuses);
        const statusName = resolved?.name || "TODO";
        normalizedName = statusName.toUpperCase();
      }
      
      if (!groups[normalizedName]) groups[normalizedName] = [];
      groups[normalizedName].push(task);
    });
    
    return groups;
  }, [listRows, dynamicStatuses, viewMode]);

  const getTaskId = (task: Task) => String(task.id || (task as any)._id || "");
  const getAssignees = (task: Task) => task.assigneeUsers ?? [];
  const tablePanelContext = useMemo(
    () =>
      buildPaginatedTaskPanelContext({
        sourceKey: `task-dashboard:table:${page}:${projectId}:${selectedSortField}:${selectedSortDirection}`,
        sourceLabel: page > 1 ? `Filtered tasks page ${page}` : "Filtered tasks",
        tasks: listRows,
        filters: listFilters,
        page,
        limit,
        totalPages,
      }),
    [
      limit,
      listFilters,
      listRows,
      page,
      projectId,
      selectedSortDirection,
      selectedSortField,
      totalPages,
    ],
  );

  const tasks = listQuery.data?.data?.items ?? [];
  const deletingTask = tasks.find((t) => (t.id || (t as any)._id) === deleteId);

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
    if (boardIds.length > 0) count += boardIds.length;
    return count;
  }, [status, priority, projectId, assigneeId, creatorId, dueDate, tagIds, boardIds, fixedProjectId]);

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
    setBoardIds([]);
    router.push("?");
  };

  const resolveProjectName = (idOrObj?: any) => {
    if (!idOrObj || idOrObj === "ALL") return "ALL";
    
    // If it's already an object with a name, return the name
    if (typeof idOrObj === 'object' && idOrObj.name) return idOrObj.name;
    
    // Extract ID if it's an object without name or just an ID string
    const id = typeof idOrObj === 'object' ? (idOrObj.id || idOrObj._id) : idOrObj;
    if (!id) return "Unknown";

    const project = (projectsQuery.data?.data.items ?? []).find(
      (p: any) => String(p.id || p._id) === String(id),
    );
    return project?.name || String(id);
  };

  const resolveAssigneeName = (idOrObj?: any) => {
    if (!idOrObj || idOrObj === "ALL") return "ALL";
    if (idOrObj === "UNASSIGNED") return "Unassigned";

    // If it's already an object with user info, return the name
    if (typeof idOrObj === 'object') {
      const name = `${idOrObj.firstName || ""} ${idOrObj.lastName || ""}`.trim() || idOrObj.name || idOrObj.email;
      if (name) return name;
    }
    
    const id = typeof idOrObj === 'object' ? (idOrObj.id || idOrObj._id) : idOrObj;
    if (!id) return "Unknown";

    const member = (membersQuery.data?.data.members ?? []).find(
      (m: any) => String(m.id || m._id) === String(id),
    );
    if (!member) return String(id);
    return `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email || String(id);
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
        sortBy: selectedSortField,
        sortOrder: selectedSortDirection,
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
        "w-full h-full flex flex-col",
        !isEmbedded && viewMode !== "kanban" && "mx-auto max-w-7xl"
      )}
    >
      {/* PROFESSIONAL TOOLBAR */}
      <div
        className={cn(
          "shrink-0 py-2 flex flex-col gap-2.5 border-b border-border/10 sticky top-0 z-30 transition-all duration-300",
          !isEmbedded && "bg-background/80 backdrop-blur-md",
          viewMode === "kanban" ? "px-4" : isEmbedded ? "px-0" : "px-1"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 w-full">
            {/* Search and Filters Unified */}
            <div className="relative flex-1 group">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search tasks..."
                className="h-10 rounded-button pl-10 pr-4 text-[13px] font-medium w-full bg-muted/10 border-border/40 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30 max-md:h-11"
              />
            </div>

            {!isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 rounded-button px-5 gap-2.5 border-border/40 bg-muted/10 font-bold text-xs transition-all hover:bg-muted/20 hover:border-border/60 active:scale-95",
                      activeFilterCount > 0 && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    )}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <Badge className="h-4.5 min-w-4.5 px-1 ml-0.5 flex items-center justify-center text-[9px] bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 rounded-button shadow-2xl border-border/40 bg-card/95 backdrop-blur-xl" align="start">
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

            <div className="flex items-center gap-2 shrink-0">
              {viewMode === "list" && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 max-w-48 rounded-button px-3.5 gap-2 border-border/40 bg-muted/10 text-[11px] font-bold transition-all hover:bg-muted/20 hover:border-border/60 active:scale-95",
                          !isDefaultSort && "border-primary/40 bg-primary/5 text-primary",
                        )}
                      >
                        <span className="truncate">Sort by: {selectedSortLabel}</span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-button border-border/40 p-1.5 shadow-2xl bg-card/95 backdrop-blur-xl">
                      {TASK_SORT_OPTIONS.map((option) => {
                        const isSelected = option.value === selectedSortField;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleSortFieldChange(option.value)}
                            className={cn(
                              "rounded-button py-2.5 text-sm font-medium cursor-pointer",
                              isSelected && "bg-primary/10 text-primary",
                            )}
                          >
                            <div className="flex w-full items-center justify-between gap-3">
                              <span>{option.label}</span>
                              {isSelected && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active</span>}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={resetSort}
                        className="rounded-button py-2.5 text-sm font-medium cursor-pointer"
                        disabled={isDefaultSort}
                      >
                        Reset to Default
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSortDirection}
                    className={cn(
                      "h-10 w-10 rounded-button border-border/40 bg-muted/10 text-xs font-black transition-all hover:bg-muted/20 hover:border-border/60 active:scale-95",
                      !isDefaultSort && "border-primary/40 bg-primary/5 text-primary",
                    )}
                  >
                    {isAnyFetching ? (
                      <Loader2 className="size-3.5 animate-spin opacity-70" />
                    ) : (
                      selectedSortDirection === "desc" ? "↓" : "↑"
                    )}
                  </Button>
                </>
              )}
            </div>

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
                  <Button variant="outline" size="icon" className="h-11 w-11 rounded-button border-border/40 bg-muted/10 relative shrink-0">
                    <SlidersHorizontal className="size-4" />
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 size-3.5 bg-primary text-[8px] rounded-full flex items-center justify-center text-white font-black shadow-sm">{activeFilterCount}</span>}
                  </Button>
                }
              />
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
            {/* View Switcher - Premium Toggle */}
            <div className="inline-flex flex-1 md:flex-none rounded-button border border-border/40 bg-muted/10 p-1 h-10 md:h-10 items-center shadow-inner-sm max-md:h-11">
                <Button
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (viewMode !== "kanban") {
                      setViewMode("kanban");
                      setPage(1);
                      setSelectedTaskIds([]);
                    }
                  }}
                  className={cn(
                    "h-8 px-4 rounded-button text-[11px] gap-1.5 font-black transition-all shrink-0 flex-1 md:flex-none max-md:h-9",
                    viewMode === "kanban" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Kanban className="size-3.5" /> <span className={cn(isMobile && "hidden")}>Board</span>
                </Button>

              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (viewMode !== "list") {
                    setViewMode("list");
                    setPage(1);
                    setSelectedTaskIds([]);
                  }
                }}
                className={cn(
                  "h-8 px-4 rounded-button text-[11px] gap-1.5 font-black transition-all shrink-0 flex-1 md:flex-none max-md:h-9",
                  viewMode === "list" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-3.5" /> <span className={cn(isMobile && "hidden")}>List</span>
              </Button>

              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (viewMode !== "table") {
                    setViewMode("table");
                    setPage(1);
                    setSelectedTaskIds([]);
                  }
                }}
                className={cn(
                  "h-8 px-4 rounded-button text-[11px] gap-1.5 font-black transition-all shrink-0 flex-1 md:flex-none max-md:h-9",
                  viewMode === "table" ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TableIcon className="size-3.5" /> <span className={cn(isMobile && "hidden")}>Table</span>
              </Button>
            </div>

            {/* Task Load Limit Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-button px-3 gap-1.5 border-border/40 bg-muted/10 font-bold text-[11px] transition-all hover:bg-muted/20 hover:border-border/60 active:scale-95 hidden md:flex items-center"
                >
                  <span className="text-muted-foreground">Load:</span>
                  <span>{limitIsAll ? "All" : limit}</span>
                  <ChevronDown className="size-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 rounded-button border-border/40 p-1.5 shadow-2xl bg-card/95 backdrop-blur-xl">
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onClick={() => handleLimitChange(opt)}
                    className={cn("rounded-button py-2 text-sm font-medium cursor-pointer", !limitIsAll && limit === opt && "bg-primary/10 text-primary")}
                  >
                    {opt} tasks
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleLimitChange("all")}
                  className={cn("rounded-button py-2 text-sm font-medium cursor-pointer", limitIsAll && "bg-primary/10 text-primary")}
                >
                  All (max 500)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isExporting}
                      className="h-10 w-10 md:h-10 md:w-10 rounded-button border-border/40 bg-muted/10 hover:bg-muted/20 transition-all text-muted-foreground shrink-0 shadow-sm max-md:h-11 max-md:w-11"
                    >
                      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] font-bold">Export Data</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48 rounded-button border-border/40 shadow-2xl p-1.5 bg-card/95 backdrop-blur-xl">
                <ExportTasksModal
                  selectedTaskIds={selectedTaskIds}
                  currentTasks={listRows}
                  filters={{
                    status: status,
                    priority: priority,
                    search: debouncedSearch,
                    assignee: assigneeId,
                    dueDate: dueDate
                  }}
                  projectId={projectId}
                  projectName={activeOrg?.name || "Current Workspace"}
                  boardName={status === "ALL" ? "All Boards" : (dynamicStatuses.find((s: any) => String(s.id || s._id) === status)?.name || "Main Kanban Board")}
                  trigger={
                    <DropdownMenuItem 
                      className="rounded-button py-2 cursor-pointer font-medium animate-in fade-in duration-350"
                      disabled={isExporting}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <FileText className="mr-2.5 size-4 opacity-70" /> Export as PDF
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem className="rounded-button py-2 cursor-pointer font-medium" disabled={isExporting} onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="mr-2.5 size-4 opacity-70" /> Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Task - Only show in global view or if specified */}
            {canMutate && !fixedProjectId && (
              <CreateTaskModal
                defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                trigger={
                  <Button size="sm" className="hidden md:inline-flex h-10 rounded-button font-black px-6 shadow-premium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all">
                    New Task
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* ACTIVE FILTERS CHIPS */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in slide-in-from-top-1 duration-300 -mt-0.5">
            <div className="flex items-center gap-1.5 pr-2">
              {status !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {dynamicStatuses.find((s: any) => (s.id || s._id) === status)?.name || status}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setStatus("ALL")} />
                </Badge>
              )}
              {priority !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {priority}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setPriority("ALL")} />
                </Badge>
              )}
              {!fixedProjectId && projectId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  {resolveProjectName(projectId)}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setProjectId("ALL")} />
                </Badge>
              )}
              {assigneeId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  Assigned: {resolveAssigneeName(assigneeId)}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setAssigneeId("ALL")} />
                </Badge>
              )}
              {creatorId !== "ALL" && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
                >
                  Created By: {resolveAssigneeName(creatorId)}
                  <X className="size-3 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setCreatorId("ALL")} />
                </Badge>
              )}
              {tagIds.map(tid => {
                const tag = allTags.find(t => t.id === tid);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="h-6 px-2 rounded-button text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap animate-in zoom-in-90"
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
                className="h-6 px-2 text-[10px] font-black text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 rounded-button"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col mt-2">
        {(viewMode === "list" || viewMode === "table") && (
          <>
            <div className="flex-1 overflow-auto custom-scrollbar pr-1 relative bg-card/20 rounded-button border border-border/40 shadow-inner-sm">
              {listQuery.isLoading ? (
                <div className="animate-in fade-in duration-500">
                  {viewMode === "table" ? <TaskTableSkeleton /> : <div className="p-4"><TaskListSkeleton /></div>}
                </div>
              ) : listRows.length === 0 ? (
                <div className="flex h-full items-center justify-center py-20 max-md:py-10">
                  <div className="flex flex-col items-center gap-4">
                    <EmptyState
                      title="No tasks found"
                      description="Try adjusting filters or create a task."
                    />
                    {canMutate && (
                      <CreateTaskModal
                        defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                        trigger={
                          <Button className="rounded-button font-bold px-8">
                            Create First Task
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-full">
                  {viewMode === "list" && (
                    <div className="flex flex-col gap-2 p-1.5">
	                      {Object.entries(groupedTasks).map(([statusName, tasks]) => {
	                        const isDraftGroup = statusName === "DRAFTS";
	                        const status = isDraftGroup ? null : dynamicStatuses.find(s => s.name.toUpperCase() === statusName);
	                        const displayName = isDraftGroup ? "Drafts" : (status?.name || statusName);
	                        const statusColor = isDraftGroup ? "#94a3b8" : (status?.color || "#94a3b8");
                          const groupPanelContext = buildSnapshotTaskPanelContext({
                            sourceKey: `task-dashboard:list:${statusName}:${page}`,
                            sourceLabel: displayName,
                            tasks,
                          });
	                        
	                        if (tasks.length === 0) return null; // Only show non-empty groups in global view

                        return (
                          <AccordionSection 
                            key={statusName}
                            title={displayName}
                            color={statusColor}
                            count={tasks.length}
                            defaultOpen={tasks.length > 0}
                          >
                            <div className="grid gap-2 p-1.5 pt-1">
                              {tasks.map((task) => {
                                const taskId = getTaskId(task);
                                const assignees = getAssignees(task);
                                return (
                                  <div
                                    key={taskId}
                                    className="rounded-button border border-border/10 bg-card/40 p-2.5 md:p-3 shadow-sm hover:border-primary/20 transition-all cursor-pointer"
		                                    onClick={() => {
		                                      const params = new URLSearchParams(searchParams.toString());
		                                      params.set("taskId", taskId);
		                                      openPanel(taskId, groupPanelContext);
		                                      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
		                                    }}
	                                  >
                                    <div className="flex items-start justify-between gap-3 mb-1.5">
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-[14px] hover:text-primary transition-colors block line-clamp-1 text-left w-full">
                                          {task.title}
                                        </h4>
                                        <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-tighter">
                                          {task.taskCode || `#${taskId.slice(-8)}`}
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
                                            color: getStatusColor(task, dynamicStatuses), 
                                            backgroundColor: `${getStatusColor(task, dynamicStatuses)}15` 
                                          }}
                                        >
                                          {getStatusName(task, dynamicStatuses)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2.5 border-t border-border/10 pt-2">
                                      <div className="flex items-center gap-2">
                                        {assignees.length > 0 ? (
                                          <div className="flex items-center -space-x-2">
                                            {assignees.slice(0, 3).map((a) => (
                                              <Avatar key={a.id} className="h-6 w-6 ring-2 ring-background border border-border/10 shadow-sm">
                                                <AvatarImage src={a.avatarUrl} />
                                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary uppercase flex items-center justify-center font-bold">
                                                  {a.name?.[0] || <User className="size-2.5" />}
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
                                        <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-30">
                                          {assignees.length === 0
                                            ? "Unassigned"
                                            : assignees.length === 1
                                              ? assignees[0].name
                                              : `${assignees.length} members`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                         {!isEmbedded && !fixedProjectId && (
                                            <span className="text-[10px] font-bold text-muted-foreground/30 bg-muted/20 px-2 py-0.5 rounded-button uppercase mr-2">
                                              {resolveProjectName(task.projectId)}
                                            </span>
                                         )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rawId = taskId;
                                              const taskCode = task.taskCode || (task as any).legacyId || `T-${rawId.slice(-4).toUpperCase()}`;
                                              const cmd = formatGitBranchCommand(taskCode, task.title);
                                              navigator.clipboard.writeText(cmd);
                                              toast.success("Copied branch command to clipboard!");
                                            }}
                                          >
                                            <GitBranch className="size-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTask(task);
                                            }}
                                          >
                                            <Pencil className="size-4" />
                                          </Button>
                                        {canMutate && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteId(taskId);
                                            }}
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
                          </AccordionSection>
                        );
                      })}
                    </div>
                  )}


                  {viewMode === "table" && (
                    <div className="animate-in fade-in duration-500">
                      <Table className="min-w-300 border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-md shadow-sm">
                          <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="w-12 pl-4 border-b border-border/50">
                              <Checkbox
                                checked={listRows.length > 0 && listRows.every(r => selectedTaskIds.includes(getTaskId(r)))}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const idsToAdd = listRows.map(r => getTaskId(r));
                                    setSelectedTaskIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                                  } else {
                                    const idsToRemove = listRows.map(r => getTaskId(r));
                                    setSelectedTaskIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead 
                              className="py-4 pl-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors group"
                              onClick={() => handleSortFieldChange("title")}
                            >
                              <div className="flex items-center gap-1.5">
                                Task Title
                                {selectedSortField === "title" && (
                                  <span className="text-primary font-black animate-in fade-in slide-in-from-bottom-1 duration-300">
                                    {isAnyFetching ? <Loader2 className="size-3 animate-spin" /> : (selectedSortDirection === "asc" ? "↑" : "↓")}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleSortFieldChange("assignee")}
                            >
                               <div className="flex items-center gap-1.5">
                                Assignee
                                {selectedSortField === "assignee" && (
                                  <span className="text-primary font-black">
                                    {isAnyFetching ? <Loader2 className="size-3 animate-spin" /> : (selectedSortDirection === "asc" ? "↑" : "↓")}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleSortFieldChange("status")}
                            >
                              <div className="flex items-center gap-1.5">
                                Status
                                {selectedSortField === "status" && (
                                  <span className="text-primary font-black">
                                    {isAnyFetching ? <Loader2 className="size-3 animate-spin" /> : (selectedSortDirection === "asc" ? "↑" : "↓")}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleSortFieldChange("priority")}
                            >
                              <div className="flex items-center gap-1.5">
                                Priority
                                {selectedSortField === "priority" && (
                                  <span className="text-primary font-black">
                                    {selectedSortDirection === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50">
                              Created By
                            </TableHead>
                            <TableHead 
                              className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleSortFieldChange("createdAt")}
                            >
                              <div className="flex items-center gap-1.5">
                                Created Time
                                 {selectedSortField === "createdAt" && (
                                  <span className="text-primary font-black">
                                    {isAnyFetching ? <Loader2 className="size-3 animate-spin" /> : (selectedSortDirection === "asc" ? "↑" : "↓")}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead className={cn("font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50", fixedProjectId && "hidden")}>
                              Project
                            </TableHead>
                            <TableHead 
                              className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50 cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleSortFieldChange("dueDate")}
                            >
                              <div className="flex items-center gap-1.5">
                                Due Date
                                {selectedSortField === "dueDate" && (
                                  <span className="text-primary font-black">
                                    {isAnyFetching ? <Loader2 className="size-3 animate-spin" /> : (selectedSortDirection === "asc" ? "↑" : "↓")}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/50 border-b border-border/50">
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
                                getStatusName(task.status, dynamicStatuses).toUpperCase() !== "DONE"
                              }
                              canMutate={canMutate}
                              setSelectedTask={setSelectedTask}
                              setDeleteId={setDeleteId}
                              hideProject={Boolean(fixedProjectId)}
                              dynamicStatuses={dynamicStatuses}
                              panelContext={tablePanelContext}
                              selectedTaskIds={selectedTaskIds}
                              setSelectedTaskIds={setSelectedTaskIds}
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
                {viewMode === "table" && (
                  <Select
                    value={String(limit)}
                    onValueChange={(val) => {
                      setLimit(parseInt(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-26.25 sm:w-28 rounded-button bg-muted/20 border-border/40 text-[10px] sm:text-[11px] font-bold shadow-sm">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent className="rounded-button border-border/40">
                      {PAGE_SIZE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={String(opt)} className="text-xs font-medium">
                          {opt} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="hidden md:inline text-[11px] text-muted-foreground/60 font-bold uppercase tracking-tight">
                  Showing {listRows.length} tasks
                </span>
              </div>

              {viewMode === "table" && (
                <div className="flex-1 sm:flex-none">
                  <PaginationMeta
                    page={page}
                    totalPages={totalPages}
                    isFetching={listQuery.isFetching}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </>
        )}


        {viewMode === "kanban" && (
          <div className="flex-1 w-full overflow-hidden flex flex-col pt-0 animate-in fade-in zoom-in-95 duration-500">
            <TaskBoard
              filters={kanbanFilters}
              projectId={projectId !== "ALL" ? projectId : undefined}
              canEdit={canMutate}
              isEmbedded={isEmbedded}
            />
          </div>
        )}
      </div>

      <DeleteTaskModal
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        taskTitle={deletingTask?.title}
        isPending={deleteTask.isPending}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteTask.mutateAsync(deleteId);
            setDeleteId(null);
            toast.success("Task deleted");
          } catch (err: any) {
            const errorMsg = err.response?.data?.message || "Task deletion failed";
            toast.error(errorMsg);
          }
        }}
      />

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
              className="fixed bottom-20 right-4 size-14 rounded-full shadow-2xl shadow-primary/40 z-50 animate-in zoom-in slide-in-from-bottom-10 duration-500 active:scale-95 transition-transform"
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
  boardIds, setBoardIds,
  viewMode,
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
    setBoardIds([]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:max-w-md bg-background/95 backdrop-blur-md border-border/10 rounded-l-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border/10 shrink-0">
          <SheetTitle className="text-2xl font-black tracking-tighter">Filters</SheetTitle>
          <SheetDescription className="font-medium text-muted-foreground/70">
            Narrow down tasks by specific criteria
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-6">
          {viewMode === "kanban" ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">Visible Boards</label>
              <BoardSelect
                selectedBoardIds={boardIds}
                onChange={setBoardIds}
                dynamicStatuses={dynamicStatuses}
              />
            </div>
          ) : (
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[
              { v: "ALL", l: "All Statuses" },
              ...(dynamicStatuses || []).map((s: any) => ({
                v: s.id || s._id,
                l: s.name
              }))
            ]} />
          )}

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
                <SelectTrigger className="rounded-button bg-muted/10 border-border/40 h-11">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="rounded-button">
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
              <SelectTrigger className="rounded-button bg-muted/10 border-border/40 h-11">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent className="rounded-button">
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
              <SelectTrigger className="rounded-button bg-muted/10 border-border/40 h-11">
                <SelectValue placeholder="All Creators" />
              </SelectTrigger>
              <SelectContent className="rounded-button">
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
                value={dueDate ? new Date(dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`) : undefined}
                onChange={(date) => setDueDate(typeof date === "string" ? date : "")}
                placeholder="Select date"
                className="p-1 border border-border/20 rounded-button bg-muted/5 origin-left"
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
          <Button variant="outline" onClick={clearFilters} className="flex-1 rounded-button h-11 font-bold">Clear</Button>
          <SheetClose asChild>
            <Button className="flex-1 rounded-button h-11 font-bold shadow-lg shadow-primary/20">Apply</Button>
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
        <SelectTrigger className="rounded-button bg-muted/10 border-border/40 h-11">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent className="rounded-button">
          {options.map((o: any) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function BoardSelect({ selectedBoardIds, onChange, dynamicStatuses }: { selectedBoardIds: string[], onChange: (ids: string[]) => void, dynamicStatuses: any[] }) {
  const toggleBoard = (id: string) => {
    if (selectedBoardIds.includes(id)) {
      onChange(selectedBoardIds.filter(b => b !== id));
    } else {
      onChange([...selectedBoardIds, id]);
    }
  };

  const isAllSelected = selectedBoardIds.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => onChange([])}
        className={cn(
          "flex items-center justify-between w-full h-10 px-3 rounded-button border text-sm transition-colors",
          isAllSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/10 border-border/40 hover:bg-muted/20"
        )}
      >
        <span className="font-medium">All Boards</span>
        {isAllSelected && <Check className="size-4" />}
      </button>
      <div className="flex flex-col gap-1.5 mt-1">
        {dynamicStatuses.map(s => {
          const id = s.id || s._id;
          const isSelected = selectedBoardIds.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggleBoard(id)}
              className={cn(
                "flex items-center justify-between w-full h-9 px-3 rounded-button border text-[13px] transition-colors",
                isSelected ? "bg-primary/5 border-primary/20 text-primary" : "bg-transparent border-transparent hover:bg-muted/10"
              )}
            >
              <span>{s.name}</span>
              {isSelected && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>
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
        className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 rounded-xs sm:rounded-button border-border/40 bg-background/50"
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
        className="h-8 w-8 sm:h-9 sm:w-auto sm:px-4 rounded-xs sm:rounded-button border-border/40 bg-background/50"
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
  viewMode = "kanban",
  status, setStatus,
  priority, setPriority,
  projectId, setProjectId,
  assigneeId, setAssigneeId,
  creatorId, setCreatorId,
  dueDate, setDueDate,
  tagIds, setTagIds,
  boardIds, setBoardIds,
  clearFilters,
  projectsQuery,
  membersQuery,
  dynamicStatuses,
  hideProjectFilter
}: any) {
  return (
    <div className={cn("flex flex-col h-full", !isMobileView && "max-h-120")}>
      <div className={cn("flex-1 overflow-y-auto pr-1 space-y-4 pt-1 pb-4 custom-scrollbar")}>
        {isMobileView && viewMode === "kanban" ? (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Visible Boards</label>
            <BoardSelect
              selectedBoardIds={boardIds}
              onChange={setBoardIds}
              dynamicStatuses={dynamicStatuses}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 rounded-button bg-muted/20 border-border/40 focus:ring-0 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-button border-border/40">
                <SelectItem value="ALL">All Statuses</SelectItem>
                {dynamicStatuses.map((s: any) => (
                  <SelectItem key={s.id || s._id} value={s.id || s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 rounded-button bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent className="rounded-button border-border/40">
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
              <SelectTrigger className="h-9 rounded-button bg-muted/20 border-border/40 focus:ring-0 text-xs">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="rounded-button border-border/40">
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
            <SelectTrigger className="h-9 rounded-button bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent className="rounded-button border-border/40">
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
            <SelectTrigger className="h-9 rounded-button bg-muted/20 border-border/40 focus:ring-0 text-xs">
              <SelectValue placeholder="All Creators" />
            </SelectTrigger>
            <SelectContent className="rounded-button border-border/40">
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
              value={dueDate ? new Date(dueDate.includes("T") ? dueDate : `${dueDate}T12:00:00`) : undefined}
              onChange={(date) => setDueDate(typeof date === "string" ? date : "")}
              placeholder="Select date"
              className="p-1 border border-border/20 rounded-card bg-muted/5 origin-left"
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
          className="flex-1 h-10 rounded-button text-xs font-semibold hover:bg-muted/30"
          onClick={clearFilters}
        >
          Clear
        </Button>
        {!isMobileView && (
          <PopoverClose asChild>
            <Button
              className="flex-1 h-10 rounded-button text-xs font-bold shadow-lg shadow-primary/20"
            >
              Apply
            </Button>
          </PopoverClose>
        )}
      </div>
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

const getStatusName = (task: any, dynamicStatuses: any[]) => {
  if (task?.isDraft) return "Draft";
  const status = task?.status;
  if (!status) return "Unknown";
  const resolved = resolveStatus(task, dynamicStatuses);
  if (resolved) return resolved.name;
  if (typeof status === 'object') return (status as any).name || "Unknown";
  return String(status);
};

const getStatusColor = (task: any, dynamicStatuses: any[]) => {
  if (task?.isDraft) return "#94a3b8";
  const status = task?.status;
  if (!status) return "#94a3b8";
  const resolved = resolveStatus(task, dynamicStatuses);
  return resolved?.color || "#94a3b8";
};

function TaskRow({ 
  task, 
  idx, 
  taskId, 
  assignees, 
  isOverdue, 
  canMutate, 
  setSelectedTask, 
  setDeleteId,
  hideProject,
  dynamicStatuses
}: any) {
  return (
    <TableRow
      key={taskId}
      className={cn(
        "group cursor-pointer border-border/40 hover:bg-muted/5 transition-colors",
        isOverdue && "bg-rose-500/2"
      )}
      onClick={() => setSelectedTask(task)}
    >
      <TableCell className="py-2.5 pl-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground/30 w-16 shrink-0 group-hover:text-primary transition-colors">
            {task.taskCode || `#${taskId.slice(-8)}`}
          </span>
          <span className="text-[13px] font-medium text-foreground line-clamp-1">{task.title}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center -space-x-2">
          {assignees.slice(0, 3).map((a: any) => (
            <Avatar key={a.id} className="h-6 w-6 ring-2 ring-background border border-border/10 shadow-sm">
              <AvatarImage src={a.avatarUrl} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary uppercase flex items-center justify-center font-bold">
                {a.firstName?.[0] || a.name?.[0] || <User className="size-2.5" />}
              </AvatarFallback>
            </Avatar>
          ))}
          {assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold border-2 border-background shadow-sm">
              +{assignees.length - 3}
            </div>
          )}
          {assignees.length === 0 && (
            <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
              <User className="size-3 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className="h-5 px-2 rounded-full text-[9px] font-bold uppercase tracking-tight border-none"
          style={{ 
            color: getStatusColor(task, dynamicStatuses), 
            backgroundColor: `${getStatusColor(task, dynamicStatuses)}15` 
          }}
        >
          {getStatusName(task, dynamicStatuses)}
        </Badge>
      </TableCell>
      <TableCell>
        {task.priority && (
          <Badge 
            variant="outline" 
            className={cn(
              "h-5 px-2 rounded-full text-[9px] font-bold uppercase tracking-tight",
              task.priority === "HIGH" || task.priority === "URGENT" ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-muted-foreground"
            )}
          >
            {String(task.priority)}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground font-medium">
          {(task as any).creator?.name || (task as any).creator?.email || "System"}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground font-medium">
          {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "-"}
        </span>
      </TableCell>
      <TableCell className={cn(hideProject && "hidden")}>
        <Badge variant="outline" className="h-5 text-[9px] font-bold bg-muted/20 border-border/10 text-muted-foreground/60 uppercase">
          {task.projectName || "PMS"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="size-3" />
          <span className={cn("text-[11px] font-bold uppercase tracking-tighter", isOverdue && "text-rose-500")}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const rawId = String(task.id || (task as any)._id || "");
              const taskCode = task.taskCode || (task as any).legacyId || `T-${rawId.slice(-4).toUpperCase()}`;
              const cmd = formatGitBranchCommand(taskCode, task.title);
              navigator.clipboard.writeText(cmd);
              toast.success("Copied branch command to clipboard!");
            }}
          >
            <GitBranch className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTask(task);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          {canMutate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(taskId);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
