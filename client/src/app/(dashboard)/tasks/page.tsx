"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {toast} from "sonner";
import {
  Kanban,
  List,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
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
import {EmptyState} from "@/components/ui/empty-state";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
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
import {useProjectsQuery} from "@/features/projects/hooks/use-projects-query";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {
  useDeleteTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useTasksQuery,
} from "@/features/tasks/hooks/use-tasks-query";
import {TaskBoard} from "@/features/tasks/components/task-board";
import {EditTaskModal} from "@/features/tasks/components/edit-task-modal";
import {CreateTaskModal} from "@/features/tasks/components/create-task-modal";
import {useOrganizationMembersQuery} from "@/features/organization/hooks/use-organization-members";
import {Task, TaskStatus, TaskPriority} from "@/types/task.types";
import {cn} from "@/lib/utils";
import {PageHeader, FilterBar} from "@/components/layout/page-header";
import {useSearchParams, useRouter} from "next/navigation";
import {TaskRow} from "@/features/tasks/components/task-row";

const PAGE_SIZE = 10;
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "list" | "kanban";

export default function TasksPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "kanban" ? "kanban" : "list";
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchParams = useSearchParams();

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
  const [dueDate, setDueDate] = useState(searchParams.get("dueDate") || "");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {activeOrg, activeOrgId} = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const projectsQuery = useProjectsQuery({page: 1, limit: 200});

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
    if (process.env.NODE_ENV === "development") {
      console.log("[TasksPage] Current Filters:", {
        search: debouncedSearch,
        status,
        priority,
        projectId,
        assigneeId,
        page,
      });
    }
  }, [debouncedSearch, status, priority, projectId, assigneeId, page]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (status !== "ALL") params.set("status", status);
    if (priority !== "ALL") params.set("priority", priority);
    if (projectId !== "ALL") params.set("projectId", projectId);
    if (assigneeId !== "ALL") params.set("assigneeId", assigneeId);
    if (dueDate) params.set("dueDate", dueDate);

    router.push(`?${params.toString()}`);
  }, [status, priority, projectId, assigneeId, dueDate, router]);

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
      dueDate: dueDate || undefined,
    }),
    [debouncedSearch, status, priority, projectId, assigneeId, dueDate],
  );

  const listFilters = useMemo(
    () => ({...sharedFilters, page, limit: PAGE_SIZE}),
    [sharedFilters, page],
  );
  const kanbanFilters = useMemo(
    () => ({...sharedFilters, page: 1, limit: 1000}),
    [sharedFilters],
  );

  const listQuery = useTasksQuery(listFilters, {
    enabled: viewMode === "list",
  });
  const kanbanQuery = useTasksQuery(kanbanFilters, {
    enabled: viewMode === "kanban",
  });

  const listMeta = listQuery.data?.data.meta;
  const totalPages = Math.max(1, listMeta?.totalPages ?? 1);

  const listRows = listQuery.data?.data.items ?? [];
  const kanbanRows = kanbanQuery.data?.data.items ?? [];

  const getTaskId = (task: Task) => {
    const legacyId = (task as Task & {_id?: string})._id;
    return String(task.id || legacyId || "");
  };

  const getAssignee = (task: Task) => task.assigneeUsers?.[0] ?? null;

  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setProjectId("ALL");
    setAssigneeId("ALL");
    setDueDate("");

    router.push("?"); // reset URL
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto",
        viewMode === "kanban" ? "p-4 md:p-6" : "space-y-6",
      )}>
      <div className={cn("shrink-0", viewMode === "kanban" && "px-1")}>
        <PageHeader
          title="Tasks"
          description="Manage, organize, and track tasks across all your active projects."
          actions={
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 px-3 rounded-md text-sm gap-1.5",
                    viewMode === "list" && "shadow-sm",
                  )}>
                  <List className="size-4" />
                  List
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "h-8 px-3 rounded-md text-sm gap-1.5",
                    viewMode === "kanban" && "shadow-sm",
                  )}>
                  <Kanban className="size-4" />
                  Board
                </Button>
              </div>
              {canMutate && (
                <CreateTaskModal
                  defaultProjectId={projectId !== "ALL" ? projectId : undefined}
                  trigger={
                    <Button size="sm" className="h-9 px-4 font-medium">
                      Create Task
                    </Button>
                  }
                />
              )}
            </div>
          }
        />

        <FilterBar className="mt-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search tasks…"
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priority}
            onValueChange={(v) => {
              setPage(1);
              setPriority(v);
            }}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={projectId}
            onValueChange={(v) => {
              setPage(1);
              setProjectId(v || "ALL");
            }}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {(projectsQuery.data?.data.items ?? []).map((project) => {
                const pId = project.id || (project as {_id?: string})._id;
                if (!pId) return null;
                return (
                  <SelectItem key={pId} value={pId}>
                    {project.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select
            value={assigneeId}
            onValueChange={(v) => {
              setPage(1);
              setAssigneeId(v || "ALL");
            }}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All assignees</SelectItem>
              {(membersQuery.data?.data.members ?? []).map((member) => {
                const memberId = member.id || (member as {_id?: string})._id;
                return (
                  <SelectItem key={memberId} value={memberId || ""}>
                    {`${member.firstName} ${member.lastName}`.trim()}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setPage(1);
              setDueDate(e.target.value);
            }}
            className="h-9 w-[150px] text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-3 text-muted-foreground text-sm">
            Clear
          </Button>
        </FilterBar>
      </div>

      <div
        className={cn(
          "flex-1 min-h-0",
          viewMode === "kanban" ? "mt-4" : "mt-0",
        )}>
        {viewMode === "list" && listQuery.isLoading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : null}

        {viewMode === "list" &&
        !listQuery.isLoading &&
        listRows.length === 0 ? (
          <div className="pt-20">
            <EmptyState
              title="No tasks found"
              description="Try adjusting filters or create a task."
            />
          </div>
        ) : null}

        {viewMode === "list" && !listQuery.isLoading && listRows.length > 0 ? (
          <div className="space-y-6 pt-6 animate-in fade-in duration-500">
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
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
                      Due Date
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/70">
                      Project
                    </TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listRows.map((task, idx) => {
                    const taskId = getTaskId(task);
                    const assignee = getAssignee(task);
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE";

                    return (
                      <TaskRow
                        key={taskId}
                        task={task}
                        idx={idx}
                        taskId={taskId}
                        assignee={assignee}
                        isOverdue={isOverdue}
                        canMutate={canMutate}
                        setSelectedTask={setSelectedTask}
                        setDeleteId={setDeleteId}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 lg:hidden">
              {listRows.map((task, idx) => {
                const taskId = getTaskId(task);
                const assignee = getAssignee(task);
                return (
                  <div
                    key={taskId || `task-mob-${idx}`}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <Link
                          href={`/tasks/${taskId}`}
                          className="font-bold text-sm hover:text-primary transition-colors block truncate">
                          {task.title}
                        </Link>
                        <span className="text-[10px] text-muted-foreground/60 uppercase">
                          #{taskId.slice(-6)}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[9px] uppercase tracking-tighter shrink-0">
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-4 border-t pt-3">
                      <div className="flex items-center gap-2">
                        {assignee && (
                          <Avatar className="h-6 w-6 rounded-full">
                            <AvatarImage src={assignee.avatarUrl} />
                            <AvatarFallback className="text-[8px]">
                              {assignee.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {assignee?.name || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0">
                          <Link href={`/tasks/${taskId}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedTask(task)}>
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination for List View */}
            <div className="flex items-center justify-end gap-2 pb-10 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || listQuery.isFetching}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || listQuery.isFetching}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }>
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {viewMode === "kanban" ? (
          <div className="h-full animate-in fade-in zoom-in-95 duration-500">
            {kanbanQuery.isLoading ? (
              <div className="flex gap-6 p-6 h-full overflow-hidden">
                <Skeleton className="h-full w-[300px] rounded-2xl" />
                <Skeleton className="h-full w-[300px] rounded-2xl" />
                <Skeleton className="h-full w-[300px] rounded-2xl" />
                <Skeleton className="h-full w-[300px] rounded-2xl shadow-sm" />
              </div>
            ) : kanbanRows.length === 0 ? (
              <div className="pt-20">
                <EmptyState
                  title="No tasks found"
                  description="Try changing filters or create a task to get started."
                />
              </div>
            ) : (
              <TaskBoard tasks={kanbanRows} canEdit={canMutate} />
            )}
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
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
              }}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTask ? (
        <EditTaskModal
          task={selectedTask}
          open={Boolean(selectedTask)}
          onOpenChange={(open) => {
            if (!open) setSelectedTask(null);
          }}
        />
      ) : null}
    </div>
  );
}
