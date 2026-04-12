import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import { SearchFilters, SearchResults } from "@/types/search.types";

export const searchApi = {
  search: async (filters: SearchFilters): Promise<ApiResponse<SearchResults>> => {
    const response = await api.get<ApiResponse<SearchResults>>("/search", {
      params: filters,
    });

    return response.data;
  },
};