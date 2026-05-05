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

  getDefaultStatus: async (): Promise<ApiResponse<{ defaultTaskStatus: string | null }>> => {
    const response = await api.get<ApiResponse<{ defaultTaskStatus: string | null }>>("/settings/default-status");
    return response.data;
  },

  updateDefaultStatus: async (defaultTaskStatus: string | null): Promise<ApiResponse<{ defaultTaskStatus: string | null }>> => {
    const response = await api.put<ApiResponse<{ defaultTaskStatus: string | null }>>("/settings/default-status", { defaultTaskStatus });
    return response.data;
  },

  getSuggestionSettings: async (): Promise<ApiResponse<{ taskSuggestionsEnabled: boolean }>> => {
    const response = await api.get<ApiResponse<{ taskSuggestionsEnabled: boolean }>>("/settings/suggestions");
    return response.data;
  },

  updateSuggestionSettings: async (enabled: boolean): Promise<ApiResponse<{ taskSuggestionsEnabled: boolean }>> => {
    const response = await api.put<ApiResponse<{ taskSuggestionsEnabled: boolean }>>("/settings/suggestions", { enabled });
    return response.data;
  },
};

