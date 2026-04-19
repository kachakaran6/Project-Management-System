"use client";

import Link from "@/lib/next-link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Kanban,
  List,
  Table as TableIcon,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  Settings2,
  Filter,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [status, setStatus] = useState<string>(searchParams.get("status") || "ALL");
  const [priority, setPriority] = useState<string>(searchParams.get("priority") || "ALL");
  const [projectId, setProjectId] = useState<string>(searchParams.get("projectId") || "ALL");
  const [assigneeId, setAssigneeId] = useState<string>(searchParams.get("assigneeId") || "ALL");
  const [dueDate, setDueDate] = useState(searchParams.get("dueDate") || "");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    if (status !== "ALL") params.set("status", status); else params.delete("status");
    if (priority !== "ALL") params.set("priority", priority); else params.delete("priority");
    if (projectId !== "ALL") params.set("projectId", projectId); else params.delete("projectId");
    if (assigneeId !== "ALL") params.set("assigneeId", assigneeId); else params.delete("assigneeId");
    if (dueDate) params.set("dueDate", dueDate); else params.delete("dueDate");
    router.replace(`?${params.toString()}`);
  }, [status, priority, projectId, assigneeId, dueDate, router]);

  const sharedFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: status === "ALL" || !status ? undefined : (status as TaskStatus),
    priority: priority === "ALL" || !priority ? undefined : (priority as TaskPriority),
    projectId: projectId === "ALL" || !projectId ? undefined : projectId,
    assigneeId: assigneeId === "ALL" || !assigneeId ? undefined : assigneeId,
    dueDate: dueDate || undefined,
  }), [debouncedSearch, status, priority, projectId, assigneeId, dueDate]);

  const listFilters = useMemo(() => ({ ...sharedFilters, page, limit: PAGE_SIZE }), [sharedFilters, page]);
  const kanbanFilters = useMemo(() => ({ ...sharedFilters, page: 1, limit: 1000 }), [sharedFilters]);

  const listQuery = useTasksQuery(listFilters, { enabled: viewMode === "list" || viewMode === "table" });
  const kanbanQuery = useTasksQuery(kanbanFilters, { enabled: viewMode === "kanban" && !isMobile });

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
    if (dueDate) count++;
    return count;
  }, [status, priority, projectId, assigneeId, dueDate]);

  const clearFilters = () => {
    setPage(1); setSearch(""); setStatus("ALL"); setPriority("ALL"); setProjectId("ALL"); setAssigneeId("ALL"); setDueDate("");
    router.push("?");
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl flex flex-col overflow-hidden",
        "h-[calc(100vh-64px)]", // Constrain height to viewport minus header
      )}>
      <div className={cn("shrink-0 space-y-3", viewMode === "kanban" && "px-1")}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
          <div className="flex items-center gap-2 w-full lg:flex-1">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search tasks..."
                className="h-10 rounded-xl pl-9 text-sm w-full bg-muted/20 border-border/40 focus:bg-background transition-all"
              />
            </div>

            {/* Mobile Filter Trigger */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3 rounded-xl gap-2 relative border-border/40 bg-muted/20 font-medium text-xs">
                    <Filter className="size-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-2 border-background">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl p-6 h-[70vh] flex flex-col">
                  <SheetHeader className="text-left pb-4 border-b border-border/40">
                    <SheetTitle className="text-xl font-bold">Filters</SheetTitle>
                    <SheetDescription>Refine your task list</SheetDescription>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto py-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ALL">All Priorities</SelectItem>
                          <SelectItem value="LOW">Low Edition</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Project</label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ALL">All Projects</SelectItem>
                          {(projectsQuery.data?.data.items ?? []).map((p: any) => (
                            <SelectItem key={p.id || p._id} value={p.id || p._id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assignee</label>
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ALL">All Assignees</SelectItem>
                          {(membersQuery.data?.data.members ?? []).map((m: any) => (
                            <SelectItem key={m.id || m._id} value={m.id || m._id}>{`${m.firstName} ${m.lastName}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <SheetFooter className="pt-4 border-t border-border/40 grid grid-cols-2 gap-3 items-center mt-auto">
                    <Button variant="ghost" className="h-12 rounded-xl text-muted-foreground font-semibold" onClick={clearFilters}>
                      Clear All
                    </Button>
                    <SheetTrigger asChild>
                      <Button className="h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                        Apply Filters
                      </Button>
                    </SheetTrigger>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {!isMobile && (
            <div className="hidden lg:flex lg:flex-row gap-2">
              <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
                <SelectTrigger className="h-10 w-full lg:w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={(v) => { setPage(1); setPriority(v); }}>
                <SelectTrigger className="h-10 w-full lg:w-40 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectId} onValueChange={(v) => { setPage(1); setProjectId(v || "ALL"); }}>
                <SelectTrigger className="h-10 w-full lg:w-40 text-sm"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All projects</SelectItem>
                  {(projectsQuery.data?.data.items ?? []).map((p: any) => (
                    <SelectItem key={p.id || p._id} value={p.id || p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assigneeId} onValueChange={(v) => { setPage(1); setAssigneeId(v || "ALL"); }}>
                <SelectTrigger className="h-10 w-full lg:w-40 text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All assignees</SelectItem>
                  {(membersQuery.data?.data.members ?? []).map((m: any) => (
                    <SelectItem key={m.id || m._id} value={m.id || m._id}>{`${m.firstName} ${m.lastName}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 flex-1 lg:flex-none">
              {canMutate && (
                <CreateTaskModal
                  defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                  trigger={
                    <Button size="sm" className={cn("h-10 rounded-xl font-bold px-4 flex-1 lg:flex-none", isMobile ? "shadow-md" : "")} variant="secondary">
                      Create Task
                    </Button>
                  }
                />
              )}
              {!isMobile && (
                 <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 px-4 text-muted-foreground text-sm font-medium hover:bg-muted/50 transition-colors">
                  Clear
                </Button>
              )}
            </div>

            <div className="inline-flex rounded-xl border border-border/40 bg-muted/30 p-1">
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 px-3 rounded-lg text-xs gap-1.5 font-bold"><List className="size-3.5" />List</Button>
              {!isMobile && <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")} className="h-8 px-3 rounded-lg text-xs gap-1.5 font-bold"><Kanban className="size-3.5" />Board</Button>}
              {isMobile && <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")} className="h-8 px-3 rounded-lg text-xs gap-1.5 font-bold"><TableIcon className="size-3.5" />Table</Button>}
            </div>
          </div>
        </div>

        {/* Active Filter Pills (Mobile only) */}
        {isMobile && activeFilterCount > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar animate-in slide-in-from-top-2 duration-300">
            {status !== "ALL" && (
              <Badge variant="outline" className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                {status}
                <X className="size-3 opacity-50 cursor-pointer" onClick={() => setStatus("ALL")} />
              </Badge>
            )}
            {priority !== "ALL" && (
              <Badge variant="outline" className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                {priority}
                <X className="size-3 opacity-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPriority("ALL"); }} />
              </Badge>
            )}
            {projectId !== "ALL" && (
              <Badge variant="outline" className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                {projectsQuery.data?.data.items.find((p: any) => (p.id || p._id) === projectId)?.name || "Project"}
                <X className="size-3 opacity-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setProjectId("ALL"); }} />
              </Badge>
            )}
            {assigneeId !== "ALL" && (
              <Badge variant="outline" className="h-7 px-3 rounded-full text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                {membersQuery.data?.data.members.find((m: any) => (m.id || m._id) === assigneeId)?.firstName || "Assignee"}
                <X className="size-3 opacity-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setAssigneeId("ALL"); }} />
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className={cn("flex-1 min-h-0", viewMode === "kanban" ? "mt-3" : "mt-0")}>
        {(viewMode === "list" || viewMode === "table") && (
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            {listQuery.isLoading && (
              <div className="space-y-3 pt-4">
                <Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" />
              </div>
            )}
            {!listQuery.isLoading && listRows.length === 0 && (
              <div className="pt-14"><EmptyState title="No tasks found" description="Try adjusting filters or create a task." /></div>
            )}
            {!listQuery.isLoading && listRows.length > 0 && (
              <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                {viewMode === "list" && !isMobile && (
                  <div className="hidden md:block rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/40">
                          <TableHead className="py-4 font-semibold text-foreground/70">Task Title</TableHead>
                          <TableHead className="font-semibold text-foreground/70">Assignee</TableHead>
                          <TableHead className="font-semibold text-foreground/70">Status</TableHead>
                          <TableHead className="font-semibold text-foreground/70">Priority</TableHead>
                          <TableHead className="font-semibold text-foreground/70">Due Date</TableHead>
                          <TableHead className="font-semibold text-foreground/70">Project</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listRows.map((task, idx) => (
                          <TaskRow key={getTaskId(task)} task={task} idx={idx} taskId={getTaskId(task)} assignee={getAssignee(task)} isOverdue={task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"} canMutate={canMutate} setSelectedTask={setSelectedTask} setDeleteId={setDeleteId} />
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
                        <div key={taskId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <Link href={`/tasks/${taskId}`} className="font-bold text-sm hover:text-primary transition-colors block">{task.title}</Link>
                              <span className="text-[10px] text-muted-foreground/60 uppercase">#{taskId.slice(-6)}</span>
                            </div>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter shrink-0">{task.status}</Badge>
                          </div>
                          <div className="flex items-center justify-between mt-4 border-t pt-3">
                            <div className="flex items-center gap-2">
                              {assignee && <Avatar className="h-6 w-6"><AvatarImage src={assignee.avatarUrl} /><AvatarFallback className="text-[8px]">{assignee.name[0]}</AvatarFallback></Avatar>}
                              <span className="text-xs text-muted-foreground truncate max-w-24">{assignee?.name || "Unassigned"}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0"><Link href={`/tasks/${taskId}`}><Eye className="size-4" /></Link></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedTask(task)}><Pencil className="size-4" /></Button>
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
                          <TableHead className="py-4 pl-6 min-w-[200px]">Task Title</TableHead>
                          <TableHead className="min-w-[150px]">Assignee</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="min-w-[120px]">Priority</TableHead>
                          <TableHead className="min-w-[150px]">Created By</TableHead>
                          <TableHead className="min-w-[150px]">Created Time</TableHead>
                          <TableHead className="min-w-[150px]">Project</TableHead>
                          <TableHead className="min-w-[140px]">Due Date</TableHead>
                          <TableHead className="min-w-[150px]">Tags</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listRows.map((task, idx) => (
                          <TaskRow key={getTaskId(task)} task={task} idx={idx} taskId={getTaskId(task)} assignee={getAssignee(task)} isOverdue={task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE"} canMutate={canMutate} setSelectedTask={setSelectedTask} setDeleteId={setDeleteId} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <PaginationMeta page={page} totalPages={totalPages} isFetching={listQuery.isFetching} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}

        {viewMode === "kanban" && (
          <div className="h-full animate-in fade-in zoom-in-95 duration-500">
            {kanbanQuery.isLoading ? (
              <div className="flex h-full gap-4 overflow-hidden p-4">
                <Skeleton className="h-full w-72 rounded-2xl" /><Skeleton className="h-full w-72 rounded-2xl" /><Skeleton className="h-full w-72 rounded-2xl" />
              </div>
            ) : kanbanRows.length === 0 ? (
              <div className="pt-14"><EmptyState title="No tasks found" description="Try changing filters or create a task to get started." /></div>
            ) : (
              <TaskBoard tasks={kanbanRows} canEdit={canMutate} projectId={projectId !== "ALL" ? projectId : undefined} />
            )}
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-110">
          <DialogHeader><DialogTitle>Delete Task</DialogTitle><DialogDescription>Confirm task deletion for this organization.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteTask.isPending || !deleteId} onClick={async () => {
              if (!deleteId) return;
              try { await deleteTask.mutateAsync(deleteId); setDeleteId(null); toast.success("Task deleted"); } catch { toast.error("Task deletion failed"); }
            }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <EditTaskModal task={selectedTask} open={Boolean(selectedTask)} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} />
      )}
    </div>
  );
}

function PaginationMeta({ page, totalPages, isFetching, onPageChange }: { page: number; totalPages: number; isFetching: boolean; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pb-4 pt-2">
      <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</Button>
      <p className="text-sm text-muted-foreground font-medium px-2">Page {page} of {totalPages}</p>
      <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => onPageChange(page + 1)}>Next</Button>
    </div>
  );
}
