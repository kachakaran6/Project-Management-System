
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

const PAGE_SIZE = 12;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] dark:shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  INACTIVE: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  PLANNED: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-[#A855F7] dark:shadow-[0_0_12px_rgba(168,85,247,0.15)]",
  ON_HOLD: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-[#F59E0B] dark:shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  COMPLETED: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-[#3B82F6] dark:shadow-[0_0_12px_rgba(59,130,246,0.15)]",
  ARCHIVED: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
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
    "inline-flex items-center justify-center size-8 rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] backdrop-blur-md border",
    "bg-white/10 dark:bg-white/5 border-neutral-200/50 dark:border-white/10 text-neutral-600 dark:text-[#94A3B8] hover:scale-110 shadow-sm",
    tone === "danger" 
      ? "hover:bg-red-500/10 hover:text-[#EF4444] hover:border-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]" 
      : "hover:bg-white/50 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-[#F8FAFC] hover:border-neutral-300 dark:hover:border-white/30 hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]"
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
    activeOrg?.role === "OWNER" ||
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
              className="h-10 rounded-card border-border/60 bg-background/60 pl-10 pr-4 text-sm"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-card border-border/60 bg-background/60 px-3 text-sm sm:w-44">
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
            <Button asChild className="h-10 rounded-card px-4 lg:ml-auto" variant="secondary">
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
                    <Skeleton className="h-5 w-2/3 rounded-button" />
                    <Skeleton className="h-4 w-1/3 rounded-button" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full rounded-button" />
                  <Skeleton className="h-3 w-4/5 rounded-button" />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-border/10">
                  <Skeleton className="h-3 w-24 rounded-button" />
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
          <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-white/5 bg-white/3 px-6 py-16 text-center">
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
              <Button asChild className="h-10 rounded-card" variant="secondary">
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
              const isPrivate = project.visibility === "private";

              return (
                <div
                  key={pid}
                  onClick={() => {
                    window.location.href = `/projects/${pid}`;
                  }}
                  className="group relative w-full pt-8 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer hover:-translate-y-2 mt-4"
                >
                  {/* PREMIUM FOLDER TAB (Back Layer) */}
                  <div className="absolute top-0 left-0 w-[45%] max-w-[160px] h-12 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-xl z-0 flex items-start pt-2.5 px-4 shadow-sm border border-slate-300/50 dark:border-slate-700/50 border-b-0 transition-all duration-300 group-hover:from-slate-300 group-hover:to-slate-200 dark:group-hover:from-slate-700 dark:group-hover:to-slate-800">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[12px] font-semibold truncate tracking-wide text-slate-700 dark:text-slate-300">{project.name}</span>
                      {isPrivate && <Lock className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />}
                    </div>
                  </div>

                  {/* PREMIUM FOLDER BODY (Front Layer) */}
                  <div className="relative z-10 w-full flex flex-col rounded-2xl rounded-tl-none shadow-[0_8px_30px_rgba(0,0,0,0.06)] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] overflow-hidden min-h-[180px]">
                     
                     {/* Inner Highlight for Depth */}
                     <div className="absolute inset-0 pointer-events-none rounded-2xl rounded-tl-none ring-1 ring-inset ring-white/60 dark:ring-white/5 transition-all duration-300 group-hover:ring-white/80 dark:group-hover:ring-white/10"></div>

                     {/* HEADER inside body */}
                     <div className="p-6 pb-2 flex items-start justify-between gap-4 relative z-10">
                       <div
                         className={cn(
                           "w-fit h-6 px-2.5 text-[10px] uppercase font-bold tracking-wider rounded-md border transition-all flex items-center gap-1",
                           getProjectStatusClass(project.status)
                         )}
                       >
                         {getProjectStatusLabel(project.status)}
                       </div>

                       {/* Action Buttons */}
                       <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -mr-2">
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
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setEditingProject(project);
                                 }}
                               />
                                <ProjectActionButton
                                 label="Delete"
                                 icon={Trash2}
                                 tone="danger"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setDeleteId(pid);
                                 }}
                               />
                             </>
                           )}
                       </div>
                     </div>

                     {/* CONTENT SECTION */}
                     <div className="px-6 py-3 flex-1 relative z-10 space-y-4">
                       <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                         {project.name}
                       </h3>
                       {project.description ? (
                         <p className="text-[13px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                           {project.description}
                         </p>
                       ) : (
                         <p className="text-[13px] text-slate-400 italic dark:text-slate-500">
                           No description provided
                         </p>
                       )}

                       <div className="flex items-center gap-4 text-[12px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-slate-400" />
                            <span>{project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="size-3.5 text-slate-400" />
                            <span>{members.length} {members.length === 1 ? "Member" : "Members"}</span>
                          </div>
                       </div>
                     </div>

                     {/* FOOTER SECTION */}
                     <div className="mt-auto relative z-10 px-6 pb-6">
                       <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                             {members.slice(0, 4).map((user: any) => (
                               <Avatar key={user.id || user._id} className="size-7 border-2 border-white dark:border-[#0f172a] shadow-sm relative z-10 transition-transform hover:scale-110 hover:z-20">
                                 <AvatarImage src={user.avatarUrl} />
                                 <AvatarFallback className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                                   {user.firstName?.[0]}{user.lastName?.[0]}
                                 </AvatarFallback>
                               </Avatar>
                             ))}
                             {members.length > 4 && (
                               <div className="flex size-7 items-center justify-center rounded-full border-2 border-white dark:border-[#0f172a] bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 shadow-sm relative z-0">
                                 +{members.length - 4}
                               </div>
                             )}
                           </div>
                         </div>

                         <div className="flex items-baseline gap-1 text-right">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{project.taskStats?.completed || 0}</span>
                            <span className="text-xs text-slate-400 font-medium">/</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{project.taskStats?.total || 0} tasks</span>
                         </div>
                       </div>
                     </div>

                     {/* PREMIUM PROGRESS BAR */}
                     <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden">
                        <div 
                         className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-1000 ease-out" 
                         style={{ width: `${project.taskStats?.percent || 0}%` }}
                       ></div>
                     </div>
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
