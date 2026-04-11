"use client";

import {
  useCreateProjectMutation,
  useProjectsQuery,
} from "@/features/projects/hooks/use-projects-query";
import { CreateProjectInput } from "@/types/project.types";

export function useProjects() {
  const projectsQuery = useProjectsQuery({ page: 1, limit: 50 });
  const createProjectMutation = useCreateProjectMutation();

  return {
    projects: projectsQuery.data?.data.items ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject: (data: CreateProjectInput) =>
      createProjectMutation.mutateAsync(data),
    isCreating: createProjectMutation.isPending,
  };
}
