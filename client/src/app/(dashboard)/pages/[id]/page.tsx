import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "@/lib/next-navigation";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Circle,
  Clock,
  Code,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileDown,
  FileImage,
  Globe,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Layout,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  Loader2,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  Quote,
  RefreshCw,
  Strikethrough,
  Table as TableIcon,
  Text,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
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
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { PageVisibilityBadge } from "@/features/pages/components/page-visibility-badge";
import { PublishPageDialog } from "@/features/pages/components/publish-page-dialog";
import { PageLinkedTasks } from "@/features/pages/components/page-linked-tasks";
import {
  useCreatePageMutation,
  useDeletePageMutation,
  usePageQuery,
  useUpdatePageMutation,
  useExportPagePdfMutation,
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
import { CalloutExtension, CALLOUT_CONFIGS, type CalloutType } from "@/features/pages/editor/callout-extension";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { useTasksQuery } from "@/features/tasks/hooks/use-tasks-query";
import { PageDoc, PageVisibility } from "@/types/page.types";
import { API_URL } from "@/lib/api/axios-instance";
import { cn } from "@/lib/utils";

// Import professional editor styles
import "@/features/pages/editor/editor.css";

const lowlight = createLowlight(all);

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SlashCommand {
  id: string;
  title: string;
  hint: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string[];
  run: () => void;
}

interface OutlineItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function toInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase() || "U";
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

function estimateReadingTime(wordCount: number): string {
  const wpm = 200;
  const minutes = Math.ceil(wordCount / wpm);
  if (minutes < 1) return "< 1 min read";
  if (minutes === 1) return "1 min read";
  return `${minutes} min read`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractOutline(doc: JSONContent): OutlineItem[] {
  const items: OutlineItem[] = [];
  const content = Array.isArray(doc?.content) ? doc.content : [];

  content.forEach((node, idx) => {
    if (node.type === "heading") {
      const level = node.attrs?.level as 1 | 2 | 3 | 4;
      if (level >= 1 && level <= 4) {
        const text = (node.content || [])
          .filter((n: any) => n.type === "text")
          .map((n: any) => n.text)
          .join("");
        if (text) {
          items.push({
            id: `heading-${idx}-${slugify(text)}`,
            text,
            level,
          });
        }
      }
    }
  });

  return items;
}

// Text color presets (kept for future use when TextStyle/Color are compatible)
// const TEXT_COLORS = [...];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarBtn({ icon, label, shortcut, isActive, disabled, onClick }: ToolbarBtnProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn("toolbar-btn", isActive && "is-active")}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={isActive}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <span>{label}</span>
          {shortcut && <span className="ml-1.5 opacity-60">{shortcut}</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Save Indicator
// ─────────────────────────────────────────────────────────────
function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-all",
        state === "saving" && "text-amber-500",
        state === "saved" && "text-emerald-500",
        state === "error" && "text-red-500",
        state === "dirty" && "text-muted-foreground"
      )}
    >
      {state === "saving" && <Loader2 className="size-3 animate-spin" />}
      {state === "saved" && <Check className="size-3" />}
      {state === "error" && <AlertCircle className="size-3" />}
      {state === "dirty" && <Circle className="size-3 fill-current opacity-50" />}
      <span>
        {state === "saving" ? "Saving..." : state === "saved" ? "Saved" : state === "error" ? "Failed" : "Unsaved"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Slash Command Palette
// ─────────────────────────────────────────────────────────────
interface SlashPaletteProps {
  commands: SlashCommand[];
  position: { top: number; left: number };
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

function SlashPalette({ commands, position, query, onQueryChange, onSelect, onClose }: SlashPaletteProps) {
  const [highlighted, setHighlighted] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.hint.toLowerCase().includes(q) ||
        cmd.keywords?.some((kw) => kw.includes(q))
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, SlashCommand[]>();
    filtered.forEach((cmd) => {
      const g = groups.get(cmd.group) || [];
      g.push(cmd);
      groups.set(cmd.group, g);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const flatFiltered = filtered;

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatFiltered[highlighted]) {
        onSelect(flatFiltered[highlighted]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  let flatIdx = 0;

  return (
    <div
      className="slash-palette"
      style={{
        top: Math.min(position.top, window.innerHeight - 400),
        left: Math.max(16, Math.min(position.left, window.innerWidth - 320)),
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="slash-palette-search">
        <Hash className="size-3.5 text-muted-foreground/50 flex-shrink-0" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search commands..."
          className="slash-palette-search input"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'hsl(var(--foreground))', fontFamily: 'inherit' }}
        />
        <kbd className="slash-palette-kbd">Esc</kbd>
      </div>

      <div ref={listRef} className="slash-palette-list custom-scrollbar">
        {grouped.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">No commands found</div>
        )}
        {grouped.map(([group, cmds]) => (
          <div key={group}>
            <div className="slash-palette-group-label">{group}</div>
            {cmds.map((cmd) => {
              const isHighlighted = flatFiltered[highlighted]?.id === cmd.id;
              const currentIdx = flatIdx++;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  className={cn("slash-palette-item", isHighlighted && "is-highlighted")}
                  onClick={() => onSelect(cmd)}
                  onMouseEnter={() => setHighlighted(flatFiltered.findIndex((c) => c.id === cmd.id))}
                >
                  <div className="slash-palette-item-icon">{cmd.icon}</div>
                  <div className="slash-palette-item-text">
                    <div className="slash-palette-item-title">{cmd.title}</div>
                    <div className="slash-palette-item-hint">{cmd.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Table Toolbar
// ─────────────────────────────────────────────────────────────
function TableToolbar({ editor }: { editor: any }) {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="table-toolbar mt-2">
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Plus className="size-3" /> Row ↓
      </button>
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().addRowBefore().run()}>
        <Plus className="size-3" /> Row ↑
      </button>
      <button className="table-toolbar-btn destructive" onClick={() => editor.chain().focus().deleteRow().run()}>
        <Minus className="size-3" /> Row
      </button>
      <div className="w-px h-5 bg-border/50 mx-1" />
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Plus className="size-3" /> Col →
      </button>
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().addColumnBefore().run()}>
        <Plus className="size-3" /> Col ←
      </button>
      <button className="table-toolbar-btn destructive" onClick={() => editor.chain().focus().deleteColumn().run()}>
        <Minus className="size-3" /> Col
      </button>
      <div className="w-px h-5 bg-border/50 mx-1" />
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().mergeCells().run()}>
        Merge
      </button>
      <button className="table-toolbar-btn" onClick={() => editor.chain().focus().splitCell().run()}>
        Split
      </button>
      <div className="w-px h-5 bg-border/50 mx-1" />
      <button className="table-toolbar-btn destructive" onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className="size-3" /> Table
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Document Outline
// ─────────────────────────────────────────────────────────────
function DocumentOutline({
  items,
  activeId,
}: {
  items: OutlineItem[];
  activeId?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center">
        <Hash className="size-5 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/50">No headings yet.</p>
        <p className="text-[11px] text-muted-foreground/35 mt-1">Add H1–H3 to see an outline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn("outline-item", `level-${item.level}`, item.id === activeId && "is-active")}
          onClick={() => {
            const el = document.getElementById(item.id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          title={item.text}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export Modal
// ─────────────────────────────────────────────────────────────
function ExportModal({
  open,
  onClose,
  pageTitle,
  pageId,
  getMarkdown,
  getHtml,
  getPlainText,
}: {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  pageId: string;
  getMarkdown: () => string;
  getHtml: () => string;
  getPlainText: () => string;
}) {
  const exportPdf = useExportPagePdfMutation();
  const [exporting, setExporting] = useState<string | null>(null);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: string) => {
    setExporting(type);
    const safeName = pageTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    try {
      if (type === "markdown") {
        downloadFile(getMarkdown(), `${safeName}.md`, "text/markdown;charset=utf-8");
        toast.success("Exported as Markdown");
      } else if (type === "html") {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.7; }
    h1, h2, h3 { font-weight: 700; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { background: #f1f5f9; padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.875em; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; }
    th { background: #f8fafc; font-weight: 600; }
    blockquote { border-left: 3px solid #6366f1; padding: 0.75em 1em; background: #f8fafc; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>${pageTitle}</h1>
  ${getHtml()}
</body>
</html>`;
        downloadFile(html, `${safeName}.html`, "text/html;charset=utf-8");
        toast.success("Exported as HTML");
      } else if (type === "text") {
        downloadFile(getPlainText(), `${safeName}.txt`, "text/plain;charset=utf-8");
        toast.success("Exported as plain text");
      } else if (type === "pdf") {
        // Use backend PDF export via authenticated mutation
        const blob = await exportPdf.mutateAsync(pageId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Exported as PDF");
      }
      onClose();
    } catch (err) {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-5 text-primary" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Download "{pageTitle}" in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {[
            { type: "markdown", label: "Markdown", desc: ".md file — great for GitHub, documentation sites", icon: "📝" },
            { type: "html", label: "HTML", desc: ".html file — full web page with embedded styles", icon: "🌐" },
            { type: "text", label: "Plain Text", desc: ".txt file — no formatting", icon: "📄" },
            { type: "pdf", label: "PDF", desc: ".pdf file — print-ready document", icon: "📑" },
          ].map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleExport(opt.type)}
              disabled={exporting !== null}
              className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-3.5 text-left hover:bg-muted/30 hover:border-border transition-all disabled:opacity-50"
            >
              <span className="text-2xl flex-shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
              </div>
              {exporting === opt.type ? (
                <Loader2 className="size-4 animate-spin text-primary flex-shrink-0" />
              ) : (
                <Download className="size-4 text-muted-foreground/50 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// TipTap JSON → Markdown converter
// ─────────────────────────────────────────────────────────────
function tiptapToMarkdown(doc: JSONContent): string {
  const lines: string[] = [];

  function processNode(node: JSONContent, indent = 0): string {
    if (!node) return "";

    switch (node.type) {
      case "doc":
        return (node.content || []).map((n) => processNode(n)).join("\n\n");

      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level);
        const text = (node.content || []).map(processInline).join("");
        return `${prefix} ${text}`;
      }

      case "paragraph": {
        const text = (node.content || []).map(processInline).join("");
        return text || "";
      }

      case "bulletList": {
        return (node.content || [])
          .map((item) => `- ${processListItem(item)}`)
          .join("\n");
      }

      case "orderedList": {
        return (node.content || [])
          .map((item, i) => `${i + 1}. ${processListItem(item)}`)
          .join("\n");
      }

      case "taskList": {
        return (node.content || [])
          .map((item) => {
            const checked = item.attrs?.checked ? "[x]" : "[ ]";
            return `- ${checked} ${processListItem(item)}`;
          })
          .join("\n");
      }

      case "blockquote": {
        const inner = (node.content || []).map((n) => processNode(n)).join("\n");
        return inner
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
      }

      case "codeBlock": {
        const lang = node.attrs?.language || "";
        const code = (node.content || []).map((n) => n.text || "").join("");
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }

      case "horizontalRule":
        return "---";

      case "table": {
        const rows = node.content || [];
        if (!rows.length) return "";

        const headerRow = rows[0];
        const bodyRows = rows.slice(1);

        const headerCells = (headerRow.content || []).map((cell) =>
          (cell.content || []).map((n) => processNode(n)).join(" ").replace(/\n/g, " ")
        );

        const separator = headerCells.map(() => "---");
        const bodyLines = bodyRows.map((row) =>
          (row.content || [])
            .map((cell) =>
              (cell.content || []).map((n) => processNode(n)).join(" ").replace(/\n/g, " ")
            )
            .join(" | ")
        );

        return [
          `| ${headerCells.join(" | ")} |`,
          `| ${separator.join(" | ")} |`,
          ...bodyLines.map((l) => `| ${l} |`),
        ].join("\n");
      }

      case "callout": {
        const calloutType = node.attrs?.type || "info";
        const icon = CALLOUT_CONFIGS[calloutType as CalloutType]?.icon || "ℹ️";
        const inner = (node.content || []).map((n) => processNode(n)).join("\n");
        return `> ${icon} **${calloutType.toUpperCase()}**\n>\n${inner.split("\n").map((l) => `> ${l}`).join("\n")}`;
      }

      default:
        return (node.content || []).map((n) => processNode(n)).join("\n");
    }
  }

  function processListItem(item: JSONContent): string {
    return (item.content || []).map((n) => processNode(n)).join(" ");
  }

  function processInline(node: JSONContent): string {
    if (!node) return "";

    if (node.type === "text") {
      let text = node.text || "";
      const marks = node.marks || [];

      marks.forEach((mark: any) => {
        if (mark.type === "bold") text = `**${text}**`;
        else if (mark.type === "italic") text = `_${text}_`;
        else if (mark.type === "strike") text = `~~${text}~~`;
        else if (mark.type === "code") text = `\`${text}\``;
        else if (mark.type === "underline") text = `<u>${text}</u>`;
        else if (mark.type === "link") text = `[${text}](${mark.attrs?.href || "#"})`;
      });

      return text;
    }

    if (node.type === "hardBreak") return "\n";

    return (node.content || []).map(processInline).join("");
  }

  return processNode(doc);
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
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

  // Editor State
  const [title, setTitle] = useState("Untitled");
  const [visibility, setVisibility] = useState<PageVisibility>("WORKSPACE");
  const [icon, setIcon] = useState("📄");
  const [coverUrl, setCoverUrl] = useState("");
  const [templateId, setTemplateId] = useState<PageTemplateId>("empty");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveStateRef = useRef<SaveState>("idle");

  // UI State
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"outline" | "details" | "tasks">("outline");
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshot = useRef("");
  const hydratedPageId = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const unmountDataRef = useRef({ pageId: "", title: "", visibility: "", content: "", isDirty: false });

  const page = pageQuery.data?.data;
  const canView = page ? canViewPage(page, currentUserId, currentRole) : false;
  const canEdit = Boolean(page && page.creatorId === currentUserId);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  // ── Public URL helpers ───────────────────────────────────────
  const publicPreviewPath =
    toAbsolutePublicUrl(
      getPagePublicPreviewPath({
        title,
        publicId: page?.publicId ?? null,
        publicSlug: page?.publicSlug ?? null,
        publicUrl: page?.publicUrl ?? null,
      })
    ) ||
    getPagePublicPreviewPath({
      title,
      publicId: page?.publicId ?? null,
      publicSlug: page?.publicSlug ?? null,
      publicUrl: page?.publicUrl ?? null,
    });

  const publicPageUrl = toAbsolutePublicUrl(getPagePublicPath(page || null));

  // ── Editor Setup ─────────────────────────────────────────────
  const editor = useEditor({
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return "Type '/' for commands, or start writing...";
        },
        showOnlyWhenEditable: true,
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
          class: "mention",
          "data-type": "mention",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({ allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      CharacterCount,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      CalloutExtension,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "page-editor ProseMirror min-h-[520px] w-full focus:outline-none px-2 py-4",
      },
      handleKeyDown: (view, event) => {
        if (!canEdit) return false;

        if (event.key === "/") {
          // Only open slash menu when at start of empty line or paragraph
          const { state } = view;
          const { $from } = state.selection;
          const coords = view.coordsAtPos($from.pos);
          setSlashPos({ left: coords.left, top: coords.bottom + 8 });
          setSlashQuery("");
          setSlashOpen(true);
          return false;
        }

        if (event.key === "Escape" && slashOpen) {
          setSlashOpen(false);
          return true;
        }

        // Ctrl+S manual save
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!canEdit) return;
      setSaveState("dirty");

      // Update outline
      const doc = ed.getJSON();
      setOutline(extractOutline(doc));
    },
    immediatelyRender: false,
  });

  // ── Hydrate content ──────────────────────────────────────────
  const applyHydratedContent = useCallback(
    (nextPage: PageDoc) => {
      const parsed = parsePageContent(nextPage.content);
      const nextTitle = nextPage.title || "Untitled";

      setTitle(nextTitle);
      setVisibility(nextPage.visibility);
      setIcon(parsed.meta.icon || "📄");
      setCoverUrl(parsed.meta.coverUrl || "");
      setTemplateId((parsed.meta.templateId as PageTemplateId) || "empty");

      if (editor) {
        if (parsed.isStructured) {
          editor.commands.setContent(parsed.doc, { emitUpdate: false });
        } else {
          editor.commands.setContent(parsed.html, { emitUpdate: false });
        }
        setOutline(extractOutline(editor.getJSON()));
      }

      const html = parsed.html;
      const doc = parsed.isStructured
        ? parsed.doc
        : editor?.getJSON() || { type: "doc", content: [{ type: "paragraph" }] };

      const snapshot = JSON.stringify({
        title: nextTitle,
        visibility: nextPage.visibility,
        content: createSerializedPageContent({
          html,
          doc,
          meta: {
            icon: parsed.meta.icon || "📄",
            coverUrl: parsed.meta.coverUrl || "",
            templateId: (parsed.meta.templateId as PageTemplateId) || "empty",
          },
        }),
      });

      lastSavedSnapshot.current = snapshot;
      setSaveState("saved");
      hydratedPageId.current = nextPage.id;
    },
    [editor]
  );

  useEffect(() => {
    if (!page || !editor) return;
    if (hydratedPageId.current === page.id) return;
    applyHydratedContent(page);
  }, [editor, page, applyHydratedContent]);

  // ── Cleanup + keepalive ──────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unmountDataRef.current.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);

      const { pageId: pid, title: t, visibility: v, content: c, isDirty } = unmountDataRef.current;
      if (isDirty && pid) {
        fetch(`${API_URL}/pages/${pid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t.trim() || "Untitled", visibility: v, content: c }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, []);

  const serializedContent = useMemo(() => {
    if (!editor) return "";
    return createSerializedPageContent({
      html: editor.getHTML(),
      doc: editor.getJSON(),
      meta: { icon, coverUrl, templateId },
    });
  }, [coverUrl, editor, icon, templateId]);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ title, visibility, content: serializedContent }),
    [serializedContent, title, visibility]
  );

  useEffect(() => {
    unmountDataRef.current = {
      pageId: page?.id || "",
      title,
      visibility,
      content: serializedContent,
      isDirty: saveState === "dirty" || saveState === "saving",
    };
  }, [page?.id, title, visibility, serializedContent, saveState]);

  // ── Sync Editable State ──────────────────────────────────────
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  // ── Autosave ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canEdit || !editor || !page) return;
    if (!serializedContent) return;

    if (currentSnapshot === lastSavedSnapshot.current) {
      if (saveStateRef.current !== "saved") setSaveState("saved");
      return;
    }

    setSaveState("dirty");

    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);

    autosaveTimer.current = window.setTimeout(async () => {
      try {
        setSaveState("saving");

        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        await updatePage.mutateAsync({
          id: page.id,
          data: {
            title: title.trim() || "Untitled",
            visibility,
            content: serializedContent,
          },
          config: { signal: abortControllerRef.current.signal },
        });

        lastSavedSnapshot.current = JSON.stringify({
          title: title.trim() || "Untitled",
          visibility,
          content: serializedContent,
        });
        setSaveState("saved");
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setSaveState("error");
      }
    }, 800);
  }, [canEdit, currentSnapshot, editor, page, serializedContent, title, updatePage, visibility]);

  // ── Copied link timer ────────────────────────────────────────
  useEffect(() => {
    if (!copiedPublicLink) return;
    const timer = window.setTimeout(() => setCopiedPublicLink(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedPublicLink]);

  // ── Editor Actions ───────────────────────────────────────────
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
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const applyTemplate = (nextTemplate: PageTemplateId) => {
    if (!editor || !canEdit) return;
    const templateDoc = getTemplateDocument(nextTemplate);
    editor.commands.setContent(templateDoc, { emitUpdate: true });
    setTemplateId(nextTemplate);
    toast.success("Template applied.");
  };

  // ── Slash Commands ───────────────────────────────────────────
  const slashCommands: SlashCommand[] = useMemo(
    () => [
      // Text
      {
        id: "text",
        title: "Text",
        hint: "Plain paragraph block",
        group: "Basic",
        keywords: ["paragraph", "plain"],
        icon: <Type className="size-3.5" />,
        run: () => editor?.chain().focus().setParagraph().run(),
      },
      {
        id: "h1",
        title: "Heading 1",
        hint: "Large section title",
        group: "Basic",
        keywords: ["heading", "title", "h1"],
        icon: <Heading1 className="size-3.5" />,
        run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "h2",
        title: "Heading 2",
        hint: "Medium section title",
        group: "Basic",
        keywords: ["heading", "subtitle", "h2"],
        icon: <Heading2 className="size-3.5" />,
        run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "h3",
        title: "Heading 3",
        hint: "Small section title",
        group: "Basic",
        keywords: ["heading", "h3"],
        icon: <Heading3 className="size-3.5" />,
        run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: "h4",
        title: "Heading 4",
        hint: "Sub-section title",
        group: "Basic",
        keywords: ["heading", "h4"],
        icon: <Heading4 className="size-3.5" />,
        run: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
      },
      // Lists
      {
        id: "bullet",
        title: "Bullet List",
        hint: "Unordered list of items",
        group: "Lists",
        keywords: ["ul", "unordered", "list"],
        icon: <List className="size-3.5" />,
        run: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        id: "numbered",
        title: "Numbered List",
        hint: "Ordered numbered list",
        group: "Lists",
        keywords: ["ol", "ordered", "numbered"],
        icon: <ListOrdered className="size-3.5" />,
        run: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        id: "checklist",
        title: "Checklist",
        hint: "Actionable checkable items",
        group: "Lists",
        keywords: ["todo", "task", "check", "checkbox"],
        icon: <ListChecks className="size-3.5" />,
        run: () => editor?.chain().focus().toggleTaskList().run(),
      },
      // Content Blocks
      {
        id: "quote",
        title: "Quote",
        hint: "Block quote or citation",
        group: "Blocks",
        keywords: ["blockquote", "citation"],
        icon: <Quote className="size-3.5" />,
        run: () => editor?.chain().focus().toggleBlockquote().run(),
      },
      {
        id: "callout-info",
        title: "Info Callout",
        hint: "Blue info/note block",
        group: "Blocks",
        keywords: ["callout", "note", "info", "alert"],
        icon: <span className="text-blue-500 font-bold text-xs">ℹ️</span>,
        run: () => editor?.commands.insertCallout("info"),
      },
      {
        id: "callout-warning",
        title: "Warning Callout",
        hint: "Amber warning block",
        group: "Blocks",
        keywords: ["callout", "warning", "caution", "alert"],
        icon: <span className="text-amber-500 font-bold text-xs">⚠️</span>,
        run: () => editor?.commands.insertCallout("warning"),
      },
      {
        id: "callout-success",
        title: "Success Callout",
        hint: "Green success block",
        group: "Blocks",
        keywords: ["callout", "success", "tip"],
        icon: <span className="text-green-500 font-bold text-xs">✅</span>,
        run: () => editor?.commands.insertCallout("success"),
      },
      {
        id: "callout-error",
        title: "Error Callout",
        hint: "Red error/danger block",
        group: "Blocks",
        keywords: ["callout", "error", "danger", "critical"],
        icon: <span className="text-red-500 font-bold text-xs">❌</span>,
        run: () => editor?.commands.insertCallout("error"),
      },
      {
        id: "callout-note",
        title: "Note Callout",
        hint: "Purple note block",
        group: "Blocks",
        keywords: ["callout", "note", "memo"],
        icon: <span className="text-purple-500 font-bold text-xs">📝</span>,
        run: () => editor?.commands.insertCallout("note"),
      },
      {
        id: "divider",
        title: "Divider",
        hint: "Horizontal separator line",
        group: "Blocks",
        keywords: ["hr", "rule", "separator", "line"],
        icon: <Minus className="size-3.5" />,
        run: () => editor?.chain().focus().setHorizontalRule().run(),
      },
      // Code
      {
        id: "code",
        title: "Code Block",
        hint: "Multi-line code with syntax highlighting",
        group: "Code",
        keywords: ["code", "snippet", "block", "pre"],
        icon: <Code2 className="size-3.5" />,
        run: () => editor?.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: "inline-code",
        title: "Inline Code",
        hint: "Format text as code",
        group: "Code",
        keywords: ["code", "inline", "mono"],
        icon: <Code className="size-3.5" />,
        run: () => editor?.chain().focus().toggleCode().run(),
      },
      // Media
      {
        id: "image",
        title: "Image",
        hint: "Insert image from URL",
        group: "Media",
        keywords: ["img", "photo", "picture"],
        icon: <FileImage className="size-3.5" />,
        run: insertImage,
      },
      // Table
      {
        id: "table",
        title: "Table",
        hint: "Insert a 3×3 editable table",
        group: "Advanced",
        keywords: ["table", "grid", "spreadsheet"],
        icon: <TableIcon className="size-3.5" />,
        run: insertTable,
      },
    ],
    [editor]
  );

  // ── Page Actions ─────────────────────────────────────────────
  const toggleUserAccess = async (userId: string) => {
    if (!page || !canEdit) return;
    const currentAllowed = page.allowedUsers || [];
    const isShared = currentAllowed.some((id) => String(id) === userId);
    const nextAllowed = isShared
      ? currentAllowed.filter((id) => String(id) !== userId)
      : [...currentAllowed, userId];

    try {
      await updatePage.mutateAsync({ id: page.id, data: { allowedUsers: nextAllowed } });
      toast.success(isShared ? "Access removed." : "Access granted.");
    } catch {
      toast.error("Failed to update access.");
    }
  };

  const updateVisibility = async (nextVisibility: PageVisibility) => {
    if (!page || !canEdit) return;
    try {
      const updated = await updatePage.mutateAsync({ id: page.id, data: { visibility: nextVisibility } });
      setVisibility(updated.data.visibility);
      toast.success(
        nextVisibility === "PUBLIC"
          ? "Page published."
          : nextVisibility === "PRIVATE"
          ? "Page is now private."
          : "Page is now workspace-visible."
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

  // ── Stats ────────────────────────────────────────────────────
  const wordCount = useMemo(() => {
    const plainText = extractPagePlainText(serializedContent);
    if (!plainText) return 0;
    return plainText.split(/\s+/).filter(Boolean).length;
  }, [serializedContent]);

  const characterCount = editor?.storage.characterCount.characters() || 0;
  const readingTime = estimateReadingTime(wordCount);

  // ── Export helpers ───────────────────────────────────────────
  const getMarkdown = useCallback(() => {
    if (!editor) return "";
    return tiptapToMarkdown(editor.getJSON());
  }, [editor]);

  const getHtml = useCallback(() => {
    if (!editor) return "";
    return editor.getHTML();
  }, [editor]);

  const getPlainText = useCallback(() => {
    if (!editor) return "";
    return extractPagePlainText(serializedContent);
  }, [editor, serializedContent]);

  // ── Heading selector helper ──────────────────────────────────
  const currentHeadingLevel = (() => {
    if (!editor) return "paragraph";
    for (let l = 1; l <= 6; l++) {
      if (editor.isActive("heading", { level: l })) return `h${l}`;
    }
    return "paragraph";
  })();

  // ── Loading / Error States ───────────────────────────────────
  if (pageQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted/25" />
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

  if (!page) return null;

  // ── Render ───────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-background pb-20">

        {/* ── STICKY TOOLBAR ─────────────────────────────────── */}
        <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-screen-xl px-4">
            <div className="flex items-center gap-1 py-1.5 overflow-x-auto">

              {/* Heading Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!canEdit}
                    className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    <span className="min-w-[70px]">
                      {currentHeadingLevel === "paragraph"
                        ? "Normal text"
                        : currentHeadingLevel === "h1"
                        ? "Heading 1"
                        : currentHeadingLevel === "h2"
                        ? "Heading 2"
                        : currentHeadingLevel === "h3"
                        ? "Heading 3"
                        : currentHeadingLevel === "h4"
                        ? "Heading 4"
                        : currentHeadingLevel === "h5"
                        ? "Heading 5"
                        : "Heading 6"}
                    </span>
                    <ChevronDown className="size-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuItem
                    onClick={() => editor?.chain().focus().setParagraph().run()}
                    className={cn("text-sm", currentHeadingLevel === "paragraph" && "font-semibold text-primary")}
                  >
                    <span className="mr-2 w-4 text-center">¶</span> Normal text
                  </DropdownMenuItem>
                  {([1, 2, 3, 4] as const).map((l) => (
                    <DropdownMenuItem
                      key={l}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: l }).run()}
                      className={cn(
                        "text-sm",
                        currentHeadingLevel === `h${l}` && "font-semibold text-primary"
                      )}
                    >
                      <span className="mr-2 w-4 text-center text-muted-foreground font-mono text-xs">H{l}</span>
                      Heading {l}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Text Formatting */}
              <ToolbarBtn
                icon={<Bold className="size-3.5" />}
                label="Bold"
                shortcut="Ctrl+B"
                isActive={editor?.isActive("bold")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              />
              <ToolbarBtn
                icon={<Italic className="size-3.5" />}
                label="Italic"
                shortcut="Ctrl+I"
                isActive={editor?.isActive("italic")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              />
              <ToolbarBtn
                icon={<UnderlineIcon className="size-3.5" />}
                label="Underline"
                shortcut="Ctrl+U"
                isActive={editor?.isActive("underline")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              />
              <ToolbarBtn
                icon={<Strikethrough className="size-3.5" />}
                label="Strikethrough"
                isActive={editor?.isActive("strike")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              />
              <ToolbarBtn
                icon={<Hash className="size-3 font-bold" />}
                label="Highlight"
                isActive={editor?.isActive("highlight")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleHighlight().run()}
              />
              <ToolbarBtn
                icon={<Code className="size-3.5" />}
                label="Inline code"
                shortcut="Ctrl+E"
                isActive={editor?.isActive("code")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleCode().run()}
              />

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Superscript / Subscript */}
              <ToolbarBtn
                icon={<span className="text-xs font-bold leading-none">A<sup className="text-[8px]">↑</sup></span>}
                label="Superscript"
                isActive={editor?.isActive("superscript")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleSuperscript().run()}
              />
              <ToolbarBtn
                icon={<span className="text-xs font-bold leading-none">A<sub className="text-[8px]">↓</sub></span>}
                label="Subscript"
                isActive={editor?.isActive("subscript")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleSubscript().run()}
              />

              <Separator orientation="vertical" className="mx-1 h-5" />

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Lists */}
              <ToolbarBtn
                icon={<List className="size-3.5" />}
                label="Bullet list"
                isActive={editor?.isActive("bulletList")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              />
              <ToolbarBtn
                icon={<ListOrdered className="size-3.5" />}
                label="Numbered list"
                isActive={editor?.isActive("orderedList")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              />
              <ToolbarBtn
                icon={<ListChecks className="size-3.5" />}
                label="Checklist"
                isActive={editor?.isActive("taskList")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
              />

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Alignment */}
              <ToolbarBtn
                icon={<AlignLeft className="size-3.5" />}
                label="Align left"
                isActive={editor?.isActive({ textAlign: "left" })}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              />
              <ToolbarBtn
                icon={<AlignCenter className="size-3.5" />}
                label="Align center"
                isActive={editor?.isActive({ textAlign: "center" })}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              />
              <ToolbarBtn
                icon={<AlignRight className="size-3.5" />}
                label="Align right"
                isActive={editor?.isActive({ textAlign: "right" })}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              />

              <Separator orientation="vertical" className="mx-1 h-5" />

              {/* Blocks */}
              <ToolbarBtn
                icon={<Quote className="size-3.5" />}
                label="Blockquote"
                isActive={editor?.isActive("blockquote")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              />
              <ToolbarBtn
                icon={<Code2 className="size-3.5" />}
                label="Code block"
                isActive={editor?.isActive("codeBlock")}
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              />
              <ToolbarBtn
                icon={<TableIcon className="size-3.5" />}
                label="Insert table"
                disabled={!canEdit}
                onClick={insertTable}
              />
              <ToolbarBtn
                icon={<FileImage className="size-3.5" />}
                label="Insert image"
                disabled={!canEdit}
                onClick={insertImage}
              />
              <ToolbarBtn
                icon={<Link2 className="size-3.5" />}
                label="Insert link"
                shortcut="Ctrl+K"
                isActive={editor?.isActive("link")}
                disabled={!canEdit}
                onClick={insertLink}
              />
              <ToolbarBtn
                icon={<Minus className="size-3.5" />}
                label="Divider"
                disabled={!canEdit}
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              />

              {/* Callout Picker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!canEdit}
                    className="toolbar-btn"
                    title="Insert callout"
                    aria-label="Insert callout"
                  >
                    <Zap className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Callout type
                  </div>
                  <DropdownMenuSeparator />
                  {(Object.entries(CALLOUT_CONFIGS) as [CalloutType, { icon: string; label: string }][]).map(
                    ([type, cfg]) => (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => editor?.commands.insertCallout(type)}
                        className="gap-2"
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Template selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={!canEdit}
                    className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    <Layout className="size-3 mr-1" />
                    Template
                    <ChevronDown className="size-3 ml-0.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {PAGE_TEMPLATES.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => applyTemplate(t.id as PageTemplateId)}>
                      <div>
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Right side: Save + Actions */}
              <div className="ml-auto flex items-center gap-2 pl-2 flex-shrink-0">
                <SaveIndicator state={saveState} />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setExportOpen(true)}
                >
                  <FileDown className="size-3.5" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPublishOpen(true)}
                >
                  Share
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={duplicatePage} disabled={!canEdit || createPage.isPending}>
                      <Copy className="mr-2 size-3.5" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={copyPublicLink}>
                      <Link2 className="mr-2 size-3.5" />
                      {copiedPublicLink ? "Copied!" : "Copy public link"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShareOpen(true)} disabled={!canEdit}>
                      <Users className="mr-2 size-3.5" /> Manage access
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={!canEdit}
                    >
                      <Trash2 className="mr-2 size-3.5" /> Delete page
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN LAYOUT ────────────────────────────────────── */}
        <div className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-6 px-4 pt-8 lg:grid-cols-[1fr_280px]">

          {/* ── EDITOR AREA ────────────────────────────────── */}
          <main className="mx-auto w-full max-w-3xl min-w-0">

            {/* Cover */}
            {coverUrl && (
              <div className="mb-6 h-48 overflow-hidden rounded-xl border border-border/30">
                <img src={coverUrl} alt="Page cover" className="h-full w-full object-cover" />
              </div>
            )}

            {/* Page header controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-card text-xl hover:bg-muted transition-colors"
                onClick={() => {
                  if (!canEdit) return;
                  const nextIcon = safePrompt("Set page icon (emoji)");
                  if (nextIcon) setIcon(nextIcon);
                }}
                disabled={!canEdit}
                title="Change icon"
              >
                {icon || "📄"}
              </button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  if (!canEdit) return;
                  const url = safePrompt("Paste cover image URL");
                  if (url) setCoverUrl(url);
                }}
                disabled={!canEdit}
              >
                <FileImage className="mr-1.5 size-3.5" />
                {coverUrl ? "Change cover" : "Add cover"}
              </Button>

              {coverUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={() => setCoverUrl("")}
                  disabled={!canEdit}
                >
                  <X className="mr-1.5 size-3.5" /> Remove cover
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <PageVisibilityBadge visibility={visibility} />
              </div>
            </div>

            {/* Title */}
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled"
              disabled={!canEdit}
              className="mb-3 h-auto border-none bg-transparent px-0 text-4xl font-black tracking-tight shadow-none focus-visible:ring-0 md:text-5xl placeholder:text-muted-foreground/25"
            />

            {/* Metadata pills */}
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1">
                <Clock className="size-3" />
                Updated {format(new Date(page.updatedAt), "MMM d, yyyy")}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1">
                <span>{wordCount} words</span>
                <span className="opacity-40">·</span>
                <span>{characterCount} chars</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2.5 py-1">
                <span>{readingTime}</span>
              </div>
              {page.creator && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card/60 px-2 py-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={page.creator.avatarUrl} />
                    <AvatarFallback className="text-[8px]">
                      {toInitials(page.creator.firstName, page.creator.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{`${page.creator.firstName} ${page.creator.lastName}`.trim() || "Unknown"}</span>
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="relative rounded-xl border border-border/50 bg-card shadow-sm">
              {editor ? <EditorContent editor={editor} className="p-6 sm:p-8" /> : null}
            </div>

            {/* Table Toolbar — context-aware */}
            <TableToolbar editor={editor} />

          </main>

          {/* ── RIGHT SIDEBAR ──────────────────────────────── */}
          <aside className="space-y-0 lg:sticky lg:top-14 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto custom-scrollbar">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)}>
              <TabsList className="w-full grid grid-cols-3 h-9 mb-3">
                <TabsTrigger value="outline" className="text-xs">
                  <Hash className="size-3 mr-1" /> Outline
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs">
                  <Text className="size-3 mr-1" /> Details
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs">
                  <CheckSquare className="size-3 mr-1" /> Tasks
                </TabsTrigger>
              </TabsList>

              {/* TAB: Outline */}
              <TabsContent value="outline" className="mt-0">
                <div className="rounded-xl border border-border/50 bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Document Outline
                    </h3>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {outline.length}
                    </Badge>
                  </div>
                  <DocumentOutline items={outline} activeId={activeHeadingId} />
                </div>
              </TabsContent>

              {/* TAB: Details */}
              <TabsContent value="details" className="mt-0 space-y-3">

                {/* Page Properties */}
                <div className="rounded-xl border border-border/50 bg-card p-3">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Page Properties
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{format(new Date(page.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium">{format(new Date(page.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Words</span>
                      <span className="font-medium">{wordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Characters</span>
                      <span className="font-medium">{characterCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Reading time</span>
                      <span className="font-medium">{readingTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Visibility</span>
                      <PageVisibilityBadge visibility={visibility} />
                    </div>
                    {page.creator && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Author</span>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={page.creator.avatarUrl} />
                            <AvatarFallback className="text-[8px]">
                              {toInitials(page.creator.firstName, page.creator.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {`${page.creator.firstName} ${page.creator.lastName}`.trim()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                <div className="rounded-xl border border-border/50 bg-card p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Visibility
                  </h3>
                  <div className="space-y-1">
                    {(["PRIVATE", "WORKSPACE", "PUBLIC"] as PageVisibility[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateVisibility(v)}
                        disabled={!canEdit || visibility === v}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left",
                          visibility === v
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {v === "PRIVATE" && <Lock className="size-3.5 flex-shrink-0" />}
                        {v === "WORKSPACE" && <Users className="size-3.5 flex-shrink-0" />}
                        {v === "PUBLIC" && <Globe className="size-3.5 flex-shrink-0" />}
                        <div>
                          <div>{v === "PRIVATE" ? "Private" : v === "WORKSPACE" ? "Workspace" : "Public"}</div>
                          <div className="text-[10px] opacity-60 font-normal">
                            {v === "PRIVATE"
                              ? "Only you"
                              : v === "WORKSPACE"
                              ? "All workspace members"
                              : "Anyone with the link"}
                          </div>
                        </div>
                        {visibility === v && <Check className="ml-auto size-3.5 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="rounded-xl border border-border/50 bg-card p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </h3>
                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => setExportOpen(true)}
                    >
                      <FileDown className="mr-2 size-3.5" /> Export document
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={duplicatePage}
                      disabled={!canEdit || createPage.isPending}
                    >
                      <Copy className="mr-2 size-3.5" /> Duplicate page
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={copyPublicLink}
                    >
                      <Link2 className="mr-2 size-3.5" />
                      {copiedPublicLink ? "Copied!" : "Copy public link"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => setShareOpen(true)}
                      disabled={!canEdit}
                    >
                      <Users className="mr-2 size-3.5" /> Manage access
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => setDeleteOpen(true)}
                      disabled={!canEdit}
                    >
                      <Trash2 className="mr-2 size-3.5" /> Delete page
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Linked Tasks */}
              <TabsContent value="tasks" className="mt-0">
                <PageLinkedTasks pageId={page.id} canEdit={canEdit} />
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        {/* ── SLASH COMMAND PALETTE ──────────────────────────── */}
        {slashOpen && canEdit && (
          <SlashPalette
            commands={slashCommands}
            position={slashPos}
            query={slashQuery}
            onQueryChange={setSlashQuery}
            onSelect={(cmd) => {
              cmd.run();
              setSlashOpen(false);
              setSlashQuery("");
              // Remove the "/" character that triggered the menu
              editor?.chain().focus().run();
            }}
            onClose={() => {
              setSlashOpen(false);
              setSlashQuery("");
            }}
          />
        )}

        {/* ── DIALOGS ────────────────────────────────────────── */}

        {/* Delete Confirm */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Page</DialogTitle>
              <DialogDescription>
                This will permanently delete "{title}" and all its content. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={deletePageNow} disabled={deletePage.isPending}>
                {deletePage.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Publish */}
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

        {/* Export */}
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          pageTitle={title}
          pageId={page.id}
          getMarkdown={getMarkdown}
          getHtml={getHtml}
          getPlainText={getPlainText}
        />

        {/* Share / Access Management */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Manage Private Access
              </DialogTitle>
              <DialogDescription>
                Grant or revoke access for members when this page is set to Private.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {members.filter((member) => member.id !== user?.id).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No other workspace members.</p>
              )}
              {members.filter((member) => member.id !== user?.id).map((member) => {
                const isShared = (page.allowedUsers || []).some((id) => String(id) === String(member.id));
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 p-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl} alt={member.firstName} />
                        <AvatarFallback className="text-[10px]">
                          {toInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{member.firstName} {member.lastName}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isShared ? "outline" : "secondary"}
                      className="h-7 text-xs"
                      onClick={() => toggleUserAccess(member.id)}
                      disabled={!canEdit || updatePage.isPending}
                    >
                      {isShared ? (
                        <><X className="size-3 mr-1" />Remove</>
                      ) : (
                        <><Plus className="size-3 mr-1" />Invite</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
