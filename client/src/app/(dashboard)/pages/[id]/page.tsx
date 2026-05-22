import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "@/lib/next-navigation";
import {
  AtSign,
  Bold,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Copy,
  FileCode2,
  FileImage,
  Globe,
  GripVertical,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  MoveDown,
  MoveUp,
  Plus,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import CharacterCount from "@tiptap/extension-character-count";
import { all, createLowlight } from "lowlight";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { PageVisibilityBadge } from "@/features/pages/components/page-visibility-badge";
import { PublishPageDialog } from "@/features/pages/components/publish-page-dialog";
import { PageLinkedTasks } from "@/features/pages/components/page-linked-tasks";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePageQuery,
  useUpdatePageMutation,
} from "@/features/pages/hooks/use-pages-query";
import {
  createSerializedPageContent,
  extractPagePlainText,
  getTemplateDocument,
  PAGE_TEMPLATES,
  parsePageContent,
  type PageBlock,
  type PageTemplateId,
} from "@/features/pages/utils/page-content";
import {
  getPagePublicPath,
  getPagePublicPreviewPath,
  toAbsolutePublicUrl,
} from "@/features/pages/utils/page-sharing";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { PageDoc, PageVisibility } from "@/types/page.types";

const lowlight = createLowlight(all);

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type SlashCommand = {
  id: string;
  title: string;
  hint: string;
  icon: typeof Type;
  run: () => void;
};

function toInitials(firstName?: string, lastName?: string) {
  return (
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U"
  );
}

function canViewPage(page: PageDoc, userId: string, role?: string) {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  if (page.visibility === "WORKSPACE" || page.visibility === "PUBLIC") return true;
  const isOwner = page.creatorId === userId;
  const isAllowed = (page.allowedUsers || []).some((id) => String(id) === userId);
  return isOwner || isAllowed;
}

function safePrompt(message: string) {
  const value = window.prompt(message);
  return value ? value.trim() : "";
}

export default function PageEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const pageId = params?.id ?? "";
  const { user, activeOrg } = useAuth();
  const currentRole = activeOrg?.role ?? user?.role;
  const currentUserId = user?.id ?? "";

  const pageQuery = usePageQuery(pageId, Boolean(pageId));
  const updatePage = useUpdatePageMutation();
  const createPage = useCreatePageMutation();
  const deletePage = useDeletePageMutation();

  const membersQuery = useOrganizationMembersQuery(activeOrg?.id || "");
  const members = membersQuery.data?.data.members || [];
  const tasksQuery = useTasksQuery({ page: 1, limit: 100 }, { staleTime: 20_000 });
  const tasks = tasksQuery.data?.data.items || [];

  const [title, setTitle] = useState("Untitled");
  const [visibility, setVisibility] = useState<PageVisibility>("WORKSPACE");
  const [icon, setIcon] = useState("P");
  const [coverUrl, setCoverUrl] = useState("");
  const [templateId, setTemplateId] = useState<PageTemplateId>("empty");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshot = useRef("");
  const hydratedPageId = useRef("");

  const page = pageQuery.data?.data;
  const canView = page ? canViewPage(page, currentUserId, currentRole) : false;
  const canEdit = Boolean(page && page.creatorId === currentUserId);

  const publicPreviewPath =
    toAbsolutePublicUrl(
      getPagePublicPreviewPath({
        title,
        publicId: page?.publicId ?? null,
        publicSlug: page?.publicSlug ?? null,
        publicUrl: page?.publicUrl ?? null,
      }),
    ) ||
    getPagePublicPreviewPath({
      title,
      publicId: page?.publicId ?? null,
      publicSlug: page?.publicSlug ?? null,
      publicUrl: page?.publicUrl ?? null,
    });

  const publicPageUrl = toAbsolutePublicUrl(getPagePublicPath(page || null));

  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing...",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Mention.configure({
        HTMLAttributes: {
          class: "rounded-button bg-primary/10 px-1.5 py-0.5 text-primary font-medium",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        allowBase64: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      CharacterCount,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class:
          "ProseMirror page-editor min-h-[520px] w-full rounded-card border border-border/60 bg-card px-6 py-6 text-[16px] leading-7 text-foreground shadow-sm outline-none sm:px-8",
      },
      handleKeyDown: (view, event) => {
        if (!canEdit) return false;

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
    onUpdate: () => {
      if (!canEdit) return;
      setSaveState("dirty");
    },
    immediatelyRender: false,
  });

  const applyHydratedContent = (nextPage: PageDoc) => {
    const parsed = parsePageContent(nextPage.content);
    const nextTitle = nextPage.title || "Untitled";

    setTitle(nextTitle);
    setVisibility(nextPage.visibility);
    setIcon(parsed.meta.icon || "P");
    setCoverUrl(parsed.meta.coverUrl || "");
    setTemplateId((parsed.meta.templateId as PageTemplateId) || "empty");

    if (editor) {
      if (parsed.isStructured) {
        editor.commands.setContent(parsed.doc, { emitUpdate: false });
      } else {
        editor.commands.setContent(parsed.html, { emitUpdate: false });
      }
    }

    const html = parsed.isStructured ? parsed.html : parsed.html;
    const doc = parsed.isStructured ? parsed.doc : (editor?.getJSON() || { type: "doc", content: [{ type: "paragraph" }] });

    const snapshot = JSON.stringify({
      title: nextTitle,
      visibility: nextPage.visibility,
      content: createSerializedPageContent({
        html,
        doc,
        meta: {
          icon: parsed.meta.icon || "P",
          coverUrl: parsed.meta.coverUrl || "",
          templateId: (parsed.meta.templateId as PageTemplateId) || "empty",
        },
      }),
    });

    lastSavedSnapshot.current = snapshot;
    setSaveState("saved");
    hydratedPageId.current = nextPage.id;
  };

  useEffect(() => {
    if (!page || !editor) return;
    if (hydratedPageId.current === page.id) return;

    applyHydratedContent(page);
  }, [editor, page]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  const serializedContent = useMemo(() => {
    if (!editor) return "";

    return createSerializedPageContent({
      html: editor.getHTML(),
      doc: editor.getJSON(),
      meta: {
        icon,
        coverUrl,
        templateId,
      },
    });
  }, [coverUrl, editor, icon, templateId, saveState]);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        visibility,
        content: serializedContent,
      }),
    [serializedContent, title, visibility],
  );

  useEffect(() => {
    if (!canEdit || !editor || !page) return;
    if (!serializedContent) return;

    if (currentSnapshot === lastSavedSnapshot.current) {
      if (saveState !== "saved") {
        setSaveState("saved");
      }
      return;
    }

    setSaveState("dirty");

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(async () => {
      try {
        setSaveState("saving");

        await updatePage.mutateAsync({
          id: page.id,
          data: {
            title: title.trim() || "Untitled",
            visibility,
            content: serializedContent,
          },
        });

        lastSavedSnapshot.current = JSON.stringify({
          title: title.trim() || "Untitled",
          visibility,
          content: serializedContent,
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
  }, [
    canEdit,
    currentSnapshot,
    editor,
    page,
    saveState,
    serializedContent,
    title,
    updatePage,
    visibility,
  ]);

  useEffect(() => {
    if (!copiedPublicLink) return;

    const timer = window.setTimeout(() => setCopiedPublicLink(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedPublicLink]);

  const insertLink = () => {
    if (!editor || !canEdit) return;
    const href = safePrompt("Enter a URL (https://...)");
    if (!href) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const insertImage = () => {
    if (!editor || !canEdit) return;
    const src = safePrompt("Paste image URL");
    if (!src) return;

    editor.chain().focus().setImage({ src, alt: "Page image" }).run();
  };

  const insertTable = () => {
    if (!editor || !canEdit) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const applyTemplate = (nextTemplate: PageTemplateId) => {
    if (!editor || !canEdit) return;

    const templateDoc = getTemplateDocument(nextTemplate);
    editor.commands.setContent(templateDoc, { emitUpdate: true });
    setTemplateId(nextTemplate);
    toast.success("Template applied.");
  };

  const slashCommands: SlashCommand[] = [
    {
      id: "text",
      title: "Text",
      hint: "Plain paragraph",
      icon: Type,
      run: () => editor?.chain().focus().setParagraph().run(),
    },
    {
      id: "h1",
      title: "Heading 1",
      hint: "Large section title",
      icon: Heading1,
      run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      hint: "Medium section title",
      icon: Heading2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "table",
      title: "Table",
      hint: "Insert editable table",
      icon: TableIcon,
      run: insertTable,
    },
    {
      id: "checklist",
      title: "Checklist",
      hint: "Track action items",
      icon: ListChecks,
      run: () => editor?.chain().focus().toggleTaskList().run(),
    },
    {
      id: "code",
      title: "Code Block",
      hint: "Share technical snippets",
      icon: FileCode2,
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "image",
      title: "Image",
      hint: "Paste image URL",
      icon: FileImage,
      run: insertImage,
    },
  ];

  const blocks: PageBlock[] = useMemo(() => {
    if (!editor) return [];
    return parsePageContent(serializedContent).blocks;
  }, [editor, serializedContent, saveState]);

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (!editor || fromIndex === toIndex) return;

    const json = editor.getJSON();
    const content = Array.isArray(json.content) ? [...json.content] : [];

    if (fromIndex < 0 || fromIndex >= content.length || toIndex < 0 || toIndex >= content.length) {
      return;
    }

    const [moved] = content.splice(fromIndex, 1);
    content.splice(toIndex, 0, moved);

    const nextDoc: JSONContent = {
      type: "doc",
      content,
    };

    editor.commands.setContent(nextDoc, { emitUpdate: true });
    setSaveState("dirty");
  };

  const deleteBlock = (index: number) => {
    if (!editor) return;

    const json = editor.getJSON();
    const content = Array.isArray(json.content) ? [...json.content] : [];

    if (index < 0 || index >= content.length) return;

    content.splice(index, 1);

    editor.commands.setContent(
      {
        type: "doc",
        content: content.length > 0 ? content : [{ type: "paragraph" }],
      },
      { emitUpdate: true },
    );

    setSaveState("dirty");
  };

  const toggleUserAccess = async (userId: string) => {
    if (!page || !canEdit) return;

    const currentAllowed = page.allowedUsers || [];
    const isShared = currentAllowed.some((id) => String(id) === userId);
    const nextAllowed = isShared
      ? currentAllowed.filter((id) => String(id) !== userId)
      : [...currentAllowed, userId];

    try {
      await updatePage.mutateAsync({
        id: page.id,
        data: { allowedUsers: nextAllowed },
      });

      toast.success(isShared ? "Access removed." : "Access granted.");
    } catch {
      toast.error("Failed to update access.");
    }
  };

  const updateVisibility = async (nextVisibility: PageVisibility) => {
    if (!page || !canEdit) return;

    try {
      const updated = await updatePage.mutateAsync({
        id: page.id,
        data: {
          visibility: nextVisibility,
        },
      });

      setVisibility(updated.data.visibility);
      toast.success(
        nextVisibility === "PUBLIC"
          ? "Page published."
          : nextVisibility === "PRIVATE"
            ? "Page is now private."
            : "Page is now workspace-visible.",
      );
    } catch {
      toast.error("Failed to update visibility.");
    }
  };

  const copyPublicLink = async () => {
    if (!publicPageUrl) {
      toast.error("Publish the page first to create a public link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicPageUrl);
      setCopiedPublicLink(true);
      toast.success("Public link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const duplicatePage = async () => {
    if (!page) return;

    try {
      const created = await createPage.mutateAsync({
        title: `${title} (Copy)`,
        visibility,
        content: serializedContent,
      });

      toast.success("Page duplicated.");
      router.push(`/pages/${created.data.id}`);
    } catch {
      toast.error("Failed to duplicate page.");
    }
  };

  const deletePageNow = async () => {
    if (!page) return;

    try {
      await deletePage.mutateAsync(page.id);
      toast.success("Page deleted.");
      router.push("/pages");
    } catch {
      toast.error("Failed to delete page.");
    }
  };

  const insertMentionUser = () => {
    if (!editor || !canEdit) return;

    const target = members.find((member) => member.id !== user?.id);
    const text = target ? `@${target.firstName}` : "@teammate";
    editor.chain().focus().insertContent(`${text} `).run();
  };

  const insertMentionTask = () => {
    if (!editor || !canEdit) return;

    const targetTask = tasks[0];
    const text = targetTask ? `#${targetTask.title}` : "#task";
    editor.chain().focus().insertContent(`${text} `).run();
  };

  const wordCount = useMemo(() => {
    const plainText = extractPagePlainText(serializedContent);
    if (!plainText) return 0;
    return plainText.split(/\s+/).filter(Boolean).length;
  }, [serializedContent]);

  const characterCount = editor?.storage.characterCount.characters() || 0;

  if (pageQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="h-10 w-48 animate-pulse rounded-card bg-muted/40" />
      </div>
    );
  }

  if ((pageQuery.isError && !page) || (page && !canView)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Alert variant="warning" className="max-w-lg">
          <AlertTitle>Page unavailable</AlertTitle>
          <AlertDescription>
            This page could not be loaded. It may be private, deleted, or unavailable to your account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_38%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_35%)] bg-background pb-20">
      <div className="sticky top-2 z-40 mx-auto w-full max-w-295 px-4 pt-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-card border border-border/60 bg-background/90 p-2 shadow-xl backdrop-blur-xl">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => editor?.chain().focus().setParagraph().run()}
            disabled={!canEdit}
          >
            <Type className="size-3.5" />
            Text
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!canEdit}>
            <Bold className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!canEdit}>
            <Italic className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={!canEdit}>
            <UnderlineIcon className="size-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!canEdit}>
            <List className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!canEdit}>
            <ListOrdered className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor?.chain().focus().toggleTaskList().run()} disabled={!canEdit}>
            <CheckSquare className="size-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertTable} disabled={!canEdit}>
            <TableIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertImage} disabled={!canEdit}>
            <ImagePlus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertLink} disabled={!canEdit}>
            <Link2 className="size-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" disabled={!canEdit}>
                <Plus className="size-3.5" />
                Mentions
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={insertMentionUser}>
                <AtSign className="mr-2 size-4" />
                Mention user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertMentionTask}>
                <ListChecks className="mr-2 size-4" />
                Mention task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2 pl-3">
            <Badge variant="secondary" className="h-7 rounded-full px-3 text-[11px]">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "error"
                  ? "Save failed"
                  : saveState === "dirty"
                    ? "Unsaved"
                    : "Saved"}
            </Badge>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setPublishOpen(true)}>
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-295 grid-cols-1 gap-6 px-4 pt-8 lg:grid-cols-[1fr_290px]">
        <main className="mx-auto w-full max-w-195">
          {coverUrl ? (
            <div className="mb-4 h-44 overflow-hidden rounded-card border border-border/40 bg-card">
              <img src={coverUrl} alt="Page cover" className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-card border border-border/50 bg-card px-3 py-2 text-lg"
              onClick={() => {
                if (!canEdit) return;
                const nextIcon = safePrompt("Set page icon (emoji recommended)");
                if (nextIcon) setIcon(nextIcon);
              }}
              disabled={!canEdit}
            >
              {icon || "P"}
            </button>

            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                if (!canEdit) return;
                const nextCoverUrl = safePrompt("Set cover image URL");
                if (nextCoverUrl) setCoverUrl(nextCoverUrl);
              }}
              disabled={!canEdit}
            >
              <FileImage className="mr-2 size-4" />
              Cover
            </Button>

            <Select value={templateId} onValueChange={(value) => applyTemplate(value as PageTemplateId)}>
              <SelectTrigger className="h-9 w-55">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <PageVisibilityBadge visibility={visibility} />
              <Button variant="outline" size="sm" className="h-9" onClick={() => setShareOpen(true)} disabled={!canEdit}>
                Permissions
              </Button>
            </div>
          </div>

          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Untitled"
            disabled={!canEdit}
            className="mb-5 h-auto border-none bg-transparent px-0 text-4xl font-black tracking-tight shadow-none focus-visible:ring-0 md:text-5xl"
          />

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5">
              <CalendarDays className="size-3.5" />
              Updated {new Date(page.updatedAt).toLocaleDateString()}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5">
              <span>{wordCount} words</span>
              <span>*</span>
              <span>{characterCount} chars</span>
            </div>
            {page.creator ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-2.5 py-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={page.creator.avatarUrl} alt={page.creator.firstName} />
                  <AvatarFallback className="text-[10px]">
                    {toInitials(page.creator.firstName, page.creator.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {`${page.creator.firstName} ${page.creator.lastName}`.trim() || "Unknown"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative">
            {editor ? <EditorContent editor={editor} /> : null}
          </div>

          {editor?.isActive("table") ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-border/50 bg-card p-2">
              <Button size="sm" variant="outline" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                Add column
              </Button>
              <Button size="sm" variant="outline" onClick={() => editor.chain().focus().deleteColumn().run()}>
                Remove column
              </Button>
              <Button size="sm" variant="outline" onClick={() => editor.chain().focus().addRowAfter().run()}>
                Add row
              </Button>
              <Button size="sm" variant="outline" onClick={() => editor.chain().focus().deleteRow().run()}>
                Remove row
              </Button>
            </div>
          ) : null}

          {slashOpen && canEdit ? (
            <div
              className="fixed z-50 w-72 rounded-card border border-border/60 bg-background/95 p-2 shadow-2xl backdrop-blur"
              style={{
                top: slashPos.top,
                left: Math.max(16, slashPos.left - 30),
              }}
            >
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Insert block
              </div>
              <div className="space-y-1">
                {slashCommands.map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-card px-2 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      command.run();
                      setSlashOpen(false);
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-button border border-border/40 bg-card">
                      <command.icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{command.title}</div>
                      <div className="text-[11px] text-muted-foreground">{command.hint}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <section className="rounded-card border border-border/60 bg-card p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Block Navigator
            </h3>
            <div className="space-y-1">
              {blocks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No blocks yet.</p>
              ) : (
                blocks.map((block, index) => (
                  <div
                    key={`${block.id}-${index}`}
                    draggable={canEdit}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      moveBlock(dragIndex, index);
                      setDragIndex(null);
                    }}
                    className="group flex items-start gap-2 rounded-card border border-transparent px-2 py-2 hover:border-border/60 hover:bg-muted/50"
                  >
                    <GripVertical className="mt-0.5 size-4 text-muted-foreground/60" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {block.type}
                      </div>
                      <div className="truncate text-xs text-foreground/85">{block.content || "Untitled block"}</div>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBlock(index, Math.max(0, index - 1))}>
                          <MoveUp className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBlock(index, Math.min(blocks.length - 1, index + 1))}>
                          <MoveDown className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteBlock(index)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <PageLinkedTasks pageId={page.id} canEdit={canEdit} />

          <section className="rounded-card border border-border/60 bg-card p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visibility
            </h3>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start" onClick={() => updateVisibility("PRIVATE")} disabled={!canEdit || visibility === "PRIVATE"}>
                <Lock className="mr-2 size-4" />
                Private
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => updateVisibility("WORKSPACE")} disabled={!canEdit || visibility === "WORKSPACE"}>
                <Users className="mr-2 size-4" />
                Workspace
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => updateVisibility("PUBLIC")} disabled={!canEdit || visibility === "PUBLIC"}>
                <Globe className="mr-2 size-4" />
                Public
              </Button>
            </div>
          </section>

          <section className="rounded-card border border-border/60 bg-card p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </h3>
            <div className="space-y-1">
              <Button variant="outline" className="w-full justify-start" onClick={duplicatePage} disabled={!canEdit || createPage.isPending}>
                <Copy className="mr-2 size-4" />
                Duplicate
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={copyPublicLink}>
                <Link2 className="mr-2 size-4" />
                {copiedPublicLink ? "Copied" : "Copy public link"}
              </Button>
              <Button variant="destructive" className="w-full justify-start" onClick={() => setDeleteOpen(true)} disabled={!canEdit}>
                <Trash2 className="mr-2 size-4" />
                Delete page
              </Button>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              This will permanently delete the page and all document content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePageNow} loading={deletePage.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PublishPageDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        pageTitle={title}
        previewPath={publicPreviewPath}
        publicUrl={publicPageUrl}
        isPublished={visibility === "PUBLIC"}
        isPublishing={updatePage.isPending}
        copied={copiedPublicLink}
        onPublish={() => updateVisibility("PUBLIC")}
        onCopy={copyPublicLink}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-115">
          <DialogHeader>
            <DialogTitle>Manage Private Access</DialogTitle>
            <DialogDescription>
              Grant or revoke access for private pages.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {members.filter((member) => member.id !== user?.id).map((member) => {
              const isShared = (page.allowedUsers || []).some((id) => String(id) === String(member.id));

              return (
                <div key={member.id} className="flex items-center justify-between rounded-card border border-border/40 p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl} alt={member.firstName} />
                      <AvatarFallback className="text-[10px]">
                        {toInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isShared ? "outline" : "secondary"}
                    onClick={() => toggleUserAccess(member.id)}
                    disabled={!canEdit || updatePage.isPending}
                  >
                    {isShared ? "Remove" : "Invite"}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .page-editor h1 { font-size: 2rem; line-height: 1.25; font-weight: 800; margin: 1.2rem 0 0.6rem; }
        .page-editor h2 { font-size: 1.45rem; line-height: 1.3; font-weight: 760; margin: 1rem 0 0.55rem; }
        .page-editor h3 { font-size: 1.2rem; line-height: 1.35; font-weight: 700; margin: 0.9rem 0 0.45rem; }
        .page-editor p { margin: 0.45rem 0; }
        .page-editor ul, .page-editor ol { margin: 0.5rem 0; padding-left: 1.2rem; }
        .page-editor ul ul, .page-editor ol ol, .page-editor ul ol, .page-editor ol ul { margin-top: 0.25rem; }
        .page-editor ul[data-type='taskList'] { list-style: none; padding-left: 0; }
        .page-editor li[data-type='taskItem'] { display: flex; align-items: flex-start; gap: 0.5rem; }
        .page-editor li[data-type='taskItem'] > label { margin-top: 0.2rem; }
        .page-editor pre { border-radius: 0.75rem; padding: 0.9rem; background: #0f172a; color: #e2e8f0; overflow-x: auto; }
        .page-editor code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace; }
        .page-editor img { border-radius: 0.75rem; max-width: 100%; height: auto; margin: 0.7rem 0; }
        .page-editor table { border-collapse: collapse; width: 100%; margin: 0.7rem 0; }
        .page-editor table td, .page-editor table th { border: 1px solid hsl(var(--border)); padding: 0.5rem; vertical-align: top; }
      `}</style>
    </div>
  );
}
