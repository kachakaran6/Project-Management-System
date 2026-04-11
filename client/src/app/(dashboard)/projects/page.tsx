"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
  X,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  Trash2,
  FolderOpen,
  CheckCircle2,
  Clock,
  PauseCircle,
  RefreshCw,
  Rocket,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useProjectsQuery,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from "@/features/projects/hooks/use-projects-query";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { EditProjectModal } from "@/features/projects/components/edit-project-modal";
import { Project, ProjectStatus } from "@/types/project.types";

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; dotColor: string; icon: React.ElementType }
> = {
  PLANNED:   { label: "Planned",   cls: "bg-violet-100 text-violet-700 border-violet-200",  dotColor: "#7c3aed", icon: Rocket },
  ACTIVE:    { label: "Active",    cls: "bg-blue-100 text-blue-700 border-blue-200",         dotColor: "#0D6EFD", icon: TrendingUp },
  ON_HOLD:   { label: "On Hold",   cls: "bg-amber-100 text-amber-700 border-amber-200",      dotColor: "#d97706", icon: PauseCircle },
  COMPLETED: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "#059669", icon: CheckCircle2 },
  ARCHIVED:  { label: "Archived",  cls: "bg-slate-100 text-slate-500 border-slate-200",      dotColor: "#9ca3af", icon: Archive },
  active:    { label: "Active",    cls: "bg-blue-100 text-blue-700 border-blue-200",         dotColor: "#0D6EFD", icon: TrendingUp },
  planned:   { label: "Planned",   cls: "bg-violet-100 text-violet-700 border-violet-200",  dotColor: "#7c3aed", icon: Rocket },
  on_hold:   { label: "On Hold",   cls: "bg-amber-100 text-amber-700 border-amber-200",      dotColor: "#d97706", icon: PauseCircle },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dotColor: "#059669", icon: CheckCircle2 },
  archived:  { label: "Archived",  cls: "bg-slate-100 text-slate-500 border-slate-200",      dotColor: "#9ca3af", icon: Archive },
};

// ─── Helper: resolve id with _id fallback ───────────────────────────────────
function pid(p: any): string {
  return p?.id || p?._id || "";
}

// ─── StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["PLANNED"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: cfg.dotColor }}
      />
      {cfg.label}
    </span>
  );
}

// ─── MiniProgressBar ────────────────────────────────────────────────────────
function MiniProgressBar({ pct, status }: { pct: number; status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["ACTIVE"];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: cfg.dotColor }}
      />
    </div>
  );
}

// ─── ProjectStats Row ────────────────────────────────────────────────────────
interface StatsCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  bg: string;
  loading: boolean;
}

function StatsCard({ icon: Icon, value, label, color, bg, loading }: StatsCardProps) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
        style={{ background: bg }}
      >
        <Icon className="size-5" style={{ color }} />
      </div>
      <div>
        {loading ? (
          <>
            <Skeleton className="mb-1 h-7 w-10" />
            <Skeleton className="h-3.5 w-20" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────
function EmptyProjectState({ hasFilters, canCreate, onClear }: { hasFilters: boolean; canCreate: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <FolderOpen className="size-10 text-primary opacity-60" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold">
          {hasFilters ? "No projects match filters" : "No projects yet"}
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {hasFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Create your first project to start organizing your team's work and tracking progress."}
        </p>
      </div>
      {hasFilters ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          <X className="mr-1.5 size-3.5" />
          Clear Filters
        </Button>
      ) : canCreate ? (
        <CreateProjectModal />
      ) : null}
    </div>
  );
}

// ─── ProjectActions dropdown ─────────────────────────────────────────────────
interface ProjectActionsProps {
  project: Project;
  canMutate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ProjectActions({ project, canMutate, canDelete, onEdit, onArchive, onDelete }: ProjectActionsProps) {
  const projectId = pid(project);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem asChild>
          <Link href={`/projects/${projectId}`} className="flex items-center gap-2">
            <Eye className="size-3.5" />
            View Project
          </Link>
        </DropdownMenuItem>
        {canMutate && (
          <>
            <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
              <Pencil className="size-3.5" />
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onArchive}
              className="flex items-center gap-2 text-amber-600 focus:text-amber-600"
            >
              <Archive className="size-3.5" />
              Archive
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Grid Card ───────────────────────────────────────────────────────────────
interface ProjectCardProps {
  project: Project;
  pct: number;
  taskCount: number;
  canMutate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, pct, taskCount, canMutate, canDelete, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const projectId = pid(project);
  const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG["PLANNED"];
  const StatusIcon = cfg.icon;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Color accent bar */}
      <div className="h-1 w-full" style={{ background: cfg.dotColor }} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header: name + actions */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/projects/${projectId}`}
              className="block text-sm font-semibold leading-tight text-foreground hover:text-primary transition-colors line-clamp-2"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            <ProjectActions
              project={project}
              canMutate={canMutate}
              canDelete={canDelete}
              onEdit={onEdit}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-4">
          <StatusBadge status={project.status} />
        </div>

        {/* Progress */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <StatusIcon className="size-3" />
              Progress
            </span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>
          <MiniProgressBar pct={pct} status={project.status} />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {taskCount} task{taskCount !== 1 ? "s" : ""}
          </span>
          {project.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(project.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ───────────────────────────────────────────────────────────────
interface ProjectRowProps {
  project: Project;
  pct: number;
  taskCount: number;
  doneCount: number;
  canMutate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ProjectRow({ project, pct, taskCount, doneCount, canMutate, canDelete, onEdit, onArchive, onDelete }: ProjectRowProps) {
  const projectId = pid(project);

  return (
    <tr className="group border-b border-border transition-colors hover:bg-muted/20">
      {/* Name */}
      <td className="py-3.5 pl-5 pr-4">
        <Link
          href={`/projects/${projectId}`}
          className="block max-w-[240px] truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          {project.name}
        </Link>
        {project.description && (
          <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">
            {project.description}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="py-3.5 pr-4">
        <StatusBadge status={project.status} />
      </td>

      {/* Progress */}
      <td className="py-3.5 pr-4">
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{doneCount}/{taskCount}</span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>
          <MiniProgressBar pct={pct} status={project.status} />
        </div>
      </td>

      {/* Created */}
      <td className="py-3.5 pr-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          {new Date(project.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 pr-4">
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <Link href={`/projects/${projectId}`}>
              <Eye className="mr-1 size-3.5" />
              View
            </Link>
          </Button>
          <ProjectActions
            project={project}
            canMutate={canMutate}
            canDelete={canDelete}
            onEdit={onEdit}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}

// ─── Table Skeleton ──────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <tr key={`proj-row-skeleton-${i}`} className="border-b border-border">
          <td className="py-3.5 pl-5 pr-4">
            <Skeleton className="mb-1 h-4 w-44" />
            <Skeleton className="h-3 w-32" />
          </td>
          <td className="py-3.5 pr-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>
          <td className="py-3.5 pr-4">
            <Skeleton className="h-5 w-32" />
          </td>
          <td className="py-3.5 pr-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3.5 pr-4">
            <Skeleton className="h-7 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Grid Skeleton ───────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`proj-card-skeleton-${i}`}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="h-1 w-full bg-muted" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Filter Drawer ───────────────────────────────────────────────────────────
const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  status: string;
  setStatus: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
}

function FilterDrawer({
  open, onOpenChange,
  status, setStatus,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  onApply, onReset,
}: FilterDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="max-w-sm">
        <DrawerHeader>
          <DrawerTitle>Advanced Filters</DrawerTitle>
          <DrawerDescription>
            Refine your project list to find exactly what you need.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 pt-2">
          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    status === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Created Date Range</label>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onReset}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Reset
          </Button>
          <Button className="flex-1" onClick={onApply}>
            Apply Filters
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const { user, activeOrg, hasPermission } = useAuth();
  const userRole = activeOrg?.role || user?.role;
  const canMutate = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "MANAGER";
  const canDelete = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isSoloUser = !activeOrg; // Personal Workspace — no org selected
  const canCreate = canMutate || isSoloUser;

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const projectsQuery = useProjectsQuery({ page: 1, limit: 400 });
  const tasksQuery = useTasksQuery({ page: 1, limit: 1000 });
  const deleteProject = useDeleteProjectMutation();
  const updateProject = useUpdateProjectMutation();

  const allProjects = projectsQuery.data?.data.items ?? [];
  const allTasks = tasksQuery.data?.data.items ?? [];

  // Task counts per project
  const tasksByProject = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const task of allTasks) {
      const key = task.projectId;
      if (!map[key]) map[key] = { total: 0, done: 0 };
      map[key].total++;
      if (task.status === "DONE") map[key].done++;
    }
    return map;
  }, [allTasks]);

  // Stats
  const statsTotal = allProjects.length;
  const statsActive = allProjects.filter(
    (p) => (p.status as string).toUpperCase() === "ACTIVE",
  ).length;
  const statsCompleted = allProjects.filter(
    (p) => (p.status as string).toUpperCase() === "COMPLETED",
  ).length;
  const statsOnHold = allProjects.filter(
    (p) =>
      (p.status as string).toUpperCase() === "ON_HOLD" ||
      (p.status as string) === "on_hold",
  ).length;

  // Filtered
  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (term && !`${p.name} ${p.description ?? ""}`.toLowerCase().includes(term)) return false;
      if (status !== "ALL" && (p.status as string).toUpperCase() !== status) return false;
      if (dateFrom && new Date(p.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59);
        if (new Date(p.createdAt) > toDate) return false;
      }
      return true;
    });
  }, [allProjects, debouncedSearch, status, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilterCount = [
    debouncedSearch.trim() !== "",
    status !== "ALL",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const applyFilters = () => {
    setPage(1);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setStatus("ALL");
    setDateFrom("");
    setDateTo("");
  };

  // Helpers
  const getProgress = (p: Project) => {
    const key = pid(p);
    const data = tasksByProject[key];
    if (!data || data.total === 0) return 0;
    return Math.round((data.done / data.total) * 100);
  };

  const getTaskCount = (p: Project) => tasksByProject[pid(p)]?.total ?? 0;
  const getDoneCount = (p: Project) => tasksByProject[pid(p)]?.done ?? 0;

  // Actions
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(pid(deleteTarget));
      toast.success(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete project.");
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await updateProject.mutateAsync({
        id: pid(archiveTarget),
        data: { status: "ARCHIVED" as ProjectStatus },
      });
      toast.success(`Project "${archiveTarget.name}" archived.`);
      setArchiveTarget(null);
    } catch {
      toast.error("Failed to archive project.");
    }
  };

  const isLoading = projectsQuery.isLoading;
  const isError = projectsQuery.isError;
  const isEmpty = !isLoading && pageRows.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Loading your projects…"
              : `${statsTotal} project${statsTotal !== 1 ? "s" : ""} across your workspace`}
          </p>
        </div>
        {canCreate && (
          <CreateProjectModal
            trigger={
              <Button size="md" className="gap-2 shadow-sm">
                <Plus className="size-4" />
                New Project
              </Button>
            }
          />
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={FolderOpen}
          value={statsTotal}
          label="Total Projects"
          color="#0D6EFD"
          bg="rgba(13,110,253,0.12)"
          loading={isLoading}
        />
        <StatsCard
          icon={TrendingUp}
          value={statsActive}
          label="Active Projects"
          color="#059669"
          bg="rgba(5,150,105,0.12)"
          loading={isLoading}
        />
        <StatsCard
          icon={CheckCircle2}
          value={statsCompleted}
          label="Completed"
          color="#7c3aed"
          bg="rgba(124,58,237,0.12)"
          loading={isLoading}
        />
        <StatsCard
          icon={PauseCircle}
          value={statsOnHold}
          label="On Hold"
          color="#d97706"
          bg="rgba(217,119,6,0.12)"
          loading={isLoading}
        />
      </div>

      {/* ── Control Bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="h-9 pl-9 pr-9"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status quick filter */}
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced filter btn */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}

        {/* Spacer */}
        <div className="ml-auto" />

        {/* View toggle */}
        <div className="flex items-center overflow-hidden rounded-lg border border-border bg-muted/40">
          <button
            onClick={() => setViewMode("table")}
            className={`flex h-9 w-9 items-center justify-center transition-all ${
              viewMode === "table"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Table view"
          >
            <LayoutList className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex h-9 w-9 items-center justify-center transition-all ${
              viewMode === "grid"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Filter indicator ── */}
      {activeFilterCount > 0 && !isLoading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="size-3.5" />
          Showing <strong>{filtered.length}</strong> of <strong>{statsTotal}</strong> projects
        </p>
      )}

      {/* ── Error State ── */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="size-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load projects</p>
            <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => projectsQuery.refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Table View ── */}
      {!isError && viewMode === "table" && !isEmpty && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3 pl-5 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Project
                  </th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Progress
                  </th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : (
                  pageRows.map((p) => (
                    <ProjectRow
                      key={pid(p)}
                      project={p}
                      pct={getProgress(p)}
                      taskCount={getTaskCount(p)}
                      doneCount={getDoneCount(p)}
                      canMutate={canMutate}
                      canDelete={canDelete}
                      onEdit={() => setEditTarget(p)}
                      onArchive={() => setArchiveTarget(p)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Grid View ── */}
      {!isError && viewMode === "grid" && !isEmpty && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <GridSkeleton />
          ) : (
            pageRows.map((p) => (
              <ProjectCard
                key={pid(p)}
                project={p}
                pct={getProgress(p)}
                taskCount={getTaskCount(p)}
                canMutate={canMutate}
                canDelete={canDelete}
                onEdit={() => setEditTarget(p)}
                onArchive={() => setArchiveTarget(p)}
                onDelete={() => setDeleteTarget(p)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Empty State ── */}
      {isEmpty && !isError && (
        <EmptyProjectState
          hasFilters={activeFilterCount > 0}
          canCreate={canCreate}
          onClear={clearFilters}
        />
      )}

      {/* ── Pagination ── */}
      {!isLoading && !isEmpty && !isError && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 gap-1 px-2.5"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = i + 1;
              return (
                <Button
                  key={`page-btn-${pg}`}
                  variant={pg === currentPage ? "primary" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(pg)}
                >
                  {pg}
                </Button>
              );
            })}
            {totalPages > 5 && (
              <span className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground">…</span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 gap-1 px-2.5"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Filter Drawer ── */}
      <FilterDrawer
        open={filterOpen}
        onOpenChange={setFilterOpen}
        status={status}
        setStatus={setStatus}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {/* ── Edit Modal ── */}
      {editTarget && (
        <EditProjectModal
          project={editTarget}
          open={Boolean(editTarget)}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        />
      )}

      {/* ── Archive Confirm ── */}
      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Archive{" "}
              <span className="font-semibold text-foreground">
                &quot;{archiveTarget?.name}&quot;
              </span>
              ? It will be hidden from active views but can be restored later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={updateProject.isPending}
              onClick={handleArchive}
            >
              {updateProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Archive Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>
              ? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteProject.isPending}
              onClick={handleDelete}
            >
              {deleteProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Floating Action Button ── */}
      {canCreate && (
        <CreateProjectModal
          trigger={
            <button
              aria-label="Create new project"
              className={[
                "group fixed bottom-6 right-6 z-50",
                "flex h-14 w-14 items-center justify-center",
                "rounded-full bg-primary text-primary-foreground shadow-lg",
                "transition-all duration-200",
                "hover:scale-110 hover:shadow-xl hover:shadow-primary/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-95",
              ].join(" ")}
            >
              {/* Pulse ring on hover */}
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-0 group-hover:opacity-100" />
              {/* Icon — rotates 90° on hover */}
              <Plus className="relative size-6 transition-transform duration-200 group-hover:rotate-90" />
              {/* Slide-in tooltip */}
              <span
                className={[
                  "pointer-events-none absolute right-16 whitespace-nowrap",
                  "rounded-lg bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background shadow-md",
                  "translate-x-2 opacity-0 transition-all duration-150",
                  "group-hover:translate-x-0 group-hover:opacity-100",
                ].join(" ")}
              >
                New Project
              </span>
            </button>
          }
        />
      )}
    </div>
  );
}
