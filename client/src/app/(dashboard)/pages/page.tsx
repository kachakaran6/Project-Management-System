import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/lib/next-navigation";
import {
  CalendarDays,
  Copy,
  FileText,
  Globe,
  MoreVertical,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { PageVisibilityBadge } from "@/features/pages/components/page-visibility-badge";
import { PublishPageDialog } from "@/features/pages/components/publish-page-dialog";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePagesQuery,
  useUpdatePageMutation,
} from "@/features/pages/hooks/use-pages-query";
import {
  getPagePublicPath,
  getPagePublicPreviewPath,
  toAbsolutePublicUrl,
} from "@/features/pages/utils/page-sharing";
import {
  createEmptySerializedContent,
  extractPagePlainText,
} from "@/features/pages/utils/page-content";
import { PageDoc, PageVisibility } from "@/types/page.types";
import Link from "@/lib/next-link";

function toInitials(firstName?: string, lastName?: string) {
  return (
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U"
  );
}

function canSeePage(page: PageDoc, userId: string, role?: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (page.visibility === "PUBLIC" || page.visibility === "WORKSPACE") return true;
  const isOwner = page.creatorId === userId;
  const isAllowed = (page.allowedUsers || []).some((id) => String(id) === userId);
  return isOwner || isAllowed;
}

export default function PagesListPage() {
  const router = useRouter();
  const { user, activeOrg } = useAuth();

  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | PageVisibility>("ALL");
  const [ownershipFilter, setOwnershipFilter] = useState<"ALL" | "ME" | "SHARED">("ALL");
  const [recentFilter, setRecentFilter] = useState<"ALL" | "RECENT">("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createVisibility, setCreateVisibility] = useState<PageVisibility>("WORKSPACE");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<PageDoc | null>(null);
  const [copiedPageId, setCopiedPageId] = useState<string | null>(null);

  const pagesQuery = usePagesQuery({ page: 1, limit: 200 });
  const createPage = useCreatePageMutation();
  const updatePage = useUpdatePageMutation();
  const deletePage = useDeletePageMutation();

  const currentRole = activeOrg?.role ?? user?.role;
  const currentUserId = user?.id ?? "";

  useEffect(() => {
    if (!copiedPageId) return;

    const timer = window.setTimeout(() => setCopiedPageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedPageId]);

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

  const handlePublish = async (page: PageDoc) => {
    try {
      const updated = await updatePage.mutateAsync({
        id: page.id,
        data: { visibility: "PUBLIC" },
      });

      setPublishTarget(updated.data);
      toast.success("Page published.");
    } catch {
      toast.error("Failed to publish page.");
    }
  };

  const handleUnpublish = async (page: PageDoc) => {
    try {
      await updatePage.mutateAsync({
        id: page.id,
        data: { visibility: "WORKSPACE" },
      });
      toast.success("Public link disabled.");
    } catch {
      toast.error("Failed to unpublish page.");
    }
  };

  const copyPublicLink = async (page: PageDoc) => {
    const absoluteUrl = toAbsolutePublicUrl(getPagePublicPath(page));
    if (!absoluteUrl) {
      toast.error("Publish this page first to create a public link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedPageId(page.id);
      toast.success("Public link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const visibleRows = useMemo(() => {
    const all = pagesQuery.data?.data.items ?? [];
    const term = search.trim().toLowerCase();
    const now = Date.now();

    return all
      .filter((page) => canSeePage(page, currentUserId, currentRole))
      .filter((page) => {
        if (visibilityFilter !== "ALL" && page.visibility !== visibilityFilter) {
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

        const indexed = `${page.title} ${extractPagePlainText(page.content)}`.toLowerCase();
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
        content: createEmptySerializedContent(),
        visibility: createVisibility,
      });

      toast.success(
        createVisibility === "PUBLIC" ? "Page created and published." : "Page created.",
      );
      setCreateOpen(false);
      setCreateTitle("");
      setCreateVisibility("WORKSPACE");
      router.push(`/pages/${created.data.id}`);
    } catch {
      toast.error("Failed to create page.");
    }
  };

  const publishPreviewPath = publishTarget
    ? toAbsolutePublicUrl(getPagePublicPreviewPath(publishTarget)) ||
      getPagePublicPreviewPath(publishTarget)
    : "";

  const publishAbsoluteUrl = publishTarget
    ? toAbsolutePublicUrl(getPagePublicPath(publishTarget))
    : null;

  return (
    <div className="mx-auto flex h-[calc(100vh-65px)] w-full max-w-7xl min-h-0 flex-col overflow-hidden px-4 py-2 lg:px-0">
      <div className="flex shrink-0 flex-col gap-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-1 lg:gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages..."
                className="h-9 rounded-card border-border/40 bg-muted/20 pl-10 pr-4 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0 lg:overflow-visible">
              <Select
                value={visibilityFilter}
                onValueChange={(value) => setVisibilityFilter(value as "ALL" | PageVisibility)}
              >
                <SelectTrigger className="h-8 min-w-30 rounded-card border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-35 lg:text-xs lg:rounded-card">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent className="rounded-card border-border/40">
                  <SelectItem value="ALL">All visibility</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="WORKSPACE">Workspace</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={ownershipFilter}
                onValueChange={(value) => setOwnershipFilter(value as "ALL" | "ME" | "SHARED")}
              >
                <SelectTrigger className="h-8 min-w-30 rounded-card border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-35 lg:text-xs lg:rounded-card">
                  <SelectValue placeholder="Ownership" />
                </SelectTrigger>
                <SelectContent className="rounded-card border-border/40">
                  <SelectItem value="ALL">All pages</SelectItem>
                  <SelectItem value="ME">Created by me</SelectItem>
                  <SelectItem value="SHARED">Shared with me</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={recentFilter}
                onValueChange={(value) => setRecentFilter(value as "ALL" | "RECENT")}
              >
                <SelectTrigger className="h-8 min-w-30 rounded-card border-border/40 bg-muted/20 px-3 text-[10px] font-bold uppercase tracking-wider lg:h-10 lg:min-w-35 lg:text-xs lg:rounded-card">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="rounded-card border-border/40">
                  <SelectItem value="ALL">Any time</SelectItem>
                  <SelectItem value="RECENT">Edited in 3 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="h-9 w-full rounded-card px-4 lg:h-10 lg:w-auto lg:ml-auto font-bold text-xs lg:text-sm shadow-sm"
            onClick={() => setCreateOpen(true)}
            variant="secondary"
          >
            <Plus className="mr-1.5 size-4" />
            Create Page
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {pagesQuery.isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-card border border-white/5 bg-white/3 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                     <Skeleton className="h-4 w-4 rounded-button" />
                     <Skeleton className="h-5 w-2/3" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <Skeleton className="size-5 rounded-full" />
                       <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!pagesQuery.isLoading && visibleRows.length === 0 ? (
          <div className="rounded-card border border-white/5 bg-white/3 p-8 text-center">
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleRows.map((page) => {
              const excerpt = extractPagePlainText(page.content || "").slice(0, 100) || "No content yet";
              const ownerName =
                `${page.creator?.firstName || ""} ${page.creator?.lastName || ""}`.trim() ||
                "Unknown";

              return (
                <Link
                  key={page.id}
                  href={`/pages/${page.id}`}
                  className="group flex h-full flex-col rounded-card border border-white/5 bg-white/3 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5 hover:border-white/10 hover:shadow-2xl hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="mt-0.5 size-7 rounded-card bg-muted/30 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <FileText className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-bold text-foreground/90 group-hover:text-primary transition-colors leading-none pt-0.5">
                          {page.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 lg:hidden">
                           <PageVisibilityBadge visibility={page.visibility} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="hidden lg:block">
                        <PageVisibilityBadge visibility={page.visibility} />
                      </div>
                      {canManage(page) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-card hover:bg-white/5"
                            >
                              <MoreVertical className="size-4 text-muted-foreground/40" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-card border-border/40 shadow-2xl bg-popover/95 backdrop-blur-xl">
                            <DropdownMenuItem
                              className="rounded-card gap-2.5"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                router.push(`/pages/${page.id}`);
                              }}
                            >
                              <Pencil className="size-3.5 opacity-60" />
                              <span className="font-medium">Edit Page</span>
                            </DropdownMenuItem>

                            {page.visibility !== "PUBLIC" ? (
                              <DropdownMenuItem
                                className="rounded-card gap-2.5"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setPublishTarget(page);
                                }}
                              >
                                <Globe className="size-3.5 opacity-60" />
                                <span className="font-medium">Publish Page</span>
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  className="rounded-card gap-2.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void copyPublicLink(page);
                                  }}
                                >
                                  <Copy className="size-3.5 opacity-60" />
                                  <span className="font-medium">{copiedPageId === page.id ? "Copied" : "Copy Link"}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="rounded-card gap-2.5"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void handleUnpublish(page);
                                  }}
                                >
                                  <Users className="size-3.5 opacity-60" />
                                  <span className="font-medium">Unpublish</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator className="bg-border/10" />
                            <DropdownMenuItem
                              className="rounded-card gap-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-600"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setPageToDelete(page.id);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              <span className="font-medium">Delete Page</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>

                  <p className="line-clamp-2 text-xs lg:text-[13px] leading-relaxed text-muted-foreground/50 mb-4 group-hover:text-muted-foreground/70 transition-colors">
                    {excerpt}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="size-6 ring-2 ring-background border border-white/5">
                        <AvatarImage src={page.creator?.avatarUrl} alt={ownerName} />
                        <AvatarFallback className="text-[8px] font-bold bg-muted/50">
                          {toInitials(page.creator?.firstName, page.creator?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-[11px] font-semibold text-foreground/60 group-hover:text-foreground/80 transition-colors">
                        {ownerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/40">
                        <CalendarDays className="size-3" />
                        <span>{new Date(page.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="size-1 rounded-full bg-border/20" />
                      <span className="text-[9px] uppercase font-black tracking-tighter text-muted-foreground/30">
                        {page.creatorId === currentUserId ? "Owned" : "Shared"}
                      </span>
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
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-card border px-3 py-2 text-left transition-colors ${
                    createVisibility === "PRIVATE"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  onClick={() => setCreateVisibility("PRIVATE")}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock className="size-4" />
                    Private
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Only you can open it.</p>
                </button>
                <button
                  type="button"
                  className={`rounded-card border px-3 py-2 text-left transition-colors ${
                    createVisibility === "WORKSPACE"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  onClick={() => setCreateVisibility("WORKSPACE")}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4" />
                    Workspace
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Visible to workspace members.</p>
                </button>
                <button
                  type="button"
                  className={`rounded-card border px-3 py-2 text-left transition-colors ${
                    createVisibility === "PUBLIC"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  onClick={() => setCreateVisibility("PUBLIC")}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="size-4" />
                    Public
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Anyone with the link can read it.</p>
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
        <DialogContent className="sm:max-w-100 rounded-card border-border/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone. This will permanently delete the page and all its content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-card" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-card bg-rose-500 hover:bg-rose-600"
              onClick={handleDelete}
              loading={deletePage.isPending}
            >
              Delete Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PublishPageDialog
        open={Boolean(publishTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPublishTarget(null);
          }
        }}
        pageTitle={publishTarget?.title || ""}
        previewPath={publishPreviewPath}
        publicUrl={publishAbsoluteUrl}
        isPublished={publishTarget?.visibility === "PUBLIC"}
        isPublishing={updatePage.isPending}
        copied={copiedPageId === publishTarget?.id}
        onPublish={() => (publishTarget ? handlePublish(publishTarget) : undefined)}
        onCopy={() => (publishTarget ? copyPublicLink(publishTarget) : undefined)}
      />

      <style>{`
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

