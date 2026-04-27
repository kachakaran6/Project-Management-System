"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { githubApi } from "@/features/projects/api/github.api";

const LIMIT = 20;

export const githubActivityQueryKeys = {
  all: ["github-activity"] as const,
  project: (projectId: string) => ["github-activity", projectId] as const,
};

export function useProjectGithubActivity(projectId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: githubActivityQueryKeys.project(projectId),
    queryFn: ({ pageParam = 1 }) =>
      githubApi.getProjectActivity(projectId, { page: pageParam as number, limit: LIMIT }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: enabled && Boolean(projectId),
    staleTime: 30_000,
  });
}
