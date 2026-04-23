import { TaskFormValues } from "@/features/tasks/schemas/task.schema";
import { Task, TaskDraftInput } from "@/types/task.types";

const STORAGE_PREFIX = "task_draft";
const DEFAULT_PROJECT_SLOT = "unassigned";

export interface StoredTaskDraftSnapshot {
  draftId?: string;
  projectId: string;
  updatedAt: string;
  userId: string;
  values: Partial<TaskFormValues>;
}

function normalizeProjectSlot(projectId?: string | null) {
  return String(projectId || "").trim() || DEFAULT_PROJECT_SLOT;
}

function getStoragePrefixForUser(userId: string) {
  return `${STORAGE_PREFIX}_`;
}

function listUserDraftKeys(userId: string) {
  if (typeof window === "undefined") return [] as string[];

  const suffix = `_${userId}`;
  return Object.keys(window.localStorage).filter(
    (key) => key.startsWith(getStoragePrefixForUser(userId)) && key.endsWith(suffix),
  );
}

function safeParseSnapshot(raw: string | null): StoredTaskDraftSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredTaskDraftSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.userId || !parsed.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getTaskDraftStorageKey(projectId: string | undefined, userId: string) {
  return `${STORAGE_PREFIX}_${normalizeProjectSlot(projectId)}_${userId}`;
}

export function hasTaskDraftContent(values: Partial<TaskFormValues>) {
  const title = String(values.title || "").trim();
  const description = String(values.description || "").trim();
  const projectId = String(values.projectId || "").trim();
  const dueDate = String(values.dueDate || "").trim();
  const tags = Array.isArray(values.tags) ? values.tags : [];
  const assigneeIds = Array.isArray(values.assigneeIds) ? values.assigneeIds : [];
  const visibleToUsers = Array.isArray(values.visibleToUsers) ? values.visibleToUsers : [];

  return Boolean(
    title ||
      description ||
      projectId ||
      dueDate ||
      tags.length > 0 ||
      assigneeIds.length > 0 ||
      visibleToUsers.length > 0 ||
      (values.visibility && values.visibility !== "PUBLIC") ||
      (values.status && values.status !== "TODO") ||
      (values.priority && values.priority !== "MEDIUM"),
  );
}

export function createDraftSnapshot(params: {
  draftId?: string | null;
  userId: string;
  values: Partial<TaskFormValues>;
}): StoredTaskDraftSnapshot {
  return {
    draftId: params.draftId || undefined,
    projectId: normalizeProjectSlot(params.values.projectId),
    updatedAt: new Date().toISOString(),
    userId: params.userId,
    values: {
      title: params.values.title || "",
      description: params.values.description || "",
      status: params.values.status || "TODO",
      priority: params.values.priority || "MEDIUM",
      visibility: params.values.visibility || "PUBLIC",
      visibleToUsers: Array.isArray(params.values.visibleToUsers)
        ? params.values.visibleToUsers
        : [],
      projectId: params.values.projectId || "",
      assigneeIds: Array.isArray(params.values.assigneeIds) ? params.values.assigneeIds : [],
      dueDate: params.values.dueDate || "",
      tags: Array.isArray(params.values.tags) ? params.values.tags : [],
    },
  };
}

export function storeTaskDraftSnapshot(
  snapshot: StoredTaskDraftSnapshot,
  previousKey?: string | null,
) {
  if (typeof window === "undefined") return null;

  const nextKey = getTaskDraftStorageKey(snapshot.values.projectId, snapshot.userId);
  if (previousKey && previousKey !== nextKey) {
    window.localStorage.removeItem(previousKey);
  }

  window.localStorage.setItem(nextKey, JSON.stringify(snapshot));
  return nextKey;
}

export function getStoredTaskDraft(
  userId: string,
  projectId?: string,
) {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getTaskDraftStorageKey(projectId, userId));
  return safeParseSnapshot(raw);
}

export function getLatestStoredTaskDraft(userId: string, preferredProjectId?: string) {
  if (typeof window === "undefined") return null;

  const preferred = getStoredTaskDraft(userId, preferredProjectId);
  if (preferred) return preferred;

  return listUserDraftKeys(userId)
    .map((key) => safeParseSnapshot(window.localStorage.getItem(key)))
    .filter((snapshot): snapshot is StoredTaskDraftSnapshot => Boolean(snapshot))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] || null;
}

export function removeStoredTaskDraft(userId: string, params?: { draftId?: string | null; projectId?: string }) {
  if (typeof window === "undefined") return;

  const keys = listUserDraftKeys(userId);
  keys.forEach((key) => {
    const snapshot = safeParseSnapshot(window.localStorage.getItem(key));
    if (!snapshot) return;

    const matchesDraftId =
      params?.draftId && snapshot.draftId
        ? snapshot.draftId === params.draftId
        : false;
    const matchesProject =
      params?.projectId !== undefined
        ? normalizeProjectSlot(snapshot.values.projectId) === normalizeProjectSlot(params.projectId)
        : false;

    if (!params || matchesDraftId || matchesProject) {
      window.localStorage.removeItem(key);
    }
  });
}

export function buildTaskDraftInput(values: Partial<TaskFormValues>, draftId?: string | null): TaskDraftInput {
  return {
    draftId: draftId || undefined,
    title: values.title ?? "",
    description: values.description ?? "",
    projectId: values.projectId ?? "",
    status: values.status || "TODO",
    priority: values.priority || "MEDIUM",
    visibility: values.visibility || "PUBLIC",
    visibleToUsers: Array.isArray(values.visibleToUsers) ? values.visibleToUsers : [],
    assigneeIds: Array.isArray(values.assigneeIds) ? values.assigneeIds : [],
    dueDate: values.dueDate ?? "",
    tags: Array.isArray(values.tags) ? values.tags : [],
  };
}

export function buildTaskPublishInput(values: TaskFormValues) {
  return {
    title: String(values.title || "").trim(),
    description: String(values.description || "").trim() || undefined,
    projectId: values.projectId,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate || "",
    tags: values.tags || [],
    visibility: values.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    visibleToUsers: values.visibility === "PRIVATE" ? (values.visibleToUsers || []) : [],
    assignees: values.assigneeIds || [],
    assigneeId: values.assigneeIds?.[0] || undefined,
  };
}

export function taskToDraftFormValues(task: Task): TaskFormValues {
  const projectId =
    typeof task.projectId === "string"
      ? task.projectId
      : (task.projectId as unknown as { id?: string; _id?: string })?.id ||
        (task.projectId as unknown as { id?: string; _id?: string })?._id ||
        "";

  return {
    title: task.title || "",
    description: task.description || "",
    status: task.status || "TODO",
    priority: task.priority || "MEDIUM",
    visibility: task.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    visibleToUsers: task.visibilityUsers?.map((user) => user.id) || [],
    projectId,
    assigneeIds:
      task.assigneeUsers?.map((user) => user.id) ||
      (task.assigneeIds ? task.assigneeIds.map((id) => String(id)) : []),
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    tags: (task.tags || []).map((tag) => String(tag.id)),
  };
}
