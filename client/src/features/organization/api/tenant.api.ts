import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import { Organization, OrganizationMembership } from "@/types/organization.types";

export const tenantApi = {
  create: async (data: { name: string; slug?: string }) => {
    const response = await api.post<ApiResponse<Organization>>("/organizations", data);
    return response.data;
  },

  listMy: async () => {
    const response = await api.get<ApiResponse<OrganizationMembership[]>>("/organizations/my");
    return response.data;
  },

  switch: async (organizationId: string) => {
    // This is handled by store and query invalidation on the frontend,
    // but we could have a backend endpoint if we want to log the switch
    return organizationId;
  },
};
