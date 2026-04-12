"use client";

import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AtSign,
  Bold,
  CalendarDays,
  CheckSquare,
  Code2,
  Copy,
  Download,
  Globe,
  Highlighter,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  Lock,
  Minus,
  Pilcrow,
  Quote,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Mention from "@tiptap/extension-mention";

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
  useExportPagePdfMutation,
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

type SlashCommand = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
};

function toPlainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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
  const exportPdf = useExportPagePdfMutation();

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [visibility, setVisibility] = useState<PageVisibility>("PRIVATE");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });

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
  const hydratedPageId = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: "Type '/' for commands, or start writing your document..." }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Mention.configure({
        HTMLAttributes: {
          class: "rounded bg-muted px-1 py-0.5 text-foreground",
        },
      }),
    ],
    content,
    onUpdate: ({ editor: activeEditor }) => {
      setContent(activeEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] rounded-2xl border border-border bg-background p-5 text-[15px] leading-7 outline-none focus-visible:ring-0",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          const pos = view.state.selection.from;
          const coords = view.coordsAtPos(pos);
          setSlashPos({ left: coords.left, top: coords.bottom + 8 });
          setSlashOpen(true);
        }

        if (event.key === "Escape") {
          setSlashOpen(false);
        }

        return false;
      },
    },
    immediatelyRender: false,
  });

  const insertSlashBlock = (run: () => void) => {
    run();
    setSlashOpen(false);
    editor?.commands.focus();
  };

  const slashCommands: SlashCommand[] = [
    {
      id: "h1",
      label: "Heading 1",
      icon: Heading1,
      run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      label: "Heading 2",
      icon: Heading2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "list",
      label: "Bullet List",
      icon: List,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      id: "task",
      label: "Checklist",
      icon: CheckSquare,
      run: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      id: "quote",
      label: "Quote",
      icon: Quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "code",
      label: "Code Block",
      icon: Code2,
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "divider",
      label: "Divider",
      icon: Minus,
      run: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "mention",
      label: "Mention",
      icon: AtSign,
      run: () => editor?.chain().focus().insertContent("@teammate ").run(),
    },
  ];

  const plainText = useMemo(() => toPlainText(content), [content]);
  const wordCount = useMemo(() => {
    if (!plainText) return 0;
    return plainText.split(" ").filter(Boolean).length;
  }, [plainText]);
  const readTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 220)), [wordCount]);

  useEffect(() => {
    if (!page) return;

    const serverSnapshot = JSON.stringify({
      title: page.title,
      content: page.content || "<p></p>",
      visibility: page.visibility,
    });

    const isNewPage = hydratedPageId.current !== page.id;
    const hasLocalUnsavedChanges = baseline !== lastSaved.current;

    // For autosave/refetch cycles on the same page, do not overwrite active typing.
    if (!isNewPage && hasHydrated) {
      if (hasLocalUnsavedChanges || serverSnapshot === lastSaved.current) {
        return;
      }
    }

    setTitle(page.title);
    setContent(page.content || "<p></p>");
    setVisibility(page.visibility);
    setHasHydrated(true);
    setSaveStatus(isNewPage ? "idle" : "saved");
    lastSaved.current = serverSnapshot;
    hydratedPageId.current = page.id;

    if (editor) {
      editor.commands.setContent(page.content || "<p></p>", false);
    }
  }, [baseline, editor, hasHydrated, page]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

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

  const handleExportPdf = async () => {
    if (!page) return;

    try {
      const blob = await exportPdf.mutateAsync(page.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title || "page"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF export started.");
    } catch {
      toast.error("Failed to export PDF.");
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
    <div className="mx-auto w-full max-w-6xl space-y-4">
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
            onClick={handleExportPdf}
            disabled={exportPdf.isPending}
          >
            <Download className="mr-1.5 size-3.5" />
            Export PDF
          </Button>

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

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mb-4 h-12 border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
            placeholder="Untitled"
            disabled={!canEdit}
          />

          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
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

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!canEdit}
            >
              <Bold className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!canEdit}
            >
              <Italic className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={!canEdit}
            >
              <UnderlineIcon className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              disabled={!canEdit}
            >
              <Highlighter className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={!canEdit}
            >
              <Heading2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!canEdit}
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              disabled={!canEdit}
            >
              <CheckSquare className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              disabled={!canEdit}
            >
              <Code2 className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              disabled={!canEdit}
            >
              <Quote className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().insertContent("@teammate ").run()}
              disabled={!canEdit}
            >
              <AtSign className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setLink({ href: "https://" }).run()}
              disabled={!canEdit}
            >
              <Link2 className="size-3.5" />
            </Button>
          </div>

          <EditorContent editor={editor} />

          {slashOpen && canEdit ? (
            <div
              className="absolute z-20 w-56 rounded-xl border border-border bg-popover p-1 shadow-lg"
              style={{
                top: slashPos.top,
                left: Math.max(16, slashPos.left - 70),
              }}
            >
              {slashCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => insertSlashBlock(command.run)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <command.icon className="size-4 text-muted-foreground" />
                  {command.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="h-fit space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Page Metadata
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">Word Count</span>
              <span className="font-medium">{wordCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">Read Time</span>
              <span className="font-medium">{readTime} min</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium inline-flex items-center gap-1">
                <Pilcrow className="size-3.5" />
                Rich Document
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">Visibility</span>
              <span className="font-medium">{visibility}</span>
            </div>
          </div>
        </div>
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
