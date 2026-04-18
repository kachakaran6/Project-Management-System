"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/lib/next-navigation";
import {
  FileText,
  Filter,
  Globe,
  Info,
  Lock,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, FilterBar } from "@/components/layout/page-header";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCreatePageMutation,
  usePagesQuery,
} from "@/features/pages/hooks/use-pages-query";
import { PageDoc, PageVisibility } from "@/types/page.types";

function toInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function canSeePage(page: PageDoc, userId: string, role?: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (page.visibility === "PUBLIC") return true;
  return page.creatorId === userId;
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
  const [visibilityFilter, setVisibilityFilter] = useState<"ALL" | PageVisibility>("ALL");
  const [ownershipFilter, setOwnershipFilter] = useState<"ALL" | "ME" | "SHARED">("ALL");
  const [recentFilter, setRecentFilter] = useState<"ALL" | "RECENT">("ALL");

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createVisibility, setCreateVisibility] = useState<PageVisibility>("PRIVATE");

  const pagesQuery = usePagesQuery({ page: 1, limit: 200 });
  const createPage = useCreatePageMutation();

  const currentRole = activeOrg?.role ?? user?.role;
  const currentUserId = user?.id ?? "";

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

        const indexed = `${page.title} ${stripHtml(page.content)}`.toLowerCase();
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

  const stats = useMemo(() => {
    const rows = visibleRows;
    return {
      total: rows.length,
      publicCount: rows.filter((item) => item.visibility === "PUBLIC").length,
      privateCount: rows.filter((item) => item.visibility === "PRIVATE").length,
      mineCount: rows.filter((item) => item.creatorId === currentUserId).length,
    };
  }, [currentUserId, visibleRows]);

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
      setCreateVisibility("PRIVATE");
      router.push(`/pages/${created.data.id}`);
    } catch {
      toast.error("Failed to create page.");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-0 overflow-hidden -mt-2">
      {/* Header Area */}
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold">Pages</h1>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..." 
              className="h-8 w-40 md:w-60 bg-transparent border-transparent hover:bg-muted/50 focus:bg-muted/50 focus:border-border transition-all pl-8 text-xs"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Filter className="size-3.5" />
          </Button>
          <Button size="sm" className="h-8 px-3 text-xs gap-1.5 font-semibold" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            New Page
          </Button>
        </div>
      </div>

      {/* Tabs Area */}
      <div className="flex items-center gap-6 px-6 border-b border-border/40">
        {[
          { id: "PUBLIC", label: "Public" },
          { id: "PRIVATE", label: "Private" },
          { id: "ARCHIVED", label: "Archived" }
        ].map((tab) => {
          const isActive = (tab.id === "PUBLIC" && visibilityFilter === "PUBLIC") || 
                           (tab.id === "PRIVATE" && visibilityFilter === "PRIVATE") ||
                           (tab.id === "ARCHIVED" && recentFilter === "RECENT"); // Just for demo logic
          
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "ARCHIVED") {
                  setVisibilityFilter("ALL");
                  setRecentFilter("RECENT");
                } else {
                  setVisibilityFilter(tab.id as PageVisibility);
                  setRecentFilter("ALL");
                }
              }}
              className={cn(
                "relative py-3 text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-transparent">
        {pagesQuery.isLoading ? (
          <div className="px-6 py-4 space-y-4">
             {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-full rounded-md bg-muted/20 animate-pulse" />)}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={NotebookPen}
              title="No pages found"
              description="Start simple. Create a page to capture your thoughts."
              actionLabel="Create Page"
              onAction={() => setCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {visibleRows.map((page) => (
              <div
                key={page.id}
                onClick={() => router.push(`/pages/${page.id}`)}
                className="group flex items-center justify-between px-6 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <FileText className="size-4 text-muted-foreground/60 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-medium text-foreground/90 truncate">
                      {page.title || "Untitled"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center -space-x-1.5">
                    <Avatar className="size-5 border border-background shadow-sm">
                      <AvatarImage src={page.creator?.avatarUrl} />
                      <AvatarFallback className="text-[8px] font-bold bg-muted">
                        {toInitials(page.creator?.firstName, page.creator?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                      <Info className="size-3.5" />
                    </button>
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                      <Star className="size-3.5" />
                    </button>
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
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
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    createVisibility === "PRIVATE"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setCreateVisibility("PRIVATE")}
                >
                  <Lock className="size-3.5" />
                  Private
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    createVisibility === "PUBLIC"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setCreateVisibility("PUBLIC")}
                >
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
    </div>
  );
}

