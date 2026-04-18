"use client";

import Link from "next/link";
import {useMemo, useState} from "react";
import {toast} from "sonner";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {PageHeader, FilterBar} from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {EmptyState} from "@/components/ui/empty-state";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
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
import {useAuth} from "@/features/auth/hooks/use-auth";
import {
  useDeleteProjectMutation,
  useProjectsQuery,
} from "@/features/projects/hooks/use-projects-query";

const PAGE_SIZE = 10;

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {activeOrg} = useAuth();
  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  const projectsQuery = useProjectsQuery({page: 1, limit: 200});
  const deleteProject = useDeleteProjectMutation();

  const filtered = useMemo(() => {
    const rows = projectsQuery.data?.data.items ?? [];
    const term = search.trim().toLowerCase();

    return rows.filter((project) => {
      const matchSearch =
        !term ||
        `${project.name} ${project.description ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchStatus = status === "ALL" || project.status === status;
      return matchSearch && matchStatus;
    });
  }, [projectsQuery.data?.data.items, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Create, track, and manage projects across your organization."
        actions={
          canMutate ? (
            <Button asChild size="sm" className="h-9 px-4 font-medium">
              <Link href="/projects/create">Create Project</Link>
            </Button>
          ) : undefined
        }
      />

      <FilterBar>
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Search projects…"
            className="h-9 text-sm"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v);
          }}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {projectsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {projectsQuery.error ? (
        <p className="text-destructive">Failed to load projects.</p>
      ) : null}

      {!projectsQuery.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try changing filters or create a new project."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-card">Name</TableHead>
                  <TableHead className="sticky top-0 bg-card">Status</TableHead>
                  <TableHead className="sticky top-0 bg-card">
                    Members
                  </TableHead>
                  <TableHead className="sticky top-0 bg-card">
                    Created
                  </TableHead>
                  <TableHead className="sticky top-0 bg-card">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((project: any) => {
                  const pid = project.id || project._id;
                  return (
                    <TableRow key={pid}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{project.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {(project as {membersCount?: number}).membersCount ??
                          "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/tasks?projectId=${pid}`}>View</Link>
                        </Button>
                        {canMutate ? (
                          <>
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/projects/${pid}/edit`}>Edit</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteId(pid)}>
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-4 md:hidden">
            {rows.map((project: any) => {
              const pid = project.id || project._id;
              return (
                <div
                  key={pid}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {project.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wider">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>
                      Members:{" "}
                      {(project as {membersCount?: number}).membersCount ?? "0"}
                    </span>
                    <span>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full">
                      <Link href={`/projects/${pid}`}>View</Link>
                    </Button>
                    {canMutate && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeleteId(pid)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
          Next
        </Button>
      </div>

      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The project will be removed for your
              organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteProject.isPending || !deleteId}
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteProject.mutateAsync(deleteId);
                  toast.success("Project deleted");
                  setDeleteId(null);
                } catch {
                  toast.error("Failed to delete project");
                }
              }}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
