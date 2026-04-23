import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectResourcesApi, CreateResourceInput } from "../api/project-resources.api";
import { toast } from "sonner";

export const resourceQueryKeys = {
  all: ["project-resources"] as const,
  list: (projectId: string) => ["project-resources", "list", projectId] as const,
  detail: (projectId: string, resourceId: string) => ["project-resources", "detail", projectId, resourceId] as const,
};

export function useProjectResourcesQuery(projectId: string) {
  return useQuery({
    queryKey: resourceQueryKeys.list(projectId),
    queryFn: () => projectResourcesApi.getResources(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectResourceDetailQuery(projectId: string, resourceId: string, enabled = false) {
  return useQuery({
    queryKey: resourceQueryKeys.detail(projectId, resourceId),
    queryFn: () => projectResourcesApi.getResourceById(projectId, resourceId),
    enabled: Boolean(projectId) && Boolean(resourceId) && enabled,
    staleTime: 0, // Always fetch fresh for sensitive data
  });
}

export function useCreateResourceMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateResourceInput) => projectResourcesApi.createResource(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceQueryKeys.list(projectId) });
      toast.success("Resource added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add resource");
    },
  });
}

export function useUpdateResourceMutation(projectId: string, resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateResourceInput>) => 
      projectResourcesApi.updateResource(projectId, resourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: resourceQueryKeys.detail(projectId, resourceId) });
      toast.success("Resource updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update resource");
    },
  });
}

export function useDeleteResourceMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) => projectResourcesApi.deleteResource(projectId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceQueryKeys.list(projectId) });
      toast.success("Resource deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete resource");
    },
  });
}
