"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Link2, Loader2, Underline as UnderlineIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isSaving?: boolean;
  className?: string;
  autoFocus?: boolean;
  /** If true, doesn't show the "Click to edit" button, just shows the editor */
  alwaysEditing?: boolean;
}

const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function sanitizeUrl(url: string): string {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return "";

  try {
    const parsed = new URL(normalizedUrl, "https://example.com");
    if (!ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol)) return "";
    return parsed.protocol === "https:" && parsed.hostname === "example.com"
      ? normalizedUrl.startsWith("/")
        ? normalizedUrl
        : ""
      : normalizedUrl;
  } catch {
    return "";
  }
}

function sanitizeDescriptionHtml(rawHtml: string): string {
  if (typeof window === "undefined") return rawHtml;
  if (!rawHtml.trim()) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const allowedTags = new Set(["P", "BR", "STRONG", "EM", "U", "A"]);

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();
    const fragment = document.createDocumentFragment();

    for (const child of Array.from(element.childNodes)) {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    }

    if (!allowedTags.has(tag)) {
      return fragment;
    }

    const cleanElement = document.createElement(tag.toLowerCase());
    if (tag === "A") {
      const href = sanitizeUrl(element.getAttribute("href") || "");
      if (!href) {
        return fragment;
      }
      cleanElement.setAttribute("href", href);
      cleanElement.setAttribute("target", "_blank");
      cleanElement.setAttribute("rel", "noopener noreferrer nofollow");
    }

    cleanElement.appendChild(fragment);
    return cleanElement;
  };

  const output = document.createElement("div");
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      output.appendChild(sanitizedChild);
    }
  }

  return output.innerHTML;
}

function sanitizeForDisplay(value: string): string {
  if (!value.trim()) return "";
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
  const html = hasHtml ? value : `<p>${value.replace(/\n/g, "<br />")}</p>`;
  return sanitizeDescriptionHtml(html);
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ active = false, onClick, ariaLabel, disabled = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-all duration-200",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/20",
        disabled && "cursor-not-allowed opacity-30"
      )}
    >
      {children}
    </button>
  );
}

export function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Write a description...",
  isSaving = false,
  className,
  autoFocus = false,
  alwaysEditing = false,
}: TaskDescriptionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(alwaysEditing);
  const [isFocused, setIsFocused] = useState(false);

  // Sync isEditing state if alwaysEditing changes
  useEffect(() => {
    if (alwaysEditing) setIsEditing(true);
  }, [alwaysEditing]);

  const displayHtml = useMemo(() => sanitizeForDisplay(value), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: false,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: sanitizeForDisplay(value),
    editorProps: {
      attributes: {
        class: cn(
          "ProseMirror min-h-[140px] w-full bg-transparent text-[15px] leading-relaxed text-foreground outline-none transition-all duration-200",
          alwaysEditing && "py-0"
        ),
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(sanitizeDescriptionHtml(currentEditor.getHTML()));
    },
    onFocus() {
      setIsFocused(true);
    },
    onBlur() {
      setIsFocused(false);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = sanitizeForDisplay(value);
    const current = sanitizeDescriptionHtml(editor.getHTML());
    if (incoming !== current) {
      editor.commands.setContent(incoming || "", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!isEditing || !editor) return;
    if (autoFocus) {
      editor.commands.focus("end");
    }
  }, [autoFocus, isEditing, editor]);

  useEffect(() => {
    if (alwaysEditing) return;
    if (!isEditing) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEditing, alwaysEditing]);

  const toggleLink = () => {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const existingHref = editor.getAttributes("link").href as string | undefined;
    const rawUrl = window.prompt("Enter URL", existingHref || "https://");
    if (rawUrl === null) return;

    const href = sanitizeUrl(rawUrl);
    if (!href) return;

    editor.chain().focus().setLink({ href }).run();
  };

  if (!isEditing && !alwaysEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className={cn(
          "group relative min-h-[100px] w-full rounded-xl border border-transparent p-4 text-left transition-all duration-200",
          "hover:border-border/60 hover:bg-muted/30",
          className
        )}
      >
        {displayHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none space-y-2 text-[15px] leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <p className="text-[15px] italic text-muted-foreground">{placeholder}</p>
        )}
        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
           <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">EDIT</span>
        </div>
      </button>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative flex flex-col rounded-xl border bg-background transition-all duration-300",
        isFocused ? "border-primary/40 ring-2 ring-primary/5" : "border-border",
        className
      )}
    >
      {/* Notion-style minimal toolbar */}
      <div className="flex items-center gap-0.5 border-b bg-muted/5 p-1.5">
        <ToolbarButton
          ariaLabel="Bold"
          active={Boolean(editor?.isActive("bold"))}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Italic"
          active={Boolean(editor?.isActive("italic"))}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          ariaLabel="Underline"
          active={Boolean(editor?.isActive("underline"))}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <ToolbarButton
          ariaLabel="Link"
          active={Boolean(editor?.isActive("link"))}
          disabled={!editor}
          onClick={toggleLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        
        {isSaving && (
          <div className="ml-auto pr-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
          </div>
        )}
      </div>

      <div className="p-4">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror strong {
          font-weight: 600;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
      `}</style>
    </div>
  );
}