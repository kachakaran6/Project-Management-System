import type { JSONContent } from "@tiptap/core";

export type PageBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "checklist"
  | "table"
  | "image"
  | "code"
  | "quote"
  | "divider"
  | "other";

export interface PageBlock {
  id: string;
  type: PageBlockType;
  content: string;
}

export interface PageContentMeta {
  icon?: string;
  coverUrl?: string;
  templateId?: string;
}

export interface PageContentEnvelope {
  version: "v1";
  format: "tiptap-json";
  html: string;
  doc: JSONContent;
  blocks: PageBlock[];
  meta?: PageContentMeta;
}

export type PageTemplateId =
  | "project-documentation"
  | "meeting-notes"
  | "task-breakdown"
  | "knowledge-base"
  | "empty";

export const PAGE_TEMPLATES: Array<{
  id: PageTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: "project-documentation",
    label: "Project Documentation",
    description: "Overview, goals, timeline, and resources.",
  },
  {
    id: "meeting-notes",
    label: "Meeting Notes",
    description: "Agenda, discussion notes, and action items.",
  },
  {
    id: "task-breakdown",
    label: "Task Breakdown",
    description: "Tasks, status, owner, and execution details.",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    description: "Sections, FAQs, and references.",
  },
  {
    id: "empty",
    label: "Empty Page",
    description: "Start with a clean page.",
  },
];

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function collectNodeText(node?: JSONContent): string {
  if (!node) return "";

  if (typeof node.text === "string") {
    return node.text;
  }

  if (!Array.isArray(node.content) || node.content.length === 0) {
    return "";
  }

  return node.content.map((child) => collectNodeText(child)).join(" ").trim();
}

function mapNodeType(nodeType?: string): PageBlockType {
  if (!nodeType) return "other";

  if (nodeType === "paragraph") return "paragraph";
  if (nodeType === "heading") return "heading";
  if (nodeType === "bulletList" || nodeType === "orderedList") return "list";
  if (nodeType === "taskList") return "checklist";
  if (nodeType === "table") return "table";
  if (nodeType === "image") return "image";
  if (nodeType === "codeBlock") return "code";
  if (nodeType === "blockquote") return "quote";
  if (nodeType === "horizontalRule") return "divider";

  return "other";
}

function createBlocksFromDoc(doc: JSONContent): PageBlock[] {
  const topLevel = Array.isArray(doc.content) ? doc.content : [];

  return topLevel.map((node, index) => {
    const fallbackText =
      node.type === "image"
        ? String(node.attrs?.alt || node.attrs?.src || "Image")
        : collectNodeText(node) || String(node.type || "Block");

    return {
      id: String(node.attrs?.id || `block-${index + 1}`),
      type: mapNodeType(node.type),
      content: fallbackText,
    };
  });
}

function isEnvelope(value: unknown): value is PageContentEnvelope {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PageContentEnvelope>;
  return (
    candidate.version === "v1" &&
    candidate.format === "tiptap-json" &&
    typeof candidate.html === "string" &&
    typeof candidate.doc === "object"
  );
}

export function parsePageContent(raw: string | null | undefined): {
  html: string;
  doc: JSONContent;
  blocks: PageBlock[];
  meta: PageContentMeta;
  isStructured: boolean;
} {
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    return {
      html: "<p></p>",
      doc: EMPTY_DOC,
      blocks: createBlocksFromDoc(EMPTY_DOC),
      meta: {},
      isStructured: false,
    };
  }

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isEnvelope(parsed)) {
        const doc = parsed.doc || EMPTY_DOC;
        const blocks = Array.isArray(parsed.blocks) && parsed.blocks.length > 0
          ? parsed.blocks
          : createBlocksFromDoc(doc);

        return {
          html: parsed.html || "<p></p>",
          doc,
          blocks,
          meta: parsed.meta || {},
          isStructured: true,
        };
      }
    } catch {
      // Fallback to HTML mode.
    }
  }

  const html = /<\/?[a-z][\s\S]*>/i.test(value)
    ? value
    : `<p>${value.replace(/\n/g, "<br />")}</p>`;

  return {
    html,
    doc: EMPTY_DOC,
    blocks: [{ id: "block-1", type: "paragraph", content: extractPlainTextFromHtml(html) }],
    meta: {},
    isStructured: false,
  };
}

export function createSerializedPageContent(input: {
  html: string;
  doc: JSONContent;
  meta?: PageContentMeta;
}): string {
  const normalizedDoc = input.doc || EMPTY_DOC;

  const payload: PageContentEnvelope = {
    version: "v1",
    format: "tiptap-json",
    html: input.html || "<p></p>",
    doc: normalizedDoc,
    blocks: createBlocksFromDoc(normalizedDoc),
    meta: input.meta || {},
  };

  return JSON.stringify(payload);
}

export function extractRenderableHtml(raw: string | null | undefined): string {
  return parsePageContent(raw).html || "<p></p>";
}

export function extractPlainTextFromHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPagePlainText(raw: string | null | undefined): string {
  const parsed = parsePageContent(raw);
  if (parsed.blocks.length > 0) {
    return parsed.blocks
      .map((block) => block.content)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return extractPlainTextFromHtml(parsed.html);
}

function node(type: string, attrs?: Record<string, unknown>, content?: JSONContent[]): JSONContent {
  return {
    type,
    ...(attrs ? { attrs } : {}),
    ...(content ? { content } : {}),
  };
}

function text(value: string): JSONContent {
  return { type: "text", text: value };
}

function paragraph(value: string): JSONContent {
  return node("paragraph", undefined, value ? [text(value)] : undefined);
}

function heading(value: string, level: 1 | 2 | 3): JSONContent {
  return node("heading", { level }, [text(value)]);
}

function taskItem(value: string, checked = false): JSONContent {
  return node("taskItem", { checked }, [paragraph(value)]);
}

function bulletItem(value: string): JSONContent {
  return node("listItem", undefined, [paragraph(value)]);
}

function createTemplateDoc(templateId: PageTemplateId): JSONContent {
  switch (templateId) {
    case "project-documentation":
      return {
        type: "doc",
        content: [
          heading("Overview", 1),
          paragraph("Summarize the project context, stakeholders, and current status."),
          heading("Goals", 2),
          node("bulletList", undefined, [
            bulletItem("Primary business goal"),
            bulletItem("Success metrics"),
            bulletItem("Scope boundaries"),
          ]),
          heading("Timeline", 2),
          node("table", undefined, [
            node("tableRow", undefined, [
              node("tableHeader", undefined, [paragraph("Milestone")]),
              node("tableHeader", undefined, [paragraph("Owner")]),
              node("tableHeader", undefined, [paragraph("Due")]),
            ]),
            node("tableRow", undefined, [
              node("tableCell", undefined, [paragraph("Kickoff")]),
              node("tableCell", undefined, [paragraph("@owner")]),
              node("tableCell", undefined, [paragraph("YYYY-MM-DD")]),
            ]),
          ]),
          heading("Resources", 2),
          node("bulletList", undefined, [
            bulletItem("Specifications"),
            bulletItem("Design links"),
            bulletItem("Reference docs"),
          ]),
        ],
      };

    case "meeting-notes":
      return {
        type: "doc",
        content: [
          heading("Agenda", 1),
          node("orderedList", undefined, [
            bulletItem("Topic one"),
            bulletItem("Topic two"),
            bulletItem("Topic three"),
          ]),
          heading("Notes", 2),
          paragraph("Capture the key discussion points and decisions here."),
          heading("Action Items", 2),
          node("taskList", undefined, [
            taskItem("Follow up with stakeholders"),
            taskItem("Prepare implementation timeline"),
            taskItem("Share summary with the team"),
          ]),
        ],
      };

    case "task-breakdown":
      return {
        type: "doc",
        content: [
          heading("Task Breakdown", 1),
          node("table", undefined, [
            node("tableRow", undefined, [
              node("tableHeader", undefined, [paragraph("Task")]),
              node("tableHeader", undefined, [paragraph("Status")]),
              node("tableHeader", undefined, [paragraph("Owner")]),
            ]),
            node("tableRow", undefined, [
              node("tableCell", undefined, [paragraph("Design API contract")]),
              node("tableCell", undefined, [paragraph("In Progress")]),
              node("tableCell", undefined, [paragraph("@owner")]),
            ]),
          ]),
          heading("Execution Notes", 2),
          paragraph("Use this section to add blockers, dependencies, and updates."),
        ],
      };

    case "knowledge-base":
      return {
        type: "doc",
        content: [
          heading("Section", 1),
          paragraph("Explain the concept in clear, reusable language."),
          heading("FAQ", 2),
          node("bulletList", undefined, [
            bulletItem("Q: Common question"),
            bulletItem("A: Concise answer"),
          ]),
          heading("References", 2),
          node("bulletList", undefined, [
            bulletItem("Internal doc links"),
            bulletItem("External standards"),
          ]),
        ],
      };

    default:
      return EMPTY_DOC;
  }
}

export function getTemplateDocument(templateId: PageTemplateId): JSONContent {
  return createTemplateDoc(templateId);
}

export function createEmptySerializedContent(meta?: PageContentMeta): string {
  return createSerializedPageContent({
    html: "<p></p>",
    doc: EMPTY_DOC,
    meta,
  });
}
