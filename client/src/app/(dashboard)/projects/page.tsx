"use client";

import Link from "@/lib/next-link";
import { type ElementType, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Eye,
  PencilLine,
  Search,
  Trash2,
  Users,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  INACTIVE: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  PLANNED: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  ON_HOLD: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  ARCHIVED: "border-slate-500/20 bg-slate-500/10 text-slate-300",
};

function getProjectStatusLabel(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function getProjectStatusClass(status: string) {
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "border-slate-500/20 bg-slate-500/10 text-slate-300"
  );
}

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectActionButton({
  href,
  label,
  icon: Icon,
  onClick,
  tone = "default",
}: {
  href?: string;
  label: string;
  icon: ElementType;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  const buttonClasses =
    "size-9 rounded-full border border-transparent bg-white/0 text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:border-white/10 hover:bg-white/5 hover:text-foreground hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.24)]";
  const dangerClasses =
    "text-red-400 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300";
  const content = <Icon className="size-4" aria-hidden="true" />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={`${buttonClasses} ${tone === "danger" ? dangerClasses : ""}`}
          >
            <Link href={href} aria-label={label}>
              {content}
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`${buttonClasses} ${tone === "danger" ? dangerClasses : ""}`}
            aria-label={label}
            onClick={onClick}
          >
            {content}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { activeOrg } = useAuth();
  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
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
      const matchStatus =
        status === "ALL" ||
        project.status.toLowerCase() === status.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [projectsQuery.data?.data.items, search, status]);

  console.log({ filtered });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const totalMembers = rows.reduce((sum, project: any) => {
    return sum + ((project as { membersCount?: number }).membersCount ?? 0);
  }, 0);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 md:px-6">
        {/* <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your projects.
          </p>
        </div> */}

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-10 rounded-xl border-border/60 bg-background/60 pl-10 pr-4 text-sm"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-background/60 px-3 text-sm sm:w-44">
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

          {canMutate ? (
            <Button asChild className="h-10 rounded-xl px-4 lg:ml-auto" variant="secondary">
              <Link href="/projects/create">
                <Plus className="mr-1.5 size-4" />
                Create Project
              </Link>
            </Button>
          ) : null}
        </div>

        {projectsQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={`project-skeleton-${i}`}
                className="rounded-2xl border border-white/5 bg-white/3 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-36 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                </div>
                <div className="mt-5 flex items-center gap-2 opacity-60">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="size-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {projectsQuery.error ? (
          <p className="text-sm text-destructive">Failed to load projects.</p>
        ) : null}

        {!projectsQuery.isLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/5 bg-white/5 text-muted-foreground">
              <Search className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                No projects yet
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Create your first project to start tracking work across your
                organization.
              </p>
            </div>
            {canMutate ? (
              <Button
                asChild
                className="h-10 rounded-full bg-linear-to-r from-indigo-500 to-violet-500 px-5 font-medium text-white shadow-[0_12px_30px_rgba(99,102,241,0.22)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_16px_36px_rgba(99,102,241,0.3)]"
              >
                <Link href="/projects/create">Create Project</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="col-span-full hidden items-center justify-between px-1 pb-1 text-xs text-muted-foreground md:flex">
              <span>{filtered.length} projects</span>
              <span>{totalMembers} members on page</span>
            </div>
            <div className="col-span-full grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((project: any) => {
                const pid = project.id || project._id;
                const membersCount =
                  (project as { membersCount?: number }).membersCount ?? 0;
                return (
                  <div
                    key={pid}
                    className="group flex h-full min-h-42 flex-col rounded-2xl border border-white/5 bg-white/3 p-3.5 transition-all duration-200 hover:bg-white/4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-medium tracking-tight text-foreground">
                          {project.name}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`inline-flex h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-[0.18em] ${getProjectStatusClass(project.status)}`}
                      >
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      <p className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        Created {formatProjectDate(project.createdAt)}
                      </p>
                      <p className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {membersCount} members
                      </p>
                    </div>

                    <div className="mt-auto flex items-center gap-1 pt-4 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                      <ProjectActionButton
                        href={`/tasks?projectId=${pid}`}
                        label="View project"
                        icon={Eye}
                      />
                      {canMutate ? (
                        <>
                          <ProjectActionButton
                            href={`/projects/${pid}/edit`}
                            label="Edit project"
                            icon={PencilLine}
                          />
                          <ProjectActionButton
                            label="Delete project"
                            icon={Trash2}
                            tone="danger"
                            onClick={() => setDeleteId(pid)}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Page <span className="text-foreground">{currentPage}</span> of{" "}
            <span className="text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              className="rounded-full px-3 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground disabled:opacity-40"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              className="rounded-full px-3 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground disabled:opacity-40"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        <Dialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent className="sm:max-w-110">
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The project will be removed for
                your organization.
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
                }}
              >
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
