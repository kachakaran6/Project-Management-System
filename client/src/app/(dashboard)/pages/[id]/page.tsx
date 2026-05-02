
import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "@/lib/next-navigation";
import {
  AtSign,
  Bold,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  Globe,
  GripVertical,
  Highlighter,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Minus,
  MoreHorizontal,
  PanelRight,
  Pilcrow,
  Quote,
  Settings2,
  Smile,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  UserPlus,
  Users,
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  useExportPagePdfMutation,
  usePageQuery,
  useUpdatePageMutation,
} from "@/features/pages/hooks/use-pages-query";
import { PageVisibilityBadge } from "@/features/pages/components/page-visibility-badge";
import { PublishPageDialog } from "@/features/pages/components/publish-page-dialog";
import {
  getPagePublicPath,
  getPagePublicPreviewPath,
  toAbsolutePublicUrl,
} from "@/features/pages/utils/page-sharing";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { PageDoc, PageVisibility } from "@/types/page.types";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type SlashCommand = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
};

function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const editorRef = useRef<HTMLDivElement>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [visibility, setVisibility] = useState<PageVisibility>("WORKSPACE");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [shareOpen, setShareOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  const membersQuery = useOrganizationMembersQuery(activeOrg?.id || "");
  const members = membersQuery.data?.data.members || [];

  const page = pageQuery.data?.data;

  const creatorId = useMemo(() => {
    if (!page?.creatorId) return null;
    return (page.creatorId && typeof page.creatorId === "object") ? (page.creatorId as any)._id : page.creatorId;
  }, [page]);

  const canAdminOverride = role === "SUPER_ADMIN" || role === "ADMIN";
  const isCreator = String(creatorId) === String(user?.id);

  const isAllowed = useMemo(() => {
    if (!page || !user) return false;
    return (page.allowedUsers || []).some((id: string) => String(id) === user.id);
  }, [page, user]);

  const canView = useMemo(() => {
    if (!page) return false;
    if (canAdminOverride) return true;
    if (page.visibility === "PUBLIC" || page.visibility === "WORKSPACE") return true;
    return isCreator || isAllowed;
  }, [canAdminOverride, isCreator, isAllowed, page]);

  const canEdit = useMemo(() => {
    if (!page) return false;
    return isCreator;
  }, [isCreator, page]);

  const canDelete = useMemo(() => {
    if (!page) return false;
    return isCreator;
  }, [isCreator, page]);

  const baseline = useMemo(
    () => JSON.stringify({ title, content, visibility }),
    [content, title, visibility],
  );
  const lastSaved = useRef("");
  const hydratedPageId = useRef<string>("");

  const commitLocalSnapshot = (
    nextTitle: string,
    nextContent: string,
    nextVisibility: PageVisibility,
  ) => {
    lastSaved.current = JSON.stringify({
      title: nextTitle,
      content: nextContent,
      visibility: nextVisibility,
    });
  };

  const syncLocalPageState = (nextPage: PageDoc) => {
    const nextTitle = nextPage.title || "Untitled";
    const nextContent = nextPage.content || "<p></p>";
    const nextVisibility = nextPage.visibility;

    setTitle(nextTitle);
    setContent(nextContent);
    setVisibility(nextVisibility);
    commitLocalSnapshot(nextTitle, nextContent, nextVisibility);

    if (editor && editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  };

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
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing your document...",
      }),
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
          "min-h-[600px] w-full max-w-none bg-transparent px-4 md:px-0 py-4 text-[16px] md:text-[18px] leading-relaxed outline-none prose prose-slate dark:prose-invert",
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
  const readTime = useMemo(
    () => Math.max(1, Math.ceil(wordCount / 220)),
    [wordCount],
  );

  useEffect(() => {
    setHasHydrated(false);
  }, [pageId]);

  useEffect(() => {
    if (!page || hasHydrated) return;

    setTitle(page.title);
    setContent(page.content || "<p></p>");
    setVisibility(page.visibility);
    setHasHydrated(true);

    commitLocalSnapshot(page.title, page.content || "<p></p>", page.visibility);
    hydratedPageId.current = page.id;

    if (editor && editor.getHTML() !== (page.content || "<p></p>")) {
      editor.commands.setContent(page.content || "<p></p>");
    }
  }, [page, editor, hasHydrated]);

  const toggleUserAccess = async (userId: string) => {
    if (!page || !canEdit) return;
    
    const currentAllowed = page.allowedUsers || [];
    const isShared = currentAllowed.some(id => String(id) === userId);
    
    const newAllowed = isShared 
      ? currentAllowed.filter(id => String(id) !== userId)
      : [...currentAllowed, userId];

    try {
      await updatePage.mutateAsync({
        id: pageId,
        data: { allowedUsers: newAllowed }
      });
      toast.success(isShared ? "Access removed." : "Access granted.");
    } catch {
      toast.error("Failed to update access.");
    }
  };

  const copyPublicLink = async () => {
    if (!publicPageUrl) {
      toast.error("Publish the page first to generate its public link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicPageUrl);
      setCopiedPublicLink(true);
      toast.success("Public link copied.");
    } catch {
      toast.error("Failed to copy public link.");
    }
  };

  const updateVisibilityImmediately = async (nextVisibility: PageVisibility) => {
    if (!page || !canEdit) return;

    try {
      const updated = await updatePage.mutateAsync({
        id: pageId,
        data: { visibility: nextVisibility },
      });

      syncLocalPageState(updated.data);
      setSaveStatus("saved");
      toast.success(
        nextVisibility === "PUBLIC"
          ? "Page published."
          : nextVisibility === "WORKSPACE"
            ? "Page moved to workspace visibility."
            : "Page is now private.",
      );
    } catch {
      toast.error("Failed to update visibility.");
    }
  };

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!copiedPublicLink) return;

    const timer = window.setTimeout(() => setCopiedPublicLink(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedPublicLink]);

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
    if (!page || !editorRef.current) return;

    const toastId = toast.loading("Preparing professional PDF...");

    try {
      await document.fonts.ready;
      
      const renderRoot = document.createElement("div");
      renderRoot.id = "pdf-render-root";
      Object.assign(renderRoot.style, {
        position: "fixed",
        top: "-20000px",
        left: "-20000px",
        width: "794px",
        backgroundColor: "#ffffff",
        zIndex: "-10000",
        visibility: "visible",
      });
      document.body.appendChild(renderRoot);

      const clone = editorRef.current.cloneNode(true) as HTMLElement;
      
      const themeClasses = ["dark", "theme-dark", "bg-card", "bg-background", "text-foreground", "shadow-sm"];
      const allClonedElements = [clone, ...Array.from(clone.querySelectorAll("*"))];
      allClonedElements.forEach(el => {
        if (el instanceof HTMLElement) {
          themeClasses.forEach(tc => el.classList.remove(tc));
          el.style.backgroundColor = "transparent";
          el.style.color = "#1a1a1a";
        }
      });

      Object.assign(clone.style, {
        width: "794px",
        height: "auto",
        margin: "0",
        padding: "50px 60px",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontSize: "15px",
        lineHeight: "1.7",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        border: "none",
        boxShadow: "none",
      });

      clone.querySelectorAll("h1").forEach(h1 => {
        Object.assign(h1.style, {
          fontSize: "32px",
          fontWeight: "800",
          color: "#000000",
          marginBottom: "20px",
          letterSpacing: "-0.02em",
        });
      });
      
      clone.querySelectorAll("h2").forEach(h2 => {
        Object.assign(h2.style, {
          fontSize: "24px",
          fontWeight: "700",
          color: "#000000",
          marginTop: "32px",
          marginBottom: "12px",
        });
      });

      clone.querySelectorAll("p").forEach(p => {
        (p as HTMLElement).style.marginBottom = "14px";
      });

      clone.querySelectorAll("ul, ol").forEach(list => {
        Object.assign((list as HTMLElement).style, {
          paddingLeft: "24px",
          marginBottom: "16px",
        });
      });

      const titleInput = clone.querySelector("textarea");
      if (titleInput) {
        const titleH1 = document.createElement("h1");
        titleH1.textContent = title || "Untitled Document";
        Object.assign(titleH1.style, {
          fontSize: "34px",
          fontWeight: "800",
          color: "#000000",
          marginBottom: "30px",
          borderBottom: "1px solid #eaeaea",
          paddingBottom: "16px",
        });
        titleInput.replaceWith(titleH1);
      }

      const scrubbedSelectors = [
        "button", 
        "nav", 
        ".slash-menu", 
        ".border-b", 
        ".page-metadata", 
        "[role='toolbar']",
        ".ProseMirror-trailingBreak"
      ];
      scrubbedSelectors.forEach(s => {
        clone.querySelectorAll(s).forEach(el => el.remove());
      });

      renderRoot.appendChild(clone);

      const canvas = await html2canvas(renderRoot, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        imageTimeout: 15000,
      });

      document.body.removeChild(renderRoot);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, 'MEDIUM');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, 'MEDIUM');
        heightLeft -= pdfHeight;
      }

      pdf.save(`${title.replace(/\s+/g, "_") || "Page_Export"}.pdf`);
      toast.success("Professional PDF generated", { id: toastId });
    } catch (error) {
      toast.error("Export failed. Please check content for large images and try again.", { id: toastId });
    }
  };

  if (pageQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl animate-pulse px-4 md:px-0">
        <div className="h-10 w-48 bg-muted/50 rounded-lg mb-8" />
        <div className="h-16 w-3/4 bg-muted/50 rounded-xl mb-12" />
        <div className="space-y-4">
          <div className="h-4 w-full bg-muted/30 rounded" />
          <div className="h-4 w-full bg-muted/30 rounded" />
          <div className="h-4 w-2/3 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  if (pageQuery.isError && !page) {
    return (
      <div className="flex items-center justify-center h-[50vh] px-4">
        <Alert variant="warning" className="max-w-md">
          <AlertTitle>Page unavailable</AlertTitle>
          <AlertDescription>
            This page could not be loaded. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!page || !canView) {
    if (page && !canView) {
      return (
        <div className="flex items-center justify-center h-[50vh] px-4">
          <Alert variant="warning" className="max-w-md">
            <AlertTitle>Page unavailable</AlertTitle>
            <AlertDescription>
              This page is private or you do not have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-4xl animate-pulse px-4 md:px-0">
        <div className="h-10 w-48 bg-muted/50 rounded-lg mb-8" />
        <div className="h-16 w-3/4 bg-muted/50 rounded-xl mb-12" />
      </div>
    );
  }

  const ToolbarButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    isActive = false,
    disabled = false
  }: { 
    icon: any; 
    label: string; 
    onClick: () => void; 
    isActive?: boolean;
    disabled?: boolean;
  }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-md transition-colors",
              isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={onClick}
            disabled={disabled}
          >
            <Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] px-2 py-1">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 1. Floating Toolbar */}
      <div className="sticky top-2 md:top-6 z-40 flex justify-center pointer-events-none mb-6 md:mb-12 px-2">
        <div className="flex items-center gap-0.5 p-1 bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4 duration-500 max-w-full overflow-x-auto no-scrollbar">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Type className="size-3.5" />
                <span>Text</span>
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 p-1">
              <DropdownMenuItem className="text-xs py-2 gap-2" onClick={() => editor?.chain().focus().setParagraph().run()}>
                <Pilcrow className="size-3.5 text-muted-foreground" />
                Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs py-2 gap-2 font-bold" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
                <Heading1 className="size-3.5 text-muted-foreground" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs py-2 gap-2 font-semibold" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 className="size-3.5 text-muted-foreground" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs py-2 gap-2" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
                <Code2 className="size-3.5 text-muted-foreground" />
                Code Block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 mx-1.5" />

          <ToolbarButton 
            icon={Bold} 
            label="Bold" 
            onClick={() => editor?.chain().focus().toggleBold().run()} 
            isActive={editor?.isActive("bold")}
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={Italic} 
            label="Italic" 
            onClick={() => editor?.chain().focus().toggleItalic().run()} 
            isActive={editor?.isActive("italic")}
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={UnderlineIcon} 
            label="Underline" 
            onClick={() => editor?.chain().focus().toggleUnderline().run()} 
            isActive={editor?.isActive("underline")}
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={Strikethrough} 
            label="Strikethrough" 
            onClick={() => editor?.chain().focus().toggleStrike().run()} 
            isActive={editor?.isActive("strike")}
            disabled={!canEdit}
          />

          <Separator orientation="vertical" className="h-4 mx-1.5" />

          <ToolbarButton 
            icon={List} 
            label="Bullet List" 
            onClick={() => editor?.chain().focus().toggleBulletList().run()} 
            isActive={editor?.isActive("bulletList")}
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={ListOrdered} 
            label="Numbered List" 
            onClick={() => editor?.chain().focus().toggleOrderedList().run()} 
            isActive={editor?.isActive("orderedList")}
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={CheckSquare} 
            label="Checklist" 
            onClick={() => editor?.chain().focus().toggleTaskList().run()} 
            isActive={editor?.isActive("taskList")}
            disabled={!canEdit}
          />

          <Separator orientation="vertical" className="h-4 mx-1.5" />

          <ToolbarButton 
            icon={TableIcon} 
            label="Insert Table" 
            onClick={() => {}} 
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={ImageIcon} 
            label="Insert Image" 
            onClick={() => {}} 
            disabled={!canEdit}
          />
          <ToolbarButton 
            icon={Link2} 
            label="Insert Link" 
            onClick={() => editor?.chain().focus().setLink({ href: "https://" }).run()} 
            isActive={editor?.isActive("link")}
            disabled={!canEdit}
          />

          <Separator orientation="vertical" className="h-4 mx-1.5" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
               <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                 Document Actions
               </div>
                <DropdownMenuItem className="text-xs py-2 gap-2" onClick={handleExportPdf} disabled={exportPdf.isPending}>
                  <Download className="size-3.5" />
                  Export as PDF
                </DropdownMenuItem>
                
                {canEdit && (
                  <>
                    <DropdownMenuItem className="text-xs py-2 gap-2" onClick={handleDuplicate} disabled={createPage.isPending}>
                      <Copy className="size-3.5" />
                      Duplicate Page
                    </DropdownMenuItem>

                    {visibility !== "PUBLIC" ? (
                      <DropdownMenuItem className="text-xs py-2 gap-2" onClick={() => setPublishOpen(true)}>
                        <Globe className="size-3.5" />
                        Publish Page
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem className="text-xs py-2 gap-2" onClick={copyPublicLink}>
                          <Copy className="size-3.5" />
                          {copiedPublicLink ? "Copied" : "Copy Public Link"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs py-2 gap-2"
                          onClick={() => void updateVisibilityImmediately("WORKSPACE")}
                        >
                          <Users className="size-3.5" />
                          Unpublish
                        </DropdownMenuItem>
                      </>
                    )}

                    {visibility === "PRIVATE" ? (
                      <DropdownMenuItem className="text-xs py-2 gap-2" onClick={() => setShareOpen(true)}>
                        <UserPlus className="size-3.5" />
                        Manage Access
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs py-2 gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-3.5" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Main Content Workspace */}
      <div className="mx-auto w-full max-w-4xl pb-32 px-4 md:px-0">
        <div className="group/page relative flex flex-col pt-8">
          
          {/* Metadata/Status indicator */}
          <div className="absolute -left-12 top-10 flex flex-col items-center gap-3 opacity-0 group-hover/page:opacity-100 transition-opacity hidden lg:flex">
             {visibility === "PUBLIC" ? (
               <Globe className="size-4 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
             ) : visibility === "WORKSPACE" ? (
               <Users className="size-4 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
             ) : (
               <Lock className="size-4 text-muted-foreground/40 hover:text-primary transition-colors cursor-help" />
             )}
             <div className="h-8 w-px bg-border/40" />
             <span className="[writing-mode:vertical-lr] text-[10px] uppercase tracking-widest text-muted-foreground/30 font-medium rotate-180">
               {saveStatus === "saving" ? "Syncing..." : "Encrypted"}
             </span>
          </div>

          <button className="flex items-center gap-1.5 w-fit px-2 py-1 -ml-2 rounded-md hover:bg-muted/50 text-muted-foreground/60 transition-colors mb-6 group">
             <Smile className="size-4 group-hover:text-amber-400 transition-colors" />
             <span className="text-[13px] font-medium">Add icon</span>
          </button>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <PageVisibilityBadge visibility={visibility} />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
            </div>
            {visibility === "PUBLIC" && publicPageUrl ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={copyPublicLink}
              >
                <Copy className="mr-1.5 size-3.5" />
                {copiedPublicLink ? "Copied" : "Copy Public Link"}
              </Button>
            ) : null}
          </div>

          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={1}
            className="w-full resize-none border-0 bg-transparent px-0 text-3xl md:text-5xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-0 leading-tight mb-8"
            placeholder="Untitled"
            disabled={!canEdit}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />

          <div ref={editorRef} className="relative">
            {editor ? <EditorContent editor={editor} /> : (
              <div className="h-64 w-full bg-muted/10 rounded-xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Slash Menu */}
      {slashOpen && canEdit ? (
        <div
          className="fixed z-50 w-64 rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: slashPos.top,
            left: Math.max(16, slashPos.left - 20),
          }}
        >
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Basic Blocks
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {slashCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => insertSlashBlock(command.run)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/80 transition-colors group"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30 group-hover:bg-background transition-colors">
                  <command.icon className="size-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                <div>
                  <div className="font-medium">{command.label}</div>
                  <div className="text-[10px] text-muted-foreground/60">Professional formatting</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 4. Bottom Right Settings Action */}
      <div className="fixed bottom-6 right-6 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg border border-border/50 hover:scale-105 transition-transform">
              <Settings2 className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          {canEdit && (
            <DropdownMenuContent align="end" className="w-64 p-2">
              <div className="flex flex-col gap-1 p-2 mb-2 bg-muted/30 rounded-lg">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Storage Status</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Cloud Synchronized</span>
                  <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-1">
                <DropdownMenuItem
                  className="text-xs py-2 gap-2"
                  onClick={() => void updateVisibilityImmediately("PRIVATE")}
                  disabled={visibility === "PRIVATE"}
                >
                  <Lock className="size-3.5" />
                  <span>Private</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs py-2 gap-2"
                  onClick={() => void updateVisibilityImmediately("WORKSPACE")}
                  disabled={visibility === "WORKSPACE"}
                >
                  <Users className="size-3.5" />
                  <span>Workspace</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs py-2 gap-2"
                  onClick={() => (visibility === "PUBLIC" ? void updateVisibilityImmediately("WORKSPACE") : setPublishOpen(true))}
                >
                  <Globe className="size-3.5" />
                  <span>{visibility === "PUBLIC" ? "Disable Public Link" : "Publish Public"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs py-2 gap-2">
                  <PanelRight className="size-3.5" />
                  <span>Page Details</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Words: {wordCount}</span>
                    <span>Read: {readTime}m</span>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete documentation?</DialogTitle>
            <DialogDesc className="text-sm">
              This action is permanent and cannot be reversed. All version history for this page will be lost.
            </DialogDesc>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" className="text-xs" onClick={() => setDeleteOpen(false)}>
              Keep Page
            </Button>
            <Button
              variant="destructive"
              className="text-xs font-semibold"
              onClick={handleDelete}
              loading={deletePage.isPending}
            >
              Confirm Deletion
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
        onPublish={() => updateVisibilityImmediately("PUBLIC")}
        onCopy={copyPublicLink}
      />

      {/* Share/Access Management */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Manage Access
            </DialogTitle>
            <DialogDesc className="text-xs">
              Invite team members to view or collaborate on this private page.
            </DialogDesc>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4 max-h-[300px] overflow-y-auto px-1">
              {members.filter(m => m.id !== user?.id).map((member) => {
                const isShared = (page?.allowedUsers || []).some(id => String(id) === String(member.id));
                return (
                  <div key={member.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className="text-[10px] bg-muted font-bold">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.firstName} {member.lastName}</span>
                        <span className="text-[10px] text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={isShared ? "outline" : "secondary"} 
                      className="h-8 text-[11px] font-semibold"
                      onClick={() => toggleUserAccess(member.id)}
                      disabled={updatePage.isPending}
                    >
                      {isShared ? "Remove" : "Invite"}
                    </Button>
                  </div>
                );
              })}
              {members.length <= 1 && (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  No other team members found.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="text-xs" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
