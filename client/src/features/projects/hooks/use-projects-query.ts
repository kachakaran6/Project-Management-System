"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { projectApi } from "@/features/projects/api/project.api";
import { CreateProjectInput, ProjectFilters } from "@/types/project.types";

export const projectsQueryKeys = {
  all: ["projects"] as const,
  list: (filters: ProjectFilters) => ["projects", filters] as const,
  detail: (id: string) => ["projects", "detail", id] as const,
};

export function useProjectsQuery(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectsQueryKeys.list(filters),
    queryFn: () => projectApi.getProjects(filters),
    staleTime: 30_000,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectInput) =>
      projectApi.createProject(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
    },
  });
}

export function useProjectQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: projectsQueryKeys.detail(id),
    queryFn: () => projectApi.getProject(id),
    enabled: enabled && Boolean(id),
    staleTime: 20_000,
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectInput> }) =>
      projectApi.updateProject(id, data),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKeys.detail(variables.id),
        }),
      ]);
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.deleteProject(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all });
    },
  });
}
