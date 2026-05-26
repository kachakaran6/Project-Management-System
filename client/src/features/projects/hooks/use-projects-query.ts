
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/hooks/useAppSelector";


import { projectApi } from "@/features/projects/api/project.api";
import { CreateProjectInput, ProjectFilters } from "@/types/project.types";

export const projectsQueryKeys = {
  all: (orgId?: string | null) => ["projects", orgId] as const,
  list: (filters: ProjectFilters, orgId?: string | null) => ["projects", orgId, filters] as const,
  detail: (id: string, orgId?: string | null) => ["projects", orgId, "detail", id] as const,
  linkedPages: (id: string) => ["projects", "detail", id, "pages"] as const,
};


export function useProjectsQuery(filters: ProjectFilters = {}) {
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: projectsQueryKeys.list(filters, activeOrgId),
    queryFn: () => projectApi.getProjects(filters),
    staleTime: 30_000,
    enabled: !!activeOrgId,
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
  const { activeOrgId } = useAppSelector((state) => state.auth);
  return useQuery({
    queryKey: projectsQueryKeys.detail(id, activeOrgId),
    queryFn: () => projectApi.getProject(id),
    enabled: enabled && Boolean(id) && !!activeOrgId,
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

export function useProjectLinkedPagesQuery(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectsQueryKeys.linkedPages(projectId),
    queryFn: () => projectApi.getLinkedPages(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 10_000,
  });
}

export function useAttachProjectPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, pageId }: { projectId: string; pageId: string }) =>
      projectApi.attachPage(projectId, pageId),
    onSuccess: async (_, { projectId }) => {
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.linkedPages(projectId),
      });
    },
  });
}

export function useDetachProjectPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, pageId }: { projectId: string; pageId: string }) =>
      projectApi.detachPage(projectId, pageId),
    onSuccess: async (_, { projectId }) => {
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.linkedPages(projectId),
      });
    },
  });
}
