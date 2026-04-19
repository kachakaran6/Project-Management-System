import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import * as XLSX from "xlsx";

import type { Task } from "@/types/task.types";
import type { TaskStatus } from "@/types/task.types";

export type TaskExportFilters = {
  workspace?: string;
  search?: string;
  status?: string;
  priority?: string;
  project?: string;
  assignee?: string;
  dueDate?: string;
};

type ExportableTaskRow = {
  taskId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  project: string;
  assignee: string;
  dueDate: string;
  tags: string;
  createdAt: string;
};

type PdfTaskRow = ExportableTaskRow & {
  statusKey: TaskStatus;
  statusLabel: string;
  dueDatePdf: string;
  tagsList: string[];
};

type StatusVisual = {
  label: string;
  text: ReturnType<typeof rgb>;
  background: ReturnType<typeof rgb>;
};

const COLOR = {
  white: rgb(1, 1, 1),
  textPrimary: rgb(0.1, 0.13, 0.2), // #1a2133
  textSecondary: rgb(0.42, 0.45, 0.5), // #6b7280
  divider: rgb(0.9, 0.91, 0.92), // #e5e7eb
  mutedBg: rgb(0.95, 0.96, 0.97), // #f3f4f6
  zebra: rgb(0.98, 0.98, 0.98), // #fafafa
  tableHeader: rgb(0.975, 0.98, 0.985), // #f9fafb
};

const STATUS_ORDER: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "REJECTED",
  "ARCHIVED",
];

const STATUS_VISUALS: Record<TaskStatus, StatusVisual> = {
  BACKLOG: {
    label: "Backlog",
    text: rgb(0.22, 0.25, 0.32), // #374151
    background: rgb(0.95, 0.96, 0.97), // #f3f4f6
  },
  TODO: {
    label: "Todo",
    text: rgb(0.11, 0.31, 0.85), // #1d4ed8
    background: rgb(0.86, 0.92, 0.99), // #dbeafe
  },
  IN_PROGRESS: {
    label: "In Progress",
    text: rgb(0.43, 0.16, 0.85), // #6d28d9
    background: rgb(0.93, 0.91, 1), // #ede9fe
  },
  IN_REVIEW: {
    label: "In Review",
    text: rgb(0.72, 0.46, 0.08),
    background: rgb(1, 0.97, 0.9),
  },
  DONE: {
    label: "Done",
    text: rgb(0.09, 0.39, 0.2), // #166534
    background: rgb(0.86, 0.99, 0.91), // #dcfce7
  },
  REJECTED: {
    label: "Rejected",
    text: rgb(0.72, 0.17, 0.27),
    background: rgb(1, 0.93, 0.95),
  },
  ARCHIVED: {
    label: "Archived",
    text: rgb(0.29, 0.33, 0.39), // #4b5563
    background: rgb(0.9, 0.91, 0.92), // #e5e7eb
  },
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatPdfDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeText(value?: string | null) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeStatus(status: string): TaskStatus {
  const candidate = String(status || "").toUpperCase() as TaskStatus;
  return STATUS_ORDER.includes(candidate) ? candidate : "TODO";
}

function stripHtml(html: string) {
  if (!html) return "";
  // Replace line breaks and paragraph ends with newlines before stripping
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // Decode basic HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n/g, "\n") // Remove excessive newlines
    .trim();
}

function getProjectName(task: Task) {
  const project = (task as Task & { projectId?: unknown }).projectId;
  if (typeof project === "string") return project;
  if (project && typeof project === "object") {
    const projectRecord = project as { name?: string; id?: string; _id?: string };
    return projectRecord.name || projectRecord.id || projectRecord._id || "Unknown";
  }
  return "Unknown";
}

function getAssigneeName(task: Task) {
  const primaryAssignee = task.assigneeUsers?.[0];
  if (primaryAssignee?.name) return primaryAssignee.name;

  const createdBy = (task as Task & {
    assignee?: { name?: string; firstName?: string; lastName?: string };
  }).assignee;

  if (createdBy) {
    const fullName = [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (createdBy.name) return createdBy.name;
  }

  return "Unassigned";
}

function mapTaskRow(task: Task): ExportableTaskRow {
  const taskId = String(task.id || (task as Task & { _id?: string })._id || "");
  const description = stripHtml(task.description || "");

  return {
    taskId,
    title: normalizeText(task.title) || "Untitled task",
    description: description.length > 180 ? `${description.slice(0, 177)}...` : description,
    status: task.status || "TODO",
    priority: task.priority || "MEDIUM",
    project: getProjectName(task),
    assignee: getAssigneeName(task),
    dueDate: formatDate(task.dueDate),
    tags: (task.tags || []).join(", ") || "-",
    createdAt: formatDate(task.createdAt),
  };
}

function mapPdfTaskRow(task: Task): PdfTaskRow {
  const base = mapTaskRow(task);
  const statusKey = normalizeStatus(base.status);

  return {
    ...base,
    statusKey,
    statusLabel: STATUS_VISUALS[statusKey].label,
    dueDatePdf: formatPdfDate(task.dueDate),
    tagsList: (task.tags || []).slice(0, 3),
  };
}

function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function textWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function truncateToWidth(
  value: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
) {
  if (!value) return "-";
  if (textWidth(font, value, fontSize) <= maxWidth) return value;

  const ellipsis = "...";
  let trimmed = value;
  while (trimmed.length > 1) {
    trimmed = trimmed.slice(0, -1);
    const candidate = `${trimmed}${ellipsis}`;
    if (textWidth(font, candidate, fontSize) <= maxWidth) return candidate;
  }

  return ellipsis;
}

function drawSoftDivider(page: PDFPage, x: number, y: number, width: number) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.7,
    color: COLOR.divider,
  });
}

function drawTopHeader(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  filters: TaskExportFilters,
  metrics: { total: number; todo: number; inProgress: number; done: number },
  pageWidth: number,
  marginX: number,
  topY: number,
) {
  let y = topY;

  // Title and Workspace (Left)
  page.drawText("Tasks Report", {
    x: marginX,
    y,
    size: 20,
    font: bold,
    color: COLOR.textPrimary,
  });

  const workspaceName = (filters.workspace || "Current Workspace").toUpperCase();
  page.drawText(workspaceName, {
    x: marginX,
    y: y - 16,
    size: 8,
    font: regular,
    color: COLOR.textSecondary,
  });

  // Stats in one line (Right)
  const stats = [
    { label: "Total", value: String(metrics.total) },
    { label: "Todo", value: String(metrics.todo) },
    { label: "In Progress", value: String(metrics.inProgress) },
    { label: "Done", value: String(metrics.done) },
  ];

  const gap = 16;
  let cursorX = pageWidth - marginX;
  
  // Draw stats from right to left to ensure alignment
  stats.reverse().forEach((stat) => {
    const valWidth = textWidth(bold, stat.value, 11);
    const labWidth = textWidth(regular, stat.label, 8);
    const blockWidth = valWidth + labWidth + 6;
    cursorX -= blockWidth;

    page.drawText(stat.value, {
      x: cursorX,
      y: y - 2,
      size: 11,
      font: bold,
      color: COLOR.textPrimary,
    });

    page.drawText(stat.label, {
      x: cursorX + valWidth + 4,
      y: y - 2,
      size: 8,
      font: regular,
      color: COLOR.textSecondary,
    });

    cursorX -= gap;
  });

  y -= 44;
  page.drawText(`Exported ${new Date().toLocaleString()}`, {
    x: marginX,
    y,
    size: 9,
    font: regular,
    color: COLOR.textSecondary,
  });

  return y - 12;
}

function drawFilterChips(
  page: PDFPage,
  regular: PDFFont,
  filters: TaskExportFilters,
  marginX: number,
  pageWidth: number,
  startY: number,
) {
  const chips = [
    `Search: ${filters.search || "-"}`,
    `Status: ${filters.status || "ALL"}`,
    `Priority: ${filters.priority || "ALL"}`,
    `Assignee: ${filters.assignee || "ALL"}`,
    `Project: ${filters.project || "ALL"}`,
  ];

  const maxX = pageWidth - marginX;
  let x = marginX;
  let y = startY;
  const chipHeight = 14;

  chips.forEach((chip) => {
    const chipLabel = chip;
    const labelWidth = textWidth(regular, chipLabel, 7.5);
    const width = labelWidth + 14;
    
    if (x + width > maxX) {
      x = marginX;
      y -= 18;
    }

    // Pill background
    page.drawRectangle({
      x,
      y: y - 3,
      width,
      height: chipHeight,
      color: rgb(0.95, 0.96, 0.97), // #F3F4F6
    });

    page.drawText(chipLabel, {
      x: x + 7,
      y: y + 0.5,
      size: 7.5,
      font: regular,
      color: rgb(0.22, 0.25, 0.32), // #374151
    });

    x += width + 6;
  });

  return y - 24;
}

function drawTableHeader(
  page: PDFPage,
  bold: PDFFont,
  x: number,
  y: number,
  columns: Array<{ key: string; label: string; width: number }>,
) {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  page.drawRectangle({
    x,
    y: y - 8,
    width: totalWidth,
    height: 24,
    color: COLOR.tableHeader, // #F9FAFB
  });

  let cursor = x + 8;
  columns.forEach((col) => {
    page.drawText(col.label.toUpperCase(), {
      x: cursor,
      y: y + 2,
      size: 7.5,
      font: bold,
      color: COLOR.textSecondary,
    });
    cursor += col.width;
  });

  drawSoftDivider(page, x, y - 8, totalWidth);
  return y - 32;
}

function drawStatusBadge(
  page: PDFPage,
  regular: PDFFont,
  row: PdfTaskRow,
  x: number,
  y: number,
) {
  const visual = STATUS_VISUALS[row.statusKey];
  const label = visual.label;
  const labelSize = 7;
  const labelWidth = textWidth(regular, label, labelSize);
  const badgeWidth = Math.max(48, labelWidth + 12);
  const badgeHeight = 13;

  // Modern pill badge
  page.drawRectangle({
    x,
    y: y - 2.5,
    width: badgeWidth,
    height: badgeHeight,
    color: visual.background,
  });
  
  page.drawText(label, {
    x: x + (badgeWidth - labelWidth) / 2,
    y: y + 0.5,
    size: labelSize,
    font: regular,
    color: visual.text,
  });
}

function drawTags(
  page: PDFPage,
  regular: PDFFont,
  tags: string[],
  x: number,
  y: number,
  maxWidth: number,
) {
  if (tags.length === 0) {
    page.drawText("-", {
      x,
      y,
      size: 8,
      font: regular,
      color: COLOR.textSecondary,
    });
    return;
  }

  let cursor = x;
  tags.forEach((tag) => {
    const clean = truncateToWidth(tag, regular, 7, 56);
    const width = textWidth(regular, clean, 7) + 10;
    if (cursor + width > x + maxWidth) return;

    page.drawRectangle({
      x: cursor,
      y: y - 3,
      width,
      height: 12,
      color: COLOR.mutedBg,
      borderColor: COLOR.divider,
      borderWidth: 0.4,
    });
    page.drawText(clean, {
      x: cursor + 5,
      y,
      size: 7,
      font: regular,
      color: COLOR.textSecondary,
    });
    cursor += width + 4;
  });
}

function drawFooter(
  page: PDFPage,
  regular: PDFFont,
  pageNumber: number,
  pageCount: number,
  marginX: number,
  pageWidth: number,
) {
  const y = 20;
  drawSoftDivider(page, marginX, y + 10, pageWidth - marginX * 2);

  page.drawText("Generated by PMS Orbit", {
    x: marginX,
    y,
    size: 8,
    font: regular,
    color: COLOR.textSecondary,
  });

  const pageText = `Page ${pageNumber} of ${pageCount}`;
  page.drawText(pageText, {
    x: pageWidth - marginX - textWidth(regular, pageText, 8),
    y,
    size: 8,
    font: regular,
    color: COLOR.textSecondary,
  });
}

export async function generatePDF(tasks: Task[], filters: TaskExportFilters) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const rows = tasks.map(mapPdfTaskRow);
  const groupedRows = STATUS_ORDER.map((status) => ({
    status,
    rows: rows.filter((row) => row.statusKey === status),
  })).filter((group) => group.rows.length > 0);

  const metrics = {
    total: rows.length,
    todo: rows.filter((r) => r.statusKey === "TODO").length,
    inProgress: rows.filter((r) => r.statusKey === "IN_PROGRESS").length,
    done: rows.filter((r) => r.statusKey === "DONE").length,
  };

  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 32;
  const marginBottom = 32;
  const footerHeight = 32;

  const columns = [
    { key: "taskId", label: "Task ID", width: 92 },   // 12%
    { key: "title", label: "Title", width: 248 },    // 32%
    { key: "status", label: "Status", width: 108 },   // 14%
    { key: "priority", label: "Priority", width: 92 }, // 12%
    { key: "assignee", label: "Assignee", width: 108 },// 14%
    { key: "dueDate", label: "Due Date", width: 78 }, // 10%
    { key: "tags", label: "Tags", width: 48 },       // 6%
  ] as const;
  
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const rowHeight = 32; // Standard SaaS row height
  const sectionHeaderHeight = 28;
  const firstPageTopY = pageHeight - 52;
  const contentTopY = pageHeight - 48;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = drawTopHeader(
    page,
    regular,
    bold,
    filters,
    metrics,
    pageWidth,
    marginX,
    firstPageTopY,
  );
  y = drawFilterChips(page, regular, filters, marginX, pageWidth, y);
  y = drawTableHeader(page, bold, marginX, y, columns as unknown as Array<{ key: string; label: string; width: number }>);

  const createContinuedPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = drawTableHeader(
      page,
      bold,
      marginX,
      contentTopY,
      columns as unknown as Array<{ key: string; label: string; width: number }>,
    );
  };

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < marginBottom + footerHeight) {
      createContinuedPage();
    }
  };

  let paintIndex = 0;
  groupedRows.forEach((group) => {
    ensureSpace(sectionHeaderHeight + rowHeight);

    const sectionLabel = STATUS_VISUALS[group.status].label.toUpperCase();
    
    y -= 12;
    page.drawText(sectionLabel, {
      x: marginX + 8,
      y,
      size: 7.5,
      font: bold,
      color: COLOR.textSecondary,
    });
    
    // Header divider
    drawSoftDivider(page, marginX, y - 6, totalWidth);
    y -= 18;

    group.rows.forEach((row) => {
      ensureSpace(rowHeight);

      if (paintIndex % 2 !== 0) {
        page.drawRectangle({
          x: marginX,
          y: y - 8,
          width: totalWidth,
          height: rowHeight,
          color: COLOR.zebra,
        });
      }

      let cursor = marginX + 8;

      // Task ID
      page.drawText(
        truncateToWidth(`#${row.taskId.slice(-6).toUpperCase()}`, regular, 7, columns[0].width - 15),
        {
          x: cursor,
          y,
          size: 7.5,
          font: regular,
          color: COLOR.textSecondary,
        },
      );
      cursor += columns[0].width;

      // Title
      page.drawText(
        truncateToWidth(row.title, bold, 8.5, columns[1].width - 15),
        {
          x: cursor,
          y,
          size: 8.5,
          font: bold,
          color: COLOR.textPrimary,
        },
      );
      cursor += columns[1].width;

      // Status
      drawStatusBadge(page, regular, row, cursor, y + 1);
      cursor += columns[2].width;

      // Priority - CLEAN TEXT EMPHASIS
      const isHigh = row.priority === "HIGH" || row.priority === "URGENT";
      const priorityColor = isHigh ? rgb(0.86, 0.15, 0.15) : (row.priority === "LOW" ? COLOR.textSecondary : rgb(0.22, 0.25, 0.32));
      
      page.drawText(row.priority, {
        x: cursor,
        y,
        size: 7.5,
        font: isHigh ? bold : regular,
        color: priorityColor,
      });
      cursor += columns[3].width;

      // Assignee
      page.drawText(
        truncateToWidth(row.assignee, regular, 8, columns[4].width - 10),
        {
          x: cursor,
          y,
          size: 8,
          font: regular,
          color: COLOR.textPrimary,
        },
      );
      cursor += columns[4].width;

      // Due Date
      page.drawText(
        row.dueDatePdf,
        {
          x: cursor,
          y,
          size: 8,
          font: regular,
          color: row.dueDatePdf === "-" ? COLOR.textSecondary : COLOR.textPrimary,
        },
      );
      cursor += columns[5].width;

      // Tags
      const tagsText = row.tagsList.length > 0 ? row.tagsList[0] + (row.tagsList.length > 1 ? ` +${row.tagsList.length - 1}` : "") : "-";
      page.drawText(
          truncateToWidth(tagsText, regular, 7.5, columns[6].width - 5),
          {
            x: cursor,
            y,
            size: 7.5,
            font: regular,
            color: COLOR.textSecondary,
          },
        );

      drawSoftDivider(page, marginX, y - 8, totalWidth);
      y -= rowHeight;
      paintIndex += 1;
    });

    y -= 8;
    paintIndex = 0; // Reset zebra on new section
  });

  const pages = doc.getPages();
  pages.forEach((pdfPage, index) => {
    drawFooter(pdfPage, regular, index + 1, pages.length, marginX, pageWidth);
  });

  const bytes = await doc.save();
  const pdfBuffer = new ArrayBuffer(bytes.length);
  new Uint8Array(pdfBuffer).set(bytes);
  const fileDate = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    new Blob([pdfBuffer], { type: "application/pdf" }),
    `tasks-report_${fileDate}.pdf`,
  );
}

export async function generateExcel(tasks: Task[]) {
  const rows = tasks.map(mapTaskRow).map((row) => ({
    "Task ID": row.taskId,
    Title: row.title,
    Description: row.description,
    Status: row.status,
    Priority: row.priority,
    Project: row.project,
    Assignee: row.assignee,
    "Due Date": row.dueDate,
    Tags: row.tags,
    "Created At": row.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const header = [
    "Task ID",
    "Title",
    "Description",
    "Status",
    "Priority",
    "Project",
    "Assignee",
    "Due Date",
    "Tags",
    "Created At",
  ];

  XLSX.utils.sheet_add_aoa(worksheet, [header], { origin: "A1" });

  header.forEach((_, index) => {
    const cellAddress = XLSX.utils.encode_cell({ c: index, r: 0 });
    const cell = worksheet[cellAddress];
    if (cell) {
      cell.s = {
        font: { bold: true },
      };
    }
  });

  const widthByKey = header.map((key) => {
    const maxDataLength = rows.reduce((max, row) => {
      const value = String(row[key as keyof typeof row] || "");
      return Math.max(max, value.length);
    }, key.length);

    return { wch: Math.min(48, Math.max(12, maxDataLength + 2)) };
  });

  worksheet["!cols"] = widthByKey;
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!autofilter"] = { ref: `A1:J${Math.max(rows.length + 1, 2)}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  const excelArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileDate = new Date().toISOString().slice(0, 10);
  triggerFileDownload(
    new Blob([excelArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `tasks-report_${fileDate}.xlsx`,
  );
}
