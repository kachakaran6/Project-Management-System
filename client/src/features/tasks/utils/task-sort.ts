import { TaskSortDirection, TaskSortField } from "@/types/task.types";

export interface TaskSortState {
  field: TaskSortField;
  direction: TaskSortDirection;
}

export const DEFAULT_TASK_SORT_FIELD: TaskSortField = "createdAt";
export const DEFAULT_TASK_SORT_DIRECTION: TaskSortDirection = "desc";
export const TASK_SORT_STORAGE_KEY = "tasks:sort-preference";

export const TASK_SORT_OPTIONS: Array<{ value: TaskSortField; label: string }> = [
  { value: "createdAt", label: "Created Date" },
  { value: "updatedAt", label: "Updated Date" },
  { value: "dueDate", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
];

const TASK_SORT_FIELD_SET = new Set<TaskSortField>(
  TASK_SORT_OPTIONS.map((option) => option.value),
);

export const isTaskSortField = (value: unknown): value is TaskSortField =>
  typeof value === "string" && TASK_SORT_FIELD_SET.has(value as TaskSortField);

export const isTaskSortDirection = (
  value: unknown,
): value is TaskSortDirection => value === "asc" || value === "desc";

export const getTaskSortLabel = (field: TaskSortField) =>
  TASK_SORT_OPTIONS.find((option) => option.value === field)?.label ?? field;

export const readTaskSortPreference = (): TaskSortState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TASK_SORT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TaskSortState>;
    if (!isTaskSortField(parsed.field) || !isTaskSortDirection(parsed.direction)) {
      return null;
    }

    return {
      field: parsed.field,
      direction: parsed.direction,
    };
  } catch {
    return null;
  }
};

export const writeTaskSortPreference = (state: TaskSortState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TASK_SORT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
};

export const getDefaultTaskSortState = (): TaskSortState => ({
  field: DEFAULT_TASK_SORT_FIELD,
  direction: DEFAULT_TASK_SORT_DIRECTION,
});