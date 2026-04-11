import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult, QueryFilters } from "@/types/api.types";
import { CreateWorkspaceInput, Workspace } from "@/types/organization.types";

export const orgApi = {
  getOrganizations: async (
    filters: QueryFilters = {},
  ): Promise<ApiResponse<PaginatedResult<Workspace>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Workspace>>>(
      "/workspaces",
      {
        params: filters,
      },
    );
    return response.data;
  },

  createOrganization: async (
    data: CreateWorkspaceInput,
  ): Promise<ApiResponse<Workspace>> => {
    const response = await api.post<ApiResponse<Workspace>>(
      "/workspaces",
      data,
    );
    return response.data;
  },

  getOrganizationById: async (id: string): Promise<ApiResponse<Workspace>> => {
    const response = await api.get<ApiResponse<Workspace>>(`/workspaces/${id}`);
    return response.data;
  },
};
