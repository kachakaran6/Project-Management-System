import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import type { Task } from "@/types/task.types";
import { resolveStatus } from "./resolve-status";

export interface PDFExportOptions {
  columns: string[];
  descriptionOption: "none" | "150" | "300" | "full";
  layoutDensity: "compact" | "comfortable" | "detailed";
  pageSize: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  scope: "currentPage" | "selected" | "filtered" | "entire";
  sorting: "current" | "custom";
  includeSummaryPage: boolean;
}

// Proportional weights for sizing columns to fit paper dimensions
const COLUMN_WEIGHTS: Record<string, number> = {
  taskId: 1.1,
  title: 3.2,
  description: 4.5,
  status: 1.5,
  priority: 1.4,
  assignee: 1.8,
  reporter: 1.8,
  dueDate: 1.4,
  createdAt: 1.4,
  updatedAt: 1.4,
  labels: 2.0,
  sprint: 1.4,
  board: 1.4,
  project: 2.0,
  estimatedTime: 1.2,
  actualTime: 1.2,
  storyPoints: 1.0,
  githubIssue: 2.2,
  githubPR: 2.2,
  commentsCount: 1.0,
  attachmentsCount: 1.0,
};

const COLUMN_LABELS: Record<string, string> = {
  taskId: "Task ID",
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  reporter: "Reporter",
  dueDate: "Due Date",
  createdAt: "Created At",
  updatedAt: "Updated At",
  labels: "Labels",
  sprint: "Sprint",
  board: "Board",
  project: "Project",
  estimatedTime: "Est. Time",
  actualTime: "Act. Time",
  storyPoints: "Story Pts",
  githubIssue: "GitHub Issue",
  githubPR: "GitHub PR",
  commentsCount: "Comments",
  attachmentsCount: "Attachments",
};

// Colors matching corporate palettes (Jira/Linear style)
const PALETTE = {
  primary: "#0f172a", // slate 900
  secondary: "#475569", // slate 600
  muted: "#94a3b8", // slate 400
  divider: "#e2e8f0", // slate 200
  zebra: "#f8fafc", // slate 50
  white: "#ffffff",
  primaryBrand: "#2563eb", // blue 600
};

// Maps for status coloring
const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  BACKLOG: { text: "#374151", bg: "#f3f4f6" },
  TODO: { text: "#1d4ed8", bg: "#dbeafe" },
  IN_PROGRESS: { text: "#6d28d9", bg: "#ede9fe" },
  IN_REVIEW: { text: "#a16207", bg: "#fef9c3" },
  DONE: { text: "#15803d", bg: "#dcfce7" },
  REJECTED: { text: "#b91c1c", bg: "#fee2e2" },
  ARCHIVED: { text: "#4b5563", bg: "#e5e7eb" },
};

function getStatusColors(status: string) {
  const key = String(status || "").toUpperCase().replace(/\s+/g, "_");
  return STATUS_COLORS[key] || { text: "#374151", bg: "#f3f4f6" };
}

function getPriorityColors(priority: string) {
  const p = String(priority || "").toUpperCase();
  if (p === "HIGH" || p === "URGENT") {
    return { text: "#b91c1c" };
  } else if (p === "LOW") {
    return { text: "#6b7280" };
  }
  return { text: "#374151" }; // MEDIUM
}

function formatValue(val: any): string {
  if (val === null || val === undefined || String(val).trim() === "") return "—";
  return String(val);
}

function formatDate(val: any): string {
  if (!val) return "—";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUser(userObj: any): string {
  if (!userObj) return "—";
  if (typeof userObj === "string") return userObj;
  const fullName = `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim();
  return fullName || userObj.name || userObj.email || "—";
}

function parseHTMLToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export async function generateTasksPDF(
  tasks: Task[],
  options: PDFExportOptions,
  meta: {
    projectName: string;
    boardName: string;
    exportedBy: string;
    appliedFilters: {
      status?: string;
      priority?: string;
      search?: string;
    };
    statuses?: any[];
  }
) {
  const {
    columns,
    descriptionOption,
    layoutDensity,
    pageSize,
    orientation,
    includeSummaryPage,
  } = options;

  // 1. Initialize jsPDF
  const doc = new jsPDF({
    format: pageSize.toLowerCase(),
    orientation: orientation,
    unit: "pt",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = { top: 36, bottom: 40, left: 30, right: 30 };
  const usableWidth = pageWidth - margin.left - margin.right;

  // Format date helper
  const exportTimestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const drawFooter = (docInstance: jsPDF, pageNum: number, totalPages: number) => {
    docInstance.saveGraphicsState();
    docInstance.setFont("Helvetica", "normal");
    docInstance.setFontSize(8);
    docInstance.setTextColor(148, 163, 184); // slate 400

    // Soft Divider
    docInstance.setDrawColor(226, 232, 240); // slate 200
    docInstance.setLineWidth(0.5);
    docInstance.line(margin.left, pageHeight - 30, pageWidth - margin.right, pageHeight - 30);

    // Left info
    docInstance.text(
      `Exported from Project Management System • ${exportTimestamp}`,
      margin.left,
      pageHeight - 18
    );

    // Right page number
    const pageStr = `Page ${pageNum} of ${totalPages}`;
    docInstance.text(pageStr, pageWidth - margin.right - docInstance.getTextWidth(pageStr), pageHeight - 18);
    docInstance.restoreGraphicsState();
  };

  // ==========================================
  // SUMMARY PAGE
  // ==========================================
  if (includeSummaryPage) {
    // Top branding bar
    doc.setFillColor(37, 99, 235); // primary brand Blue 600
    doc.rect(0, 0, pageWidth, 8, "F");

    let currentY = 45;

    // Title Block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate 900
    doc.text("Tasks Export Summary", margin.left, currentY);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate 500
    currentY += 16;
    doc.text(`Project Workspace: ${meta.projectName}`, margin.left, currentY);

    // Metadata & Settings Info Cards (Left and Right)
    currentY += 24;
    const cardHeight = 75;
    const cardWidth = (usableWidth - 16) / 2;

    // Card 1: Project Metadata
    doc.setFillColor(248, 250, 252); // slate 50
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(1);
    doc.roundedRect(margin.left, currentY, cardWidth, cardHeight, 4, 4, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate 600
    doc.text("Project Context", margin.left + 12, currentY + 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Active Board: ${meta.boardName || "—"}`, margin.left + 12, currentY + 34);
    doc.text(`Exported By: ${meta.exportedBy}`, margin.left + 12, currentY + 48);
    doc.text(`Export Date: ${exportTimestamp}`, margin.left + 12, currentY + 62);

    // Card 2: Filter Summary
    doc.roundedRect(margin.left + cardWidth + 16, currentY, cardWidth, cardHeight, 4, 4, "FD");
    doc.setFont("Helvetica", "bold");
    doc.text("Applied Filters", margin.left + cardWidth + 28, currentY + 18);

    doc.setFont("Helvetica", "normal");
    doc.text(`Status Filter: ${meta.appliedFilters.status || "ALL"}`, margin.left + cardWidth + 28, currentY + 34);
    doc.text(`Priority Filter: ${meta.appliedFilters.priority || "ALL"}`, margin.left + cardWidth + 28, currentY + 48);
    doc.text(`Search Keyword: ${meta.appliedFilters.search ? `"${meta.appliedFilters.search}"` : "NONE"}`, margin.left + cardWidth + 28, currentY + 62);

    currentY += cardHeight + 24;

    // Big Stats Panel
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Task Metrics Overview", margin.left, currentY);

    currentY += 12;
    const statsCols = 4;
    const statCardWidth = (usableWidth - (statsCols - 1) * 12) / statsCols;
    const statCardHeight = 65;

    // Calculations
    const total = tasks.length;
    const doneTasks = tasks.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return s === "DONE" || (typeof t.status === "object" && String((t.status as any).name).toUpperCase() === "DONE");
    }).length;
    
    const openTasks = total - doneTasks;
    const completionPercent = total > 0 ? Math.round((doneTasks / total) * 100) : 0;

    const stats = [
      { label: "Total Tasks", value: String(total), color: "#0f172a" },
      { label: "Completion Rate", value: `${completionPercent}%`, color: "#16a34a" },
      { label: "Open Tasks", value: String(openTasks), color: "#2563eb" },
      { label: "Completed Tasks", value: String(doneTasks), color: "#16a34a" },
    ];

    stats.forEach((stat, i) => {
      const cardX = margin.left + i * (statCardWidth + 12);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(cardX, currentY, statCardWidth, statCardHeight, 4, 4, "FD");

      // Card Value
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(stat.color);
      doc.text(stat.value, cardX + statCardWidth / 2, currentY + 28, { align: "center" });

      // Card Label
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, cardX + statCardWidth / 2, currentY + 48, { align: "center" });
    });

    currentY += statCardHeight + 28;

    // Details Grid: Status and Priority breakdowns
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Task Breakdown", margin.left, currentY);

    currentY += 12;
    const breakdownWidth = (usableWidth - 20) / 2;

    // Calculate Status Breakdown
    const statusCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      const resolvedStatus = resolveStatus(t, meta.statuses || []);
      const name = resolvedStatus ? resolvedStatus.name : (typeof t.status === "object" ? (t.status as any).name : t.status);
      const s = String(name || "TODO").toUpperCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    // Calculate Priority Breakdown
    const priorityCounts: Record<string, number> = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    tasks.forEach((t) => {
      const p = String(t.priority || "MEDIUM").toUpperCase();
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    // Render Status Breakdown Table
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin.left, currentY, breakdownWidth, 120, 4, 4, "D");
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin.left + 0.5, currentY + 0.5, breakdownWidth - 1, 24, 4, 4, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("STATUS", margin.left + 12, currentY + 16);
    doc.text("COUNT", margin.left + breakdownWidth - 45, currentY + 16);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    let statusY = currentY + 40;
    Object.entries(statusCounts).slice(0, 4).forEach(([s, count]) => {
      const capitalized = s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
      doc.text(capitalized, margin.left + 12, statusY);
      doc.text(String(count), margin.left + breakdownWidth - 45, statusY);
      statusY += 20;
    });

    // Render Priority Breakdown Table
    doc.roundedRect(margin.left + breakdownWidth + 20, currentY, breakdownWidth, 120, 4, 4, "D");
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin.left + breakdownWidth + 20.5, currentY + 0.5, breakdownWidth - 1, 24, 4, 4, "F");

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("PRIORITY LEVEL", margin.left + breakdownWidth + 32, currentY + 16);
    doc.text("COUNT", margin.left + usableWidth - 45, currentY + 16);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    let priorityY = currentY + 40;
    Object.entries(priorityCounts).forEach(([p, count]) => {
      const capitalized = p.charAt(0) + p.slice(1).toLowerCase();
      doc.text(capitalized, margin.left + breakdownWidth + 32, priorityY);
      doc.text(String(count), margin.left + usableWidth - 45, priorityY);
      priorityY += 20;
    });

    // Add new page for table content
    doc.addPage();
  }

  // ==========================================
  // TABLE DATA GENERATION
  // ==========================================
  // Proportional Weights calculation
  const totalWeight = columns.reduce((sum, col) => sum + (COLUMN_WEIGHTS[col] || 1.5), 0);
  const columnStyles: Record<string, { cellWidth: number }> = {};
  columns.forEach((col) => {
    const weight = COLUMN_WEIGHTS[col] || 1.5;
    columnStyles[col] = { cellWidth: (weight / totalWeight) * usableWidth };
  });

  // Styles based on layout density selection
  const densityStyles = {
    compact: { fontSize: 7, cellPadding: 3, rowHeight: 20 },
    comfortable: { fontSize: 8.5, cellPadding: 6, rowHeight: 28 },
    detailed: { fontSize: 9.5, cellPadding: 9, rowHeight: 36 },
  }[layoutDensity];

  // Map tasks to raw rows
  const tableBody = tasks.map((task) => {
    const rowData: Record<string, string> = {};

    columns.forEach((col) => {
      let rawVal: any = "";

      switch (col) {
        case "taskId":
          rawVal = task.taskCode || `T-${task.id.slice(-4).toUpperCase()}`;
          break;
        case "title":
          rawVal = task.title;
          break;
        case "description":
          const cleanDesc = parseHTMLToText(task.description || "");
          if (descriptionOption === "none") {
            rawVal = "—";
          } else if (descriptionOption === "150") {
            rawVal = cleanDesc.length > 150 ? `${cleanDesc.slice(0, 147)}...` : cleanDesc;
          } else if (descriptionOption === "300") {
            rawVal = cleanDesc.length > 300 ? `${cleanDesc.slice(0, 297)}...` : cleanDesc;
          } else {
            rawVal = cleanDesc;
          }
          break;
        case "status":
          const resolvedStatus = resolveStatus(task, meta.statuses || []);
          rawVal = resolvedStatus ? resolvedStatus.name : (typeof task.status === "object" ? (task.status as any).name : task.status);
          break;
        case "priority":
          rawVal = task.priority;
          break;
        case "assignee":
          rawVal = task.assigneeUsers && task.assigneeUsers.length > 0
            ? task.assigneeUsers.map(formatUser).join(", ")
            : formatUser(task.assigneeId);
          break;
        case "reporter":
          rawVal = formatUser(task.creator);
          break;
        case "dueDate":
          rawVal = formatDate(task.dueDate);
          break;
        case "createdAt":
          rawVal = formatDate(task.createdAt);
          break;
        case "updatedAt":
          rawVal = formatDate(task.updatedAt);
          break;
        case "labels":
          rawVal = task.tags && task.tags.length > 0 ? task.tags.map((t) => t.label || t.name).join(", ") : "—";
          break;
        case "sprint":
          rawVal = (task as any).sprint;
          break;
        case "board":
          rawVal = meta.boardName;
          break;
        case "project":
          rawVal = meta.projectName;
          break;
        case "estimatedTime":
          rawVal = (task as any).estimatedTime || (task as any).estimate;
          break;
        case "actualTime":
          rawVal = (task as any).actualTime;
          break;
        case "storyPoints":
          rawVal = (task as any).storyPoints;
          break;
        case "githubIssue":
          const issues = task.githubLinks?.filter((link) => link.type === "commit" || link.url?.includes("issues"));
          rawVal = issues && issues.length > 0 ? issues.map((i) => i.url).join("\n") : "—";
          break;
        case "githubPR":
          const prs = task.githubLinks?.filter((link) => link.type === "pr" || link.url?.includes("pull"));
          rawVal = prs && prs.length > 0 ? prs.map((p) => p.url).join("\n") : "—";
          break;
        case "commentsCount":
          rawVal = (task as any).commentsCount;
          break;
        case "attachmentsCount":
          rawVal = (task as any).attachmentsCount;
          break;
        default:
          rawVal = (task as any)[col];
      }

      rowData[col] = formatValue(rawVal);
    });

    return rowData;
  });

  // Configure AutoTable
  const autoTableOptions: UserOptions = {
    columns: columns.map((col) => ({ header: COLUMN_LABELS[col], dataKey: col })),
    body: tableBody,
    startY: includeSummaryPage ? 40 : 65,
    margin: margin,
    theme: "grid",
    columnStyles: columnStyles,
    styles: {
      font: "Helvetica",
      fontSize: densityStyles.fontSize,
      cellPadding: densityStyles.cellPadding,
      overflow: "linebreak",
      lineColor: PALETTE.divider,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: PALETTE.zebra,
      textColor: PALETTE.primary,
      fontStyle: "bold",
      lineWidth: 0.5,
      lineColor: PALETTE.divider,
    },
    alternateRowStyles: {
      fillColor: PALETTE.zebra,
    },
    didParseCell: (data) => {
      const columnKey = data.column.dataKey;
      const val = String(data.cell.raw || "");

      if (columnKey === "status" && val !== "—") {
        const colors = getStatusColors(val);
        data.cell.styles.textColor = colors.text;
        data.cell.styles.fillColor = colors.bg;
        data.cell.styles.fontStyle = "bold";
      }

      if (columnKey === "priority" && val !== "—") {
        const colors = getPriorityColors(val);
        data.cell.styles.textColor = colors.text;
        data.cell.styles.fontStyle = "bold";
      }

      if ((columnKey === "githubIssue" || columnKey === "githubPR") && val !== "—") {
        data.cell.styles.textColor = PALETTE.primaryBrand;
      }
    },
    didDrawPage: (data) => {
      // Draw standard running header
      doc.saveGraphicsState();
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      
      const docHeaderStr = `${meta.projectName} • ${meta.boardName}`;
      doc.text(docHeaderStr, margin.left, 24);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Exported: ${exportTimestamp}`, pageWidth - margin.right - doc.getTextWidth(`Exported: ${exportTimestamp}`), 24);
      
      // Bottom running divider under running header
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin.left, 28, pageWidth - margin.right, 28);
      doc.restoreGraphicsState();
    },
  };

  // 3. Render AutoTable
  autoTable(doc, autoTableOptions);

  // 4. Draw Footer & Page Numbers
  const totalPages = doc.internal.pages.length - 1; // page index 0 is not printed/rendered by jsPDF
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // 5. Save/Download File
  const fileDate = new Date().toISOString().slice(0, 10);
  const formattedProjectName = meta.projectName.replace(/[^a-z0-9]/gi, "_");
  const formattedBoardName = meta.boardName.replace(/[^a-z0-9]/gi, "_");
  const fileName = `${formattedProjectName}_${formattedBoardName}_Tasks_${fileDate}.pdf`;

  doc.save(fileName);
}
