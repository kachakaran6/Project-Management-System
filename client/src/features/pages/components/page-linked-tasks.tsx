import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pageApi } from "@/features/pages/api/page.api";
import { taskApi } from "@/features/tasks/api/task.api";
import { PageTaskLink, Task, TaskPriority, TaskStatus } from "@/types/task.types";
import { 
  CheckSquare, Plus, X, Search, Loader2, 
  Folder, User, Check, Layers, AlertCircle, Sparkles, Flag, Calendar, Link as LinkIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchTaskByIdQuery, useProjectTasksInfiniteQuery } from "@/features/tasks/hooks/use-tasks-query";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useDebounce } from "@/hooks/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { buildSnapshotTaskPanelContext } from "@/features/tasks/utils/task-panel-navigation";
import { usePathname, useRouter, useSearchParams } from "@/lib/next-navigation";

interface PageLinkedTasksProps {
  pageId: string;
  canEdit: boolean;
}

export function PageLinkedTasks({ pageId, canEdit }: PageLinkedTasksProps) {
  const queryClient = useQueryClient();
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const { openPanel } = useTaskPanelStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["page-tasks", pageId],
    queryFn: () => pageApi.getLinkedTasks(pageId),
  });

  const tasks: PageTaskLink[] = data?.data || [];
  const linkedTaskPanelContext = useMemo(
    () =>
      buildSnapshotTaskPanelContext({
        sourceKey: `page-linked-tasks:${pageId}`,
        sourceLabel: "Linked tasks",
        tasks,
      }),
    [pageId, tasks],
  );

  const detachMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.detachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      toast.success("Task detached from page");
    },
    onError: () => toast.error("Failed to detach task"),
  });

  if (isLoading) {
    return (
      <section className="rounded-card border border-border/60 bg-card p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
          Linked Tasks
        </h3>
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border/60 bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked Tasks
        </h3>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsAttachModalOpen(true)}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No linked tasks.</p>
        ) : (
          tasks.map((task) => (
	            <div
	              key={task.id}
	              className="group relative flex flex-col gap-1 rounded-card border border-border/40 p-2 hover:bg-muted/50"
	            >
	              <div className="flex items-start justify-between gap-2">
	                <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set("taskId", task.id);
                        router.push(`${pathname}?${params.toString()}`, { scroll: false });
                        openPanel(task.id, linkedTaskPanelContext);
                      }}
	                  className="flex items-start gap-1.5 min-w-0 flex-1"
	                >
	                  <CheckSquare className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
	                  <span className="text-[12px] font-medium leading-tight truncate hover:text-primary transition-colors">
	                    {task.title}
	                  </span>
	                </button>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      detachMutation.mutate(task.id);
                    }}
                    className="size-5 shrink-0 rounded flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={detachMutation.isPending}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-5">
                <span className="text-[9px] font-mono text-indigo-500/70 bg-indigo-500/10 px-1 py-0.5 rounded-sm">
                  {task.taskCode || `T-${task.id.slice(-4).toUpperCase()}`}
                </span>
                {task.status && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm"
                    style={{ backgroundColor: `${task.status.color}15`, color: task.status.color }}
                  >
                    {task.status.name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isAttachModalOpen && (
        <AttachTaskModal
          pageId={pageId}
          isOpen={isAttachModalOpen}
          onClose={() => setIsAttachModalOpen(false)}
        />
      )}
    </section>
  );
}

function AttachTaskModal({
  pageId,
  isOpen,
  onClose,
}: {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const currentUserId = user?.id || "";

  // Tab State
  const [activeTab, setActiveTab] = useState<"id" | "browse">("id");

  // Linked tasks cache lookup to prevent duplicates
  const linkedTasksData = queryClient.getQueryData<{ data: PageTaskLink[] }>(["page-tasks", pageId]);
  const alreadyLinkedTaskIds = useMemo(() => {
    return (linkedTasksData?.data || []).map((t) => t.id);
  }, [linkedTasksData]);

  // OPTION 1: LINK BY ID STATE
  const [idInput, setIdInput] = useState("");
  const debouncedId = useDebounce(idInput, 300);
  const { data: idTaskRes, isLoading: isIdLoading, error: idError } = useSearchTaskByIdQuery(
    debouncedId,
    { enabled: activeTab === "id" && !!debouncedId }
  );

  const foundTask = idTaskRes?.data;
  const isAlreadyLinked = foundTask ? alreadyLinkedTaskIds.includes(foundTask.id || (foundTask as any)._id) : false;

  // OPTION 2: BROWSE & SELECT STATE
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [taskSource, setTaskSource] = useState<"all" | "my" | "status" | "unlinked">("all");
  const [selectedStatusId, setSelectedStatusId] = useState<string>("ALL");
  const [browseSearch, setBrowseSearch] = useState("");
  const debouncedBrowseSearch = useDebounce(browseSearch, 300);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Project list
  const { data: projectsRes, isLoading: isProjectsLoading } = useProjectsQuery({ page: 1, limit: 100 }, { enabled: isOpen });
  const projects = projectsRes?.data?.items || [];

  // Statuses list
  const { data: statuses = [] } = useStatusesQuery({ enabled: isOpen });

  // Reset browse choices on project change
  useEffect(() => {
    setSelectedTaskIds([]);
    setSelectedStatusId("ALL");
    setTaskSource("all");
  }, [selectedProjectId]);

  // Query filter builder for browse
  const browseFilters = useMemo(() => {
    const filters: any = {
      limit: 15,
      search: debouncedBrowseSearch || undefined,
    };
    if (taskSource === "my") {
      filters.assigneeId = currentUserId;
    }
    if (taskSource === "status" && selectedStatusId !== "ALL") {
      filters.status = selectedStatusId;
    }
    return filters;
  }, [taskSource, selectedStatusId, debouncedBrowseSearch, currentUserId]);

  // Project tasks infinite list query
  const { 
    data: projectTasksData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isProjectTasksLoading 
  } = useProjectTasksInfiniteQuery(
    selectedProjectId,
    browseFilters,
    { enabled: activeTab === "browse" && !!selectedProjectId }
  );

  const browseTasks = useMemo(() => {
    return projectTasksData?.pages.flatMap((page: any) => page.data?.items || []) || [];
  }, [projectTasksData]);

  const totalBrowseCount = projectTasksData?.pages?.[0]?.data?.meta?.totalItems ?? browseTasks.length;

  // Filter unlinked on client if "unlinked" source selected
  const displayedBrowseTasks = useMemo(() => {
    if (taskSource === "unlinked") {
      return browseTasks.filter(t => !alreadyLinkedTaskIds.includes(t.id || (t as any)._id));
    }
    return browseTasks;
  }, [browseTasks, taskSource, alreadyLinkedTaskIds]);

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mutate: Single Attach
  const attachMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.attachPage(taskId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      toast.success("Task linked successfully");
      onClose();
    },
    onError: () => toast.error("Failed to link task"),
  });

  // Mutate: Bulk Attach
  const bulkAttachMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(taskIds.map((tid) => taskApi.attachPage(tid, pageId)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-tasks", pageId] });
      toast.success("Tasks linked successfully");
      onClose();
    },
    onError: () => toast.error("Failed to link some tasks"),
  });

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkLink = () => {
    if (selectedTaskIds.length === 0) return;
    bulkAttachMutation.mutate(selectedTaskIds);
  };

  const getPriorityConfig = (priority?: string) => {
    switch (priority) {
      case "URGENT": return { label: "Urgent", color: "text-rose-500 bg-rose-500/10", fill: "#f43f5e" };
      case "HIGH": return { label: "High", color: "text-amber-500 bg-amber-500/10", fill: "#f59e0b" };
      case "LOW": return { label: "Low", color: "text-emerald-500 bg-emerald-500/10", fill: "#10b981" };
      default: return { label: "Medium", color: "text-blue-500 bg-blue-500/10", fill: "#3b82f6" };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-modal flex flex-col h-[80vh] max-h-[680px] gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-base font-black uppercase tracking-wider text-foreground/80 flex items-center gap-2">
            <LinkIcon className="size-4 text-primary" />
            Link Task to Page
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 border-b bg-muted/5 shrink-0 flex items-center justify-between">
            <TabsList className="bg-muted/30 border border-border/20 rounded-button">
              <TabsTrigger value="id" className="text-xs font-bold rounded-button">Link by Task ID</TabsTrigger>
              <TabsTrigger value="browse" className="text-xs font-bold rounded-button">Browse Projects</TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: LINK BY ID */}
          <TabsContent value="id" className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto m-0">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Task ID or Structured Code</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Enter Task ID (e.g. PMS-198 or Mongo ID)"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-button border bg-muted/10 border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/30 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center">
              {isIdLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="size-8 animate-spin text-primary opacity-50" />
                  <p className="text-xs text-muted-foreground animate-pulse font-medium">Validating Task ID...</p>
                </div>
              ) : !debouncedId ? (
                <div className="text-center max-w-sm space-y-2 py-8 opacity-40">
                  <Sparkles className="size-8 mx-auto text-primary" />
                  <p className="text-xs font-semibold">Enter a task code or ID to get started.</p>
                  <p className="text-[11px] text-muted-foreground">We search matching task code prefixes, legacy identifiers, and database ObjectIDs automatically.</p>
                </div>
              ) : idError || !foundTask ? (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="size-8 text-rose-500 mx-auto opacity-70" />
                  <p className="text-xs font-bold text-rose-500/80">Task Not Found</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">Double-check the code format (e.g., must match active project code prefix and sequence number like PMS-198).</p>
                </div>
              ) : (
                <div className="w-full max-w-md border border-border/40 bg-card/40 rounded-button p-4 flex flex-col gap-4 shadow-sm hover:border-primary/20 transition-all animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-indigo-500/70 bg-indigo-500/10 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        {foundTask.taskCode || `T-${(foundTask.id || (foundTask as any)._id).slice(-4).toUpperCase()}`}
                      </span>
                      <h4 className="text-sm font-bold text-foreground mt-2 line-clamp-2 leading-tight">
                        {foundTask.title}
                      </h4>
                    </div>
                    {foundTask.priority && (
                      <Badge variant="outline" className={`h-5 px-2 rounded-full text-[9px] font-bold uppercase shrink-0 ${getPriorityConfig(foundTask.priority).color} border-none`}>
                        {foundTask.priority}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/10 pt-3 mt-1">
                    <div className="flex items-center gap-2">
                      <Folder className="size-3.5 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground font-semibold">
                        {foundTask.projectId?.name || "General"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="size-3.5 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground font-semibold">
                        {foundTask.status?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    {isAlreadyLinked ? (
                      <Button className="w-full h-10 rounded-button font-bold text-xs bg-muted/40 border border-border/40 text-muted-foreground cursor-not-allowed" disabled>
                        Already Linked
                      </Button>
                    ) : (
                      <Button
                        className="w-full h-10 rounded-button font-black text-xs uppercase tracking-wider shadow-premium bg-primary text-primary-foreground hover:scale-[1.01] active:scale-95 transition-all"
                        onClick={() => attachMutation.mutate(foundTask.id || (foundTask as any)._id)}
                        disabled={attachMutation.isPending}
                      >
                        {attachMutation.isPending ? <Loader2 className="mr-2 size-3 animate-spin" /> : "Link Task to Page"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: BROWSE PROJECTS */}
          <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0">
            {/* STEP 1: Select Project Filter */}
            <div className="px-6 py-4 border-b bg-muted/5 shrink-0 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-button bg-muted/10 border-border/40">
                    <SelectValue placeholder="Select Project..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-button border-border/40">
                    {isProjectsLoading ? (
                      <SelectItem value="loading" disabled className="text-xs font-medium">Loading projects...</SelectItem>
                    ) : projects.length === 0 ? (
                      <SelectItem value="empty" disabled className="text-xs font-medium">No projects available</SelectItem>
                    ) : (
                      projects.map((p: any) => (
                        <SelectItem key={p.id || p._id} value={p.id || p._id} className="text-xs font-medium">
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProjectId && (
                <div className="flex items-center gap-1 bg-muted/30 border border-border/20 rounded-button p-0.5 h-10">
                  {(["all", "my", "unlinked", "status"] as const).map((source) => (
                    <button
                      key={source}
                      onClick={() => setTaskSource(source)}
                      className={cn(
                        "h-8 px-3 rounded-button text-[10px] font-black uppercase tracking-wider transition-all",
                        taskSource === source
                          ? "bg-background text-foreground shadow-sm font-black border border-border/10"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {source === "all" ? "All" : source === "my" ? "My Tasks" : source === "unlinked" ? "Unlinked" : "By Status"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Status Dropdown if Source is "status" */}
            {selectedProjectId && taskSource === "status" && (
              <div className="px-6 py-2.5 border-b bg-muted/10 shrink-0 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">Status:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedStatusId("ALL")}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all",
                      selectedStatusId === "ALL"
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : "bg-muted border-border/20 text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    All
                  </button>
                  {statuses.map((s: any) => {
                    const sid = s.id || s._id;
                    return (
                      <button
                        key={sid}
                        onClick={() => setSelectedStatusId(sid)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1.5",
                          selectedStatusId === sid
                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                            : "bg-muted border-border/20 text-muted-foreground hover:bg-muted/70"
                        )}
                      >
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Input for Browse */}
            {selectedProjectId && (
              <div className="px-6 py-2 border-b bg-muted/5 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
                  <input
                    type="text"
                    placeholder="Search tasks within project..."
                    value={browseSearch}
                    onChange={(e) => setBrowseSearch(e.target.value)}
                    className="w-full h-8 pl-9 pr-3 text-xs rounded-button border bg-background border-border/20 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* TASK LIST AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar flex flex-col">
              {!selectedProjectId ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground/30 gap-3">
                  <Folder className="size-12 opacity-30" />
                  <p className="text-xs font-bold uppercase tracking-[0.25em]">Select a Project first</p>
                </div>
              ) : isProjectTasksLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-6 animate-spin text-primary opacity-30" />
                    <p className="text-xs text-muted-foreground animate-pulse">Loading tasks...</p>
                  </div>
                </div>
              ) : displayedBrowseTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground/30 gap-2">
                  <CheckSquare className="size-10 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-wider">No matching tasks found</p>
                </div>
              ) : (
                <div className="p-4 space-y-1.5">
                  {displayedBrowseTasks.map((task: any) => {
                    const tidVal = task.id || task._id;
                    const taskCode = task.taskCode || `T-${String(tidVal).slice(-4).toUpperCase()}`;
                    const linked = alreadyLinkedTaskIds.includes(tidVal);
                    const selected = selectedTaskIds.includes(tidVal);

                    return (
                      <div
                        key={tidVal}
                        onClick={() => !linked && handleToggleSelectTask(tidVal)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-button border transition-colors select-none",
                          linked
                            ? "bg-muted/10 border-border/10 opacity-60 cursor-not-allowed"
                            : selected
                              ? "bg-primary/[0.03] border-primary/20 cursor-pointer"
                              : "bg-card border-border/40 hover:bg-muted/30 cursor-pointer hover:border-border/60"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <Checkbox
                            checked={linked || selected}
                            disabled={linked}
                            onCheckedChange={() => !linked && handleToggleSelectTask(tidVal)}
                            className="rounded-xs"
                          />
                          <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-xs shrink-0 uppercase tracking-wider">
                            {taskCode}
                          </span>
                          <span className="text-xs font-bold truncate pr-2 text-foreground/80">
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {task.priority && (
                            <Badge variant="outline" className={`h-4.5 px-1.5 rounded-xs text-[8px] font-black uppercase ${getPriorityConfig(task.priority).color} border-none`}>
                              {task.priority}
                            </Badge>
                          )}
                          
                          {task.status && (
                            <Badge variant="outline" className="h-4.5 px-1.5 rounded-xs text-[8px] font-black uppercase border-none" style={{ color: task.status.color, backgroundColor: `${task.status.color}15` }}>
                              {task.status.name}
                            </Badge>
                          )}

                          {linked ? (
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xs uppercase tracking-widest shrink-0 ml-1.5">
                              Linked
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {/* Intersection Observer Target */}
                  <div ref={observerTarget} className="h-10 flex items-center justify-center mt-2.5 shrink-0">
                    {isFetchingNextPage && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              )}
            </div>

            {/* Browse Options Footer */}
            {selectedProjectId && !isProjectTasksLoading && (
              <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                  Showing {browseTasks.length} of {totalBrowseCount} tasks
                </span>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 text-xs font-bold rounded-button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkLink}
                    disabled={selectedTaskIds.length === 0 || bulkAttachMutation.isPending}
                    className="h-9 text-xs font-black uppercase tracking-wider rounded-button px-6 shadow-premium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {bulkAttachMutation.isPending ? <Loader2 className="mr-2 size-3 animate-spin" /> : `Link Selected (${selectedTaskIds.length})`}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
