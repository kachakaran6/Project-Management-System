/**
 * Normalizes an ID to a string, handling both string and ObjectId formats.
 */
export const normalizeId = (id: any): string | undefined => {
  if (!id) return undefined;
  if (typeof id === 'string') return id;
  if (id.toString && typeof id.toString === 'function') {
    return id.toString();
  }
  return String(id);
};

/**
 * Resolves a task's status to a full status object from the dynamic statuses list.
 * Supports legacy string statuses (names), legacy IDs, and populated objects.
 */
export const resolveStatus = (task: any, statuses: any[]) => {
  if (!task || !statuses || statuses.length === 0) return null;

  // 1. Try ID match (task.status could be an ID string, an ObjectId, or a populated object)
  const taskStatusId = normalizeId(task.status?._id) || normalizeId(task.status?.$oid) || normalizeId(task.status);

  let match = statuses.find(s => {
    const sId = normalizeId(s._id) || normalizeId(s.id);
    return sId === taskStatusId;
  });

  if (match) return match;

  // 2. Fallback to NAME match (legacy support for string-based statuses like "TODO", "IN_PROGRESS")
  const taskStatusName = (typeof task.status === "string"
    ? task.status
    : task.status?.name || ""
  ).toLowerCase().replace(/[\s_-]/g, "");

  match = statuses.find(s => 
    (s.name || "").toLowerCase().replace(/[\s_-]/g, "") === taskStatusName
  );

  return match || null;
};

/**
 * Filters out tasks that are marked as drafts.
 */
export const filterVisibleTasks = (tasks: any[]) => {
  return (tasks || []).filter(task => !task.isDraft);
};
