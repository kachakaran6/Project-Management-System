"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Bold,
  CalendarDays,
  CheckSquare,
  Code2,
  Copy,
  Globe,
  Heading2,
  Italic,
  List,
  Lock,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePageQuery,
  useUpdatePageMutation,
} from "@/features/pages/hooks/use-pages-query";
import { PageVisibility } from "@/types/page.types";

function visibilityBadge(visibility: PageVisibility) {
  return visibility === "PUBLIC" ? (
    <Badge variant="default" className="gap-1">
      <Globe className="size-3" />
      Public
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Lock className="size-3" />
      Private
    </Badge>
  );
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export default function PageEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pageId = params?.id ?? "";

  const { user, activeOrg } = useAuth();
  const role = activeOrg?.role ?? user?.role;

  const pageQuery = usePageQuery(pageId, Boolean(pageId));
  const updatePage = useUpdatePageMutation();
  const createPage = useCreatePageMutation();
  const deletePage = useDeletePageMutation();

  const editorRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [visibility, setVisibility] = useState<PageVisibility>("PRIVATE");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const page = pageQuery.data?.data;

  const canAdminOverride = role === "SUPER_ADMIN" || role === "ADMIN";
  const isCreator = page?.creatorId === user?.id;
  const canView = useMemo(() => {
    if (!page) return false;
    if (canAdminOverride) return true;
    if (page.visibility === "PUBLIC") return true;
    return isCreator;
  }, [canAdminOverride, isCreator, page]);

  const canEdit = useMemo(() => {
    if (!page) return false;
    if (canAdminOverride) return true;
    if (isCreator) return true;
    return page.visibility === "PUBLIC";
  }, [canAdminOverride, isCreator, page]);

  const baseline = useMemo(
    () => JSON.stringify({ title, content, visibility }),
    [content, title, visibility],
  );
  const lastSaved = useRef("");

  useEffect(() => {
    if (!page) return;

    setTitle(page.title);
    setContent(page.content || "<p></p>");
    setVisibility(page.visibility);
    setHasHydrated(true);
    setSaveStatus("idle");

    const snapshot = JSON.stringify({
      title: page.title,
      content: page.content || "<p></p>",
      visibility: page.visibility,
    });

    lastSaved.current = snapshot;

    if (editorRef.current) {
      editorRef.current.innerHTML = page.content || "<p></p>";
    }
  }, [page]);

  useEffect(() => {
    if (!hasHydrated || !canEdit) return;

    if (baseline === lastSaved.current) {
      if (saveStatus !== "saved") {
        setSaveStatus("saved");
      }
      return;
    }

    setSaveStatus("dirty");

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await updatePage.mutateAsync({
          id: pageId,
          data: {
            title,
            content,
            visibility,
          },
        });
        lastSaved.current = JSON.stringify({ title, content, visibility });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [
    baseline,
    canEdit,
    content,
    hasHydrated,
    pageId,
    saveStatus,
    title,
    updatePage,
    visibility,
  ]);

  const exec = (command: string, value?: string) => {
    if (!canEdit) return;

    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value);
    setContent(editor.innerHTML);
  };

  const insertChecklist = () => {
    if (!canEdit || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertHTML", false, "<p>☐ Checklist item</p>");
    setContent(editorRef.current.innerHTML);
  };

  const insertCodeBlock = () => {
    if (!canEdit || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(
      "insertHTML",
      false,
      "<pre><code>// code block</code></pre><p></p>",
    );
    setContent(editorRef.current.innerHTML);
  };

  const handleDuplicate = async () => {
    if (!page) return;

    try {
      const created = await createPage.mutateAsync({
        title: `${title} (Copy)`,
        content,
        visibility,
      });
      toast.success("Page duplicated.");
      router.push(`/pages/${created.data.id}`);
    } catch {
      toast.error("Failed to duplicate page.");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePage.mutateAsync(pageId);
      toast.success("Page deleted.");
      setDeleteOpen(false);
      router.push("/pages");
    } catch {
      toast.error("Failed to delete page.");
    }
  };

  if (pageQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 rounded-xl bg-muted/40" />
        <div className="h-72 rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (!page || !canView) {
    return (
      <Alert variant="warning">
        <AlertTitle>Page unavailable</AlertTitle>
        <AlertDescription>
          This page is private or you do not have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {visibilityBadge(visibility)}
            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" />
              Last edited {new Date(page.updatedAt).toLocaleString()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? "Auto-save enabled"
              : "Read-only mode"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saveStatus === "saving" ? "Saving..." : null}
            {saveStatus === "saved" ? "Saved" : null}
            {saveStatus === "dirty" ? "Unsaved changes" : null}
            {saveStatus === "error" ? "Save failed" : null}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            disabled={createPage.isPending}
          >
            <Copy className="mr-1.5 size-3.5" />
            Duplicate
          </Button>

          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deletePage.isPending}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mb-4 h-12 border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
          placeholder="Untitled"
          disabled={!canEdit}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border p-1">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                visibility === "PRIVATE"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setVisibility("PRIVATE")}
              disabled={!canEdit}
            >
              <Lock className="size-3.5" />
              Private
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                visibility === "PUBLIC"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setVisibility("PUBLIC")}
              disabled={!canEdit}
            >
              <Globe className="size-3.5" />
              Public
            </button>
          </div>

          <div className="h-5 w-px bg-border" />

          <Button variant="ghost" size="sm" onClick={() => exec("bold")} disabled={!canEdit}>
            <Bold className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exec("italic")} disabled={!canEdit}>
            <Italic className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exec("formatBlock", "<h2>")} disabled={!canEdit}>
            <Heading2 className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exec("insertUnorderedList")} disabled={!canEdit}>
            <List className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertChecklist} disabled={!canEdit}>
            <CheckSquare className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertCodeBlock} disabled={!canEdit}>
            <Code2 className="size-3.5" />
          </Button>
        </div>

        <div
          ref={editorRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onInput={(event) => setContent((event.target as HTMLDivElement).innerHTML)}
          className="min-h-105 rounded-xl border border-border bg-background p-4 text-[15px] leading-7 outline-none transition-colors focus:border-primary/50"
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The page and all notes inside it will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deletePage.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
