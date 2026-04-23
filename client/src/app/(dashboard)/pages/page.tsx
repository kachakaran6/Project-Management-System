"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/lib/next-navigation";
import {
  CalendarDays,
  FileText,
  Globe,
  Lock,
  NotebookPen,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePagesQuery,
} from "@/features/pages/hooks/use-pages-query";
import { PageDoc, PageVisibility } from "@/types/page.types";
import Link from "@/lib/next-link";

function toInitials(firstName?: string, lastName?: string) {
  return (
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U"
  );
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canSeePage(page: PageDoc, userId: string, role?: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (page.visibility === "PUBLIC") return true;
  const isOwner = page.creatorId === userId;
  const isAllowed = (page.allowedUsers || []).some(id => String(id) === userId);
  return isOwner || isAllowed;
}

function visibilityBadge(visibility: PageVisibility) {
  if (visibility === "PUBLIC") {
    return (
      <Badge variant="default" className="gap-1">
        <Globe className="size-3" />
        Public
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Lock className="size-3" />
      Private
    </Badge>
  );
}

export default function PagesListPage() {
  const router = useRouter();
  const { user, activeOrg } = useAuth();

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "ALL" | PageVisibility
  >("ALL");
  const [ownershipFilter, setOwnershipFilter] = useState<
    "ALL" | "ME" | "SHARED"
  >("ALL");
  const [recentFilter, setRecentFilter] = useState<"ALL" | "RECENT">("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createVisibility, setCreateVisibility] =
    useState<PageVisibility>("PUBLIC");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  const pagesQuery = usePagesQuery({ page: 1, limit: 200 });
  const createPage = useCreatePageMutation();
  const deletePage = useDeletePageMutation();

  const currentRole = activeOrg?.role ?? user?.role;
  const currentUserId = user?.id ?? "";

  const canManage = (page: PageDoc) => {
    if (currentRole === "SUPER_ADMIN" || currentRole === "ADMIN") return true;
    return page.creatorId === currentUserId;
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    try {
      await deletePage.mutateAsync(pageToDelete);
      toast.success("Page deleted.");
      setDeleteOpen(false);
      setPageToDelete(null);
    } catch {
      toast.error("Failed to delete page.");
    }
  };

  const visibleRows = useMemo(() => {
    const all = pagesQuery.data?.data.items ?? [];
    const term = search.trim().toLowerCase();
    const now = Date.now();

    return all
      .filter((page) => canSeePage(page, currentUserId, currentRole))
      .filter((page) => {
        if (
          visibilityFilter !== "ALL" &&
          page.visibility !== visibilityFilter
        ) {
          return false;
        }

        if (ownershipFilter === "ME" && page.creatorId !== currentUserId) {
          return false;
        }

        if (ownershipFilter === "SHARED" && page.creatorId === currentUserId) {
          return false;
        }

        if (recentFilter === "RECENT") {
          const editedAt = +new Date(page.updatedAt);
          const days3 = 3 * 24 * 60 * 60 * 1000;
          if (now - editedAt > days3) {
            return false;
          }
        }

        if (!term) return true;

        const indexed =
          `${page.title} ${stripHtml(page.content)}`.toLowerCase();
        return indexed.includes(term);
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [
    currentRole,
    currentUserId,
    ownershipFilter,
    pagesQuery.data?.data.items,
    recentFilter,
    search,
    visibilityFilter,
  ]);

  const handleCreate = async () => {
    const title = createTitle.trim();
    if (!title) {
      toast.error("Page title is required.");
      return;
    }

    try {
      const created = await createPage.mutateAsync({
        title,
        content: "<p></p>",
        visibility: createVisibility,
      });

      toast.success("Page created.");
      setCreateOpen(false);
      setCreateTitle("");
      setCreateVisibility("PUBLIC");
      router.push(`/pages/${created.data.id}`);
    } catch {
      toast.error("Failed to create page.");
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-65px)] w-full max-w-7xl min-h-0 flex-col overflow-hidden px-4 py-2 lg:px-0">
      {/* Fixed Header Section */}
      <div className="flex shrink-0 flex-col gap-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-1 lg:gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages..."
                className="h-9 rounded-xl border-border/40 bg-muted/20 pl-10 pr-4 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            {/* Filters Row - Horizontal Scroll on Mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0 lg:overflow-visible">
              <Select
                value={visibilityFilter}
                onValueChange={(value) => setVisibilityFilter(value as "ALL" | PageVisibility)}
              >
                <SelectTrigger className="h-8 min-w-[120px] rounded-lg border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-[140px] lg:text-xs lg:rounded-xl">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40">
                  <SelectItem value="ALL">All visibility</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={ownershipFilter}
                onValueChange={(value) => setOwnershipFilter(value as "ALL" | "ME" | "SHARED")}
              >
                <SelectTrigger className="h-8 min-w-[120px] rounded-lg border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-[140px] lg:text-xs lg:rounded-xl">
                  <SelectValue placeholder="Ownership" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40">
                  <SelectItem value="ALL">All pages</SelectItem>
                  <SelectItem value="ME">Created by me</SelectItem>
                  <SelectItem value="SHARED">Shared with me</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={recentFilter}
                onValueChange={(value) => setRecentFilter(value as "ALL" | "RECENT")}
              >
                <SelectTrigger className="h-8 min-w-[120px] rounded-lg border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-[140px] lg:text-xs lg:rounded-xl">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40">
                  <SelectItem value="ALL">Any time</SelectItem>
                  <SelectItem value="RECENT">Edited in 3 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="h-9 w-full rounded-xl px-4 lg:h-10 lg:w-auto lg:ml-auto font-bold text-xs lg:text-sm shadow-sm"
            onClick={() => setCreateOpen(true)}
            variant="secondary"
          >
            <Plus className="mr-1.5 size-4" />
            Create Page
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {pagesQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/5 bg-white/3 p-3.5">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!pagesQuery.isLoading && visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/3 p-6">
            <EmptyState
              icon={NotebookPen}
              title="No pages found"
              description="Start simple. Create a page to capture your team knowledge."
              actionLabel="Create Page"
              onAction={() => setCreateOpen(true)}
            />
          </div>
        ) : null}

        {!pagesQuery.isLoading && visibleRows.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((page) => {
              const excerpt = stripHtml(page.content || "").slice(0, 120) || "No content yet";
              const ownerName = `${page.creator?.firstName || ""} ${page.creator?.lastName || ""}`.trim() || "Unknown";

              return (
                <Link
                  key={page.id}
                  href={`/pages/${page.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-white/5 bg-white/3 p-3 lg:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                      <h3 className="truncate text-sm lg:text-[15px] font-bold text-foreground/90 group-hover:text-primary transition-colors">
                        {page.title || "Untitled"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 scale-90 origin-right lg:scale-100">
                      {visibilityBadge(page.visibility)}
                      {canManage(page) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted/50">
                              <MoreVertical className="size-3.5 text-muted-foreground/50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/pages/${page.id}`);
                            }}>
                              <Pencil className="mr-2 size-3.5" />
                              Edit Page
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/10" />
                            <DropdownMenuItem 
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 focus:bg-rose-500/5 focus:text-rose-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageToDelete(page.id);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-xs lg:text-sm leading-relaxed text-muted-foreground/70">
                    {excerpt}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5 lg:h-6 lg:w-6 ring-1 ring-white/10">
                        <AvatarImage src={page.creator?.avatarUrl} alt={ownerName} />
                        <AvatarFallback className="text-[8px] lg:text-[9px] font-bold bg-muted">
                          {toInitials(page.creator?.firstName, page.creator?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-[10px] lg:text-xs font-medium text-muted-foreground/80">{ownerName}</span>
                    </div>
                    
                    <span className="text-[10px] text-muted-foreground/30 px-1">•</span>
                    
                    <div className="inline-flex items-center gap-1.5 shrink-0 text-[10px] lg:text-xs text-muted-foreground/60">
                      <CalendarDays className="size-3 lg:size-3.5" />
                      <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="ml-auto hidden lg:block">
                      {page.creatorId === currentUserId ? (
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-tight h-4 px-1.5">Owned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tight h-4 px-1.5">Shared</Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-110">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Start a structured document for your team knowledge base.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="Quarterly Architecture Notes"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <div className="inline-flex rounded-xl border border-border p-1">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${createVisibility === "PRIVATE"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                    }`}
                  onClick={() => setCreateVisibility("PRIVATE")}>
                  <Lock className="size-3.5" />
                  Private
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${createVisibility === "PUBLIC"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                    }`}
                  onClick={() => setCreateVisibility("PUBLIC")}>
                  <Globe className="size-3.5" />
                  Public
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createPage.isPending}>
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-100 rounded-2xl border-border/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone. This will permanently delete the page and all its content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl bg-rose-500 hover:bg-rose-600"
              onClick={handleDelete}
              loading={deletePage.isPending}
            >
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

