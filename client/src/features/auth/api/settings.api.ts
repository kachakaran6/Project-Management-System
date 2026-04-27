import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export interface DefaultAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const settingsApi = {
  getDefaultAssignees: async (): Promise<ApiResponse<{ defaultAssignees: DefaultAssignee[] }>> => {
    const response = await api.get<ApiResponse<{ defaultAssignees: DefaultAssignee[] }>>("/settings/default-assignees");
    return response.data;
  },

  updateDefaultAssignees: async (assigneeIds: string[]): Promise<ApiResponse<{ defaultAssignees: DefaultAssignee[] }>> => {
    const response = await api.put<ApiResponse<{ defaultAssignees: DefaultAssignee[] }>>("/settings/default-assignees", { defaultAssignees: assigneeIds });
    return response.data;
  },
};
