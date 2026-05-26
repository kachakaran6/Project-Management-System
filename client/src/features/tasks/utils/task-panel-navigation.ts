import type { Task, TaskFilters } from "@/types/task.types";

export type TaskPanelNavigationMode = "snapshot" | "paginated-list";

export interface TaskPanelNavigationContext {
  mode: TaskPanelNavigationMode;
  sourceKey: string;
  sourceLabel: string;
  taskIds: string[];
  filters?: TaskFilters;
  page?: number;
  limit?: number;
  totalPages?: number;
}

type TaskIdentity = Pick<Task, "id" | "taskCode" | "legacyId"> & {
  _id?: string;
};

function decodeHtmlEntities(value: string) {
  if (typeof document === "undefined") {
    return value
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function getTaskRecordId(task?: TaskIdentity | null) {
  if (!task) return "";
  return String(task.id || task._id || "");
}

export function getTaskClipboardId(task?: TaskIdentity | null) {
  if (!task) return "";
  return String(task.taskCode || task.legacyId || getTaskRecordId(task));
}

export function getTaskIds(tasks: Array<TaskIdentity | Task | null | undefined>) {
  const seen = new Set<string>();
  const taskIds: string[] = [];

  for (const task of tasks) {
    const taskId = getTaskRecordId(task as TaskIdentity | null);
    if (!taskId || seen.has(taskId)) continue;
    seen.add(taskId);
    taskIds.push(taskId);
  }

  return taskIds;
}

export function buildSnapshotTaskPanelContext({
  sourceKey,
  sourceLabel,
  tasks,
}: {
  sourceKey: string;
  sourceLabel: string;
  tasks: Array<Task | TaskIdentity>;
}): TaskPanelNavigationContext {
  return {
    mode: "snapshot",
    sourceKey,
    sourceLabel,
    taskIds: getTaskIds(tasks),
  };
}

export function buildPaginatedTaskPanelContext({
  sourceKey,
  sourceLabel,
  tasks,
  filters,
  page,
  limit,
  totalPages,
}: {
  sourceKey: string;
  sourceLabel: string;
  tasks: Array<Task | TaskIdentity>;
  filters: TaskFilters;
  page: number;
  limit: number;
  totalPages: number;
}): TaskPanelNavigationContext {
  return {
    mode: "paginated-list",
    sourceKey,
    sourceLabel,
    taskIds: getTaskIds(tasks),
    filters,
    page,
    limit,
    totalPages,
  };
}

export function formatTaskDescriptionForClipboard(description?: string | null) {
  if (!description) return "";

  const withLineBreaks = description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "\n- ");

  const textOnly = withLineBreaks.replace(/<[^>]+>/g, "");
  const decoded = decodeHtmlEntities(textOnly);

  return decoded
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
