import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { taskApi } from "@/features/tasks/api/task.api";
import { useDebounce } from "@/hooks/use-debounce";
import type { Task } from "@/types/task.types";

export type SimilarTaskSuggestion = {
  id: string;
  title: string;
  status: string;
  project: string;
  assignee: string;
  similarityScore: number;
  createdAt?: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function getTaskId(task: Task) {
  return String(task.id || (task as Task & { _id?: string })._id || "");
}

function getProjectName(task: Task) {
  const project = (task as Task & { projectId?: unknown }).projectId;
  if (typeof project === "string") return project;
  if (project && typeof project === "object") {
    const record = project as { name?: string; id?: string; _id?: string };
    return record.name || record.id || record._id || "Unknown";
  }
  return "Unknown";
}

function getProjectId(task: Task) {
  const project = (task as Task & { projectId?: unknown }).projectId;
  if (typeof project === "string") return project;
  if (project && typeof project === "object") {
    const record = project as { id?: string; _id?: string };
    return record.id || record._id || "";
  }
  return "";
}

function getAssigneeName(task: Task) {
  const primary = task.assigneeUsers?.[0];
  if (primary?.name) return primary.name;

  const assigneeData = (task as Task & {
    assignee?: { name?: string; firstName?: string; lastName?: string };
  }).assignee;

  if (!assigneeData) return "Unassigned";

  const fullName = [assigneeData.firstName, assigneeData.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || assigneeData.name || "Unassigned";
}

function getJaccardScore(queryTokens: string[], titleTokens: string[]) {
  if (queryTokens.length === 0 || titleTokens.length === 0) return 0;

  const querySet = new Set(queryTokens);
  const titleSet = new Set(titleTokens);
  let intersectionCount = 0;

  querySet.forEach((token) => {
    if (titleSet.has(token)) intersectionCount += 1;
  });

  const unionCount = new Set([...querySet, ...titleSet]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function computeSimilarity(task: Task, query: string, activeProjectId?: string) {
  const title = task.title || "";
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(title);

  if (!normalizedQuery || !normalizedTitle) return 0;

  const queryTokens = tokenize(normalizedQuery);
  const titleTokens = tokenize(normalizedTitle);

  const jaccard = getJaccardScore(queryTokens, titleTokens);
  const partialMatch = normalizedTitle.includes(normalizedQuery) ? 0.42 : 0;
  const reversePartial = normalizedQuery.includes(normalizedTitle) ? 0.1 : 0;
  const prefixMatch = normalizedTitle.startsWith(normalizedQuery) ? 0.16 : 0;

  let tokenPrefixScore = 0;
  queryTokens.forEach((token) => {
    if (titleTokens.some((titleToken) => titleToken.startsWith(token))) {
      tokenPrefixScore += 0.06;
    }
  });

  const sameProjectBoost =
    activeProjectId && getProjectId(task) === activeProjectId ? 0.09 : 0;

  const createdAtMs = task.createdAt ? new Date(task.createdAt).getTime() : 0;
  const now = Date.now();
  const ageDays = createdAtMs > 0 ? (now - createdAtMs) / (1000 * 60 * 60 * 24) : 365;
  const recencyBoost = Math.max(0, 0.08 - ageDays / 3000);

  const score =
    partialMatch +
    reversePartial +
    prefixMatch +
    jaccard * 0.4 +
    tokenPrefixScore +
    sameProjectBoost +
    recencyBoost;

  return Math.min(1, score);
}

export function useTaskDuplicateSuggestions(query: string, projectId?: string) {
  const debouncedQuery = useDebounce(query, 350);
  const normalizedQuery = useMemo(() => normalizeText(debouncedQuery), [debouncedQuery]);
  const canSearch = normalizedQuery.length >= 4;

  const suggestionsQuery = useQuery({
    queryKey: ["tasks", "duplicate-suggestions", normalizedQuery, projectId || "ALL"],
    queryFn: async () => {
      const response = await taskApi.getTasks({
        search: normalizedQuery,
        page: 1,
        limit: 60,
        projectId: projectId || undefined,
      });

      const ranked = (response.data.items || [])
        .map((task) => ({
          id: getTaskId(task),
          title: task.title || "Untitled task",
          status: task.status || "TODO",
          project: getProjectName(task),
          assignee: getAssigneeName(task),
          createdAt: task.createdAt,
          similarityScore: computeSimilarity(task, normalizedQuery, projectId),
        }))
        .filter((task) => task.similarityScore >= 0.2)
        .sort((a, b) => {
          if (b.similarityScore !== a.similarityScore) {
            return b.similarityScore - a.similarityScore;
          }

          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 5);

      return ranked;
    },
    enabled: canSearch,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    suggestions: suggestionsQuery.data ?? [],
    isLoading: suggestionsQuery.isFetching,
    normalizedQuery,
    canSearch,
  };
}
