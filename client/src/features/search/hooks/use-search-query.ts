"use client";

import { useQuery } from "@tanstack/react-query";

import { searchApi } from "@/features/search/api/search.api";
import { SearchFilters } from "@/types/search.types";

export const searchQueryKeys = {
  all: ["search"] as const,
  list: (filters: SearchFilters) => ["search", filters] as const,
};

export function useSearchQuery(filters: SearchFilters, enabled = true) {
  return useQuery({
    queryKey: searchQueryKeys.list(filters),
    queryFn: () => searchApi.search(filters),
    enabled: enabled && filters.q.trim().length >= 2,
    staleTime: 10_000,
  });
}