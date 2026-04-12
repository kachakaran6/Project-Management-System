"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pageApi } from "@/features/pages/api/page.api";
import {
  CreatePageInput,
  PageFilters,
  UpdatePageInput,
} from "@/types/page.types";

export const pagesQueryKeys = {
  all: ["pages"] as const,
  list: (filters: PageFilters) => ["pages", "list", filters] as const,
  detail: (id: string) => ["pages", "detail", id] as const,
};

export function usePagesQuery(filters: PageFilters = {}) {
  return useQuery({
    queryKey: pagesQueryKeys.list(filters),
    queryFn: () => pageApi.getPages(filters),
    staleTime: 15_000,
  });
}

export function usePageQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: pagesQueryKeys.detail(id),
    queryFn: () => pageApi.getPage(id),
    enabled: enabled && Boolean(id),
    staleTime: 10_000,
  });
}

export function useCreatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePageInput) => pageApi.createPage(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pagesQueryKeys.all });
    },
  });
}

export function useUpdatePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePageInput }) =>
      pageApi.updatePage(id, data),
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(pagesQueryKeys.detail(variables.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["pages", "list"],
        }),
      ]);
    },
  });
}

export function useDeletePageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pageApi.deletePage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pagesQueryKeys.all });
    },
  });
}

export function useExportPagePdfMutation() {
  return useMutation({
    mutationFn: (id: string) => pageApi.exportPagePdf(id),
  });
}
