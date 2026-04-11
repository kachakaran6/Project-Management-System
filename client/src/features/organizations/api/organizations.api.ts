import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import { Organization } from "@/types/organization.types";

export const organizationsApi = {
  create: async (payload: { name: string; description?: string }): Promise<ApiResponse<Organization>> => {
    const response = await api.post<ApiResponse<Organization>>("/organizations", payload);
    return response.data;
  },

  getMy: async (): Promise<ApiResponse<Organization[]>> => {
    const response = await api.get<ApiResponse<Organization[]>>("/organizations/my");
    return response.data;
  }
};
