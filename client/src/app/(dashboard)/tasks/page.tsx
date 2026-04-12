"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Kanban, List, Search as SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useTasksQuery,
} from "@/features/tasks/hooks/use-tasks-query";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { Task, TaskStatus, TaskPriority } from "@/types/task.types";

const PAGE_SIZE = 20;
const VIEW_STORAGE_KEY = "tasks:view-mode";
type TaskViewMode = "list" | "kanban";

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<TaskViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "kanban" ? "kanban" : "list";
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [priority, setPriority] = useState<string>("ALL");
  const [projectId, setProjectId] = useState<string>("ALL");
  const [assigneeId, setAssigneeId] = useState<string>("ALL");
  const [dueDate, setDueDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { activeOrg, activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const updateStatus = useUpdateTaskStatusMutation();
  const updateTask = useUpdateTaskMutation();
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

  const sharedFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status === "ALL" ? undefined : (status as TaskStatus),
      priority: priority === "ALL" ? undefined : (priority as TaskPriority),
      projectId: projectId === "ALL" ? undefined : projectId,
      assigneeId: assigneeId === "ALL" ? undefined : assigneeId,
      dueDate: dueDate || undefined,
    }),
    [debouncedSearch, status, priority, projectId, assigneeId, dueDate],
  );

  const listFilters = useMemo(
    () => ({ ...sharedFilters, page, limit: PAGE_SIZE }),
    [sharedFilters, page],
  );
  const kanbanFilters = useMemo(
    () => ({ ...sharedFilters, page: 1, limit: 1000 }),
    [sharedFilters],
  );

  const listQuery = useTasksQuery(listFilters, { enabled: viewMode === "list" });
  const kanbanQuery = useTasksQuery(kanbanFilters, { enabled: viewMode === "kanban" });

  const listMeta = listQuery.data?.data.meta;
  const totalPages = Math.max(1, listMeta?.totalPages ?? 1);

  const listRows = listQuery.data?.data.items ?? [];
  const kanbanRows = kanbanQuery.data?.data.items ?? [];

  const getProjectName = (task: Task) => {
    const projectValue = task.projectId as unknown as { name?: string; _id?: string; id?: string } | string;
    if (typeof projectValue === "string") return projectValue;
    return projectValue?.name || projectValue?._id || projectValue?.id || "Unknown";
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
  };

  const handleInlineStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateStatus.mutateAsync({ id: taskId, status: newStatus });
      toast.success("Task status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleInlinePriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { priority: newPriority } });
      toast.success("Task priority updated");
    } catch {
      toast.error("Failed to update priority");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Central task hub across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted inline-flex rounded-lg p-1">
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8"
            >
              <List className="mr-2 size-4" />
              List View
            </Button>
            <Button
              type="button"
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="h-8"
            >
              <Kanban className="mr-2 size-4" />
              Kanban Board
            </Button>
          </div>

          {canMutate ? (
            <Button asChild>
              <Link href="/tasks/create">Create Task</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="relative xl:col-span-2">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search tasks"
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(value) => {
          setPage(1);
          setStatus(value);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="BACKLOG">Backlog</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(value) => {
          setPage(1);
          setPriority(value);
        }}>
          <SelectTrigger>
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

        <Select value={projectId} onValueChange={(value) => {
          setPage(1);
          setProjectId(value);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All projects</SelectItem>
            {(projectsQuery.data?.data.items ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeId} onValueChange={(value) => {
          setPage(1);
          setAssigneeId(value);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All assignees</SelectItem>
            {(membersQuery.data?.data.members ?? []).map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {`${member.firstName} ${member.lastName}`.trim()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dueDate}
          onChange={(event) => {
            setPage(1);
            setDueDate(event.target.value);
          }}
          placeholder="Due before"
        />

        <Button variant="outline" onClick={clearFilters}>
          Clear
        </Button>
      </div>

      {viewMode === "list" && listQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {viewMode === "list" && !listQuery.isLoading && listRows.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try adjusting filters or create a task."
        />
      ) : null}

      {viewMode === "list" && !listQuery.isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Title</TableHead>
              <TableHead className="sticky top-0 bg-card">Assignee</TableHead>
              <TableHead className="sticky top-0 bg-card">Status</TableHead>
              <TableHead className="sticky top-0 bg-card">Priority</TableHead>
              <TableHead className="sticky top-0 bg-card">Due Date</TableHead>
              <TableHead className="sticky top-0 bg-card">Project</TableHead>
              <TableHead className="sticky top-0 bg-card">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listRows.map((task) => {
              const assignee = getAssignee(task);
              return (
              <TableRow
                key={task.id}
                className={canMutate ? "cursor-pointer" : ""}
                onClick={() => {
                  if (canMutate) setSelectedTask(task);
                }}
              >
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatarUrl} />
                        <AvatarFallback>
                          {assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{assignee.name}</span>
                        <span className="text-[11px] text-muted-foreground">{assignee.email}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleInlineStatusChange(task.id, value as TaskStatus)}
                    disabled={!canMutate || updateStatus.isPending}
                  >
                    <SelectTrigger
                      className="h-8 w-37.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => handleInlinePriorityChange(task.id, value as TaskPriority)}
                    disabled={!canMutate || updateTask.isPending}
                  >
                    <SelectTrigger
                      className="h-8 w-32.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : <span className="text-xs text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>{getProjectName(task)}</TableCell>
                <TableCell className="space-x-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/tasks/${task.id}`}>View</Link>
                  </Button>
                  {canMutate ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTask(task);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(task.id);
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      ) : null}

      {viewMode === "kanban" ? (
        <>
          {kanbanQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-105 w-full" />
              <Skeleton className="h-105 w-full" />
              <Skeleton className="h-105 w-full" />
            </div>
          ) : kanbanRows.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description="Try changing filters or create a task to get started."
            />
          ) : (
            <TaskBoard tasks={kanbanRows} canEdit={canMutate} />
          )}
        </>
      ) : null}

      {viewMode === "list" ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || listQuery.isFetching}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || listQuery.isFetching}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
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
              }}
            >
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
