"use client";

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
  Search,
  Trash2,
  Users,
  Globe,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  useUpdateProjectMutation,
} from "@/features/projects/hooks/use-projects-query";
import { EditProjectModal } from "@/features/projects/components/edit-project-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  INACTIVE: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  PLANNED: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  ON_HOLD: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ARCHIVED: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
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
  const baseClasses = cn(
    "inline-flex items-center justify-center size-8 rounded-xl text-xs transition-all duration-200 active:scale-95 touch-none shadow-sm",
    "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-black hover:border-neutral-300",
    "dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white dark:hover:border-neutral-600 dark:shadow-none",
    tone === "danger" && "text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:text-red-400/80 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30"
  );

  const content = (
    <Icon className="size-4 shrink-0" aria-hidden="true" />
  );

  const buttonElement = href ? (
    <Button asChild variant="ghost" className={baseClasses}>
      <Link href={href}>{content}</Link>
    </Button>
  ) : (
    <Button variant="ghost" className={baseClasses} onClick={onClick}>
      {content}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {buttonElement}
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
  const [editingProject, setEditingProject] = useState<any>(null);

  const { activeOrg } = useAuth();
  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  const projectsQuery = useProjectsQuery({ page: 1, limit: 200 });
  const deleteProject = useDeleteProjectMutation();
  const updateProject = useUpdateProjectMutation();

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
        status === "ALL" ||
        project.status.toLowerCase() === status.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [projectsQuery.data?.data.items, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const s = p.status.toUpperCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [filtered]);

  const statsSummary = Object.entries(stats)
    .map(([label, count]) => {
      const formattedLabel = label.charAt(0) + label.slice(1).toLowerCase().replace('_', ' ');
      return `${count} ${formattedLabel}`;
    })
    .join(", ");

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto w-full max-w-7xl space-y-4">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={`project-skeleton-${i}`}
                className="rounded-[24px] border border-border/40 bg-card/40 p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-2/3 rounded-md" />
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-4/5 rounded-md" />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-border/10">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <div className="flex -space-x-1.5">
                    <Skeleton className="size-7 rounded-full border-2 border-background" />
                    <Skeleton className="size-7 rounded-full border-2 border-background" />
                    <Skeleton className="size-7 rounded-full border-2 border-background" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                Create your first project to start tracking work across your organization.
              </p>
            </div>
            {canMutate ? (
              <Button asChild className="h-10 rounded-xl" variant="secondary">
                 <Link href="/projects/create">Create Project</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-full flex items-center justify-between px-1 pb-1 text-xs text-muted-foreground outline-none">
              <span className="font-semibold">{statsSummary || "No projects"}</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><Globe className="size-3" /> Public</span>
                <span className="flex items-center gap-1.5"><Lock className="size-3" /> Private</span>
              </div>
            </div>
            {rows.map((project: any) => {
              const pid = project.id || project._id;
              const members = project.members || [];
              const techStack = project.techStack || [];
              const isPrivate = project.visibility === "private";

              return (
                <div
                  key={pid}
                  className="group relative flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md dark:border-neutral-800 dark:bg-card dark:hover:bg-card/80 dark:hover:border-neutral-700 dark:shadow-none"
                >
                  {/* HEADER SECTION */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="text-base font-bold text-black leading-tight line-clamp-2 cursor-help group-hover:text-primary transition-colors dark:text-foreground">
                              {project.name}
                            </h3>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px] break-words">
                            {project.name}
                          </TooltipContent>
                        </Tooltip>
                        {isPrivate && <Lock className="size-3.5 text-amber-500/80 shrink-0" />}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!canMutate}>
                          <button
                            className={cn(
                              "w-fit h-5 px-2 text-[9px] uppercase font-bold tracking-wider rounded-md border border-transparent transition-all flex items-center gap-1 hover:border-current active:scale-95 disabled:opacity-100 disabled:pointer-events-none",
                              getProjectStatusClass(project.status)
                            )}
                          >
                            {getProjectStatusLabel(project.status)}
                            {canMutate && <ChevronDown className="size-2.5 opacity-50" />}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[120px]">
                          {Object.keys(STATUS_STYLES).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              className="text-[10px] font-bold uppercase tracking-wide"
                              onClick={() => {
                                if (s !== project.status.toUpperCase()) {
                                  updateProject.mutate({
                                    id: pid,
                                    data: { status: s as any }
                                  });
                                }
                              }}
                            >
                              <div className={cn("size-2 rounded-full mr-2", getProjectStatusClass(s).split(' ')[1])} />
                              {getProjectStatusLabel(s)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* HOVER ACTIONS - TOP RIGHT */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -mr-1 -mt-1 scale-95 group-hover:scale-100">
                       <ProjectActionButton
                          href={`/projects/${pid}`}
                          label="View"
                          icon={Eye}
                        />
                        {canMutate && (
                          <>
                            <ProjectActionButton
                              label="Edit"
                              icon={PencilLine}
                              onClick={() => setEditingProject(project)}
                            />
                             <ProjectActionButton
                              label="Delete"
                              icon={Trash2}
                              tone="danger"
                              onClick={() => setDeleteId(pid)}
                            />
                          </>
                        )}
                    </div>
                  </div>

                  {/* CONTENT SECTION */}
                  <div className="space-y-4 mb-6">
                    {project.description ? (
                      <p className="text-sm text-neutral-800 line-clamp-2 leading-relaxed font-medium dark:text-muted-foreground">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-500 italic font-medium dark:text-muted-foreground/50">
                        Description will be available soon
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-neutral-600 font-semibold dark:text-muted-foreground/80">
                       <div className="flex items-center gap-1.5">
                         <CalendarDays className="size-3.5 text-primary" />
                         <span>{project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "Date N/A"}</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <Users className="size-3.5 text-primary/40" />
                         <span>{members.length} {members.length === 1 ? "Member" : "Members"}</span>
                       </div>
                    </div>
                  </div>

                  {/* FOOTER SECTION */}
                  <div className="mt-auto">
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="flex -space-x-1.5">
                          {members.slice(0, 3).map((user: any) => (
                            <Avatar key={user.id || user._id} className="size-7 border-2 border-white dark:border-neutral-900 ring-1 ring-border/10">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-bold">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {members.length > 3 && (
                            <div className="flex size-7 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 bg-muted text-[10px] font-bold text-muted-foreground">
                              +{members.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest ml-1 dark:text-muted-foreground/60">Team</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 dark:text-muted-foreground">
                         <span className="text-black dark:text-primary">{project.taskStats?.completed || 0}</span>
                         <span className="text-neutral-300 font-normal dark:text-muted-foreground/30">/</span>
                         <span className="text-black dark:text-foreground/80">{project.taskStats?.total || 0}</span>
                         <span className="text-[10px] font-bold text-neutral-600 ml-0.5 dark:text-muted-foreground/60">Tasks</span>
                      </div>
                    </div>
                  </div>

                  {/* PROGRESS BAR (DEEP BOTTOM) */}
                  <div className="absolute bottom-0 left-0 h-0.5 bg-muted/40 w-full overflow-hidden">
                     <div 
                      className="h-full bg-primary/60 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                      style={{ width: `${project.taskStats?.percent || 0}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col items-start justify-between gap-3 px-1 py-12 sm:flex-row sm:items-center">
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

        {/* MODALS */}
        <Dialog
          open={Boolean(deleteId)}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <DialogContent className="sm:max-w-110">
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The project will be removed for your organization.
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

        {editingProject && (
          <EditProjectModal 
            project={editingProject} 
            open={Boolean(editingProject)} 
            onOpenChange={(open) => !open && setEditingProject(null)} 
          />
        )}
      </div>
    </TooltipProvider>
  );
}
