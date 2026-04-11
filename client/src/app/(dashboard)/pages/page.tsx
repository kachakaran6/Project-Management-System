"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Globe,
  Lock,
  NotebookPen,
  Plus,
  Search,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build internal docs, notes, and knowledge pages with privacy control.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Page
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Pages Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Search by title or content"
              />
            </div>

            <Select
              value={visibilityFilter}
              onValueChange={(value) =>
                setVisibilityFilter(value as "ALL" | PageVisibility)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All visibility</SelectItem>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={ownershipFilter}
              onValueChange={(value) =>
                setOwnershipFilter(value as "ALL" | "ME" | "SHARED")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Ownership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Everyone</SelectItem>
                <SelectItem value="ME">Created by me</SelectItem>
                <SelectItem value="SHARED">Created by others</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={recentFilter}
              onValueChange={(value) =>
                setRecentFilter(value as "ALL" | "RECENT")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Edited" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All time</SelectItem>
                <SelectItem value="RECENT">Recently edited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pagesQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-14 rounded-lg bg-muted/40" />
              <div className="h-14 rounded-lg bg-muted/40" />
              <div className="h-14 rounded-lg bg-muted/40" />
            </div>
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Create your first page"
              description="No pages match your current filters. Start writing docs for your workspace."
              actionLabel="Create Page"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Title</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead>Creator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((page) => (
                  <TableRow
                    key={page.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/pages/${page.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {stripHtml(page.content) || "No content yet"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{visibilityBadge(page.visibility)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {new Date(page.updatedAt).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={page.creator?.avatarUrl} />
                          <AvatarFallback>
                            {toInitials(page.creator?.firstName, page.creator?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {page.creator
                              ? `${page.creator.firstName} ${page.creator.lastName}`.trim()
                              : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {page.creator?.email ?? "No email"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
