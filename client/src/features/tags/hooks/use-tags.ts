import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi, Tag } from "../api/tags.api";
import { toast } from "sonner";

export function useTagsQuery(orgId: string, wsId?: string) {
  return useQuery({
    queryKey: ["tags", orgId, wsId],
    queryFn: () => tagsApi.getTags(orgId, wsId),
    enabled: !!orgId
  });
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tagsApi.createTag,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag created");
    },
    onError: () => toast.error("Failed to create tag")
  });
}

export function useUpdateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tag> }) => tagsApi.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag updated");
    },
    onError: () => toast.error("Failed to update tag")
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tagsApi.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag deleted");
    },
    onError: () => toast.error("Failed to delete tag")
  });
}

export function useAssignTagsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagIds }: { taskId: string; tagIds: string[] }) => tagsApi.assignTags(taskId, tagIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    }
  });
}
