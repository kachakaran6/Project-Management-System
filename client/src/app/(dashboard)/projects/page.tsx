import Link from "@/lib/next-link";
import { type ElementType, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Plus,
  Eye,
  PencilLine,
  Trash2,
  Users,
  Globe,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useDeleteProjectMutation,
  useProjectsQuery,
} from "@/features/projects/hooks/use-projects-query";
import { EditProjectModal } from "@/features/projects/components/edit-project-modal";
import { AppPage } from "@/components/patterns/app-page";
import { PageHeader } from "@/components/layout/page-header";
import { PageToolbar } from "@/components/patterns/page-toolbar";
import { StatusBadge } from "@/components/patterns/status-badge";
import { EntityLoadingState, EntityEmptyState } from "@/components/patterns/entity-list-state";

const PAGE_SIZE = 12;

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);

  const { activeOrg } = useAuth();
  const canMutate =
    activeOrg?.role === "OWNER" ||
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const deleteProject = useDeleteProjectMutation();

  const filtered = useMemo(() => {
    let allProjects = projectsQuery.data?.data.items ?? [];
    const term = search.trim().toLowerCase();

    return allProjects.filter((project) => {
      const matchSearch =
        !term ||
        `${project.name} ${project.description ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchStatus =
        statusFilter === "ALL" ||
        project.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [projectsQuery.data?.data.items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const activeFilters = (search ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  return (
    <TooltipProvider delayDuration={120}>
      <AppPage>
        <PageHeader
          title="Projects"
          description={`Manage your organization's workspaces and projects (${filtered.length} total).`}
          actions={
            canMutate ? (
              <Button asChild size="sm">
                <Link href="/projects/create">
                  <Plus className="mr-1.5 size-4" />
                  Create Project
                </Link>
              </Button>
            ) : null
          }
        />

        <PageToolbar
          searchQuery={search}
          onSearchChange={(query) => {
            setSearch(query);
            setPage(1);
          }}
          searchPlaceholder="Search projects..."
          activeFilterCount={activeFilters}
          onClearFilters={handleClearFilters}
          filterControls={
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px] text-sm">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {projectsQuery.isLoading ? (
          <EntityLoadingState type="cards" count={6} />
        ) : rows.length === 0 ? (
          <EntityEmptyState
            title={activeFilters > 0 ? "No matching projects" : "No projects yet"}
            description={
              activeFilters > 0
                ? "No projects match your current filters. Try clearing search or filters."
                : "Create your first project to start tracking work across your organization."
            }
            actionLabel={activeFilters > 0 ? "Clear Filters" : canMutate ? "Create Project" : undefined}
            onAction={activeFilters > 0 ? handleClearFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((project: any) => {
              const pid = project.id || project._id;
              const members = project.members || [];
              const isPrivate = project.visibility === "private";

              return (
                <Card
                  key={pid}
                  className="flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-sm group cursor-pointer"
                  onClick={() => {
                    window.location.href = `/projects/${pid}`;
                  }}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {project.name}
                          </h3>
                          {isPrivate ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="size-3.5 text-muted-foreground shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>Private Project</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>Public Project</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      <StatusBadge status={project.status} size="sm" />
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 py-2 flex-1 space-y-4">
                    {project.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        No description provided
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        <span>
                          {project.createdAt
                            ? format(new Date(project.createdAt), "MMM d, yyyy")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        <span>
                          {members.length} {members.length === 1 ? "Member" : "Members"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="p-5 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {members.slice(0, 3).map((user: any) => (
                        <Avatar
                          key={user.id || user._id}
                          className="size-7 border-2 border-background shadow-none"
                        >
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="text-[10px] font-medium bg-muted">
                            {user.firstName?.[0]}
                            {user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {members.length > 3 && (
                        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                          +{members.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/projects/${pid}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>

                      {canMutate && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(project);
                            }}
                          >
                            <PencilLine className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(pid);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Showing page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* MODALS */}
        <Dialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All tasks, pages, and linked items in this project will be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
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
                    toast.success("Project deleted successfully");
                    setDeleteId(null);
                  } catch {
                    toast.error("Failed to delete project");
                  }
                }}
              >
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {editingProject && (
          <EditProjectModal
            project={editingProject}
            open={Boolean(editingProject)}
            onOpenChange={(open) => !open && setEditingProject(null)}
          />
        )}
      </AppPage>
    </TooltipProvider>
  );
}
