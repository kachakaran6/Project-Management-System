import { api } from "@/lib/api/axios-instance";

export interface GithubSettings {
  repoUrl: string;
  webhookSecret: string;
  autoStatusUpdate: boolean;
  isEnabled: boolean;
}

export const githubApi = {
  getSettings: async (projectId: string) => {
    const response = await api.get(`/github/settings/${projectId}`);
    return response.data;
  },
  updateSettings: async (projectId: string, settings: Partial<GithubSettings>) => {
    const response = await api.put(`/github/settings/${projectId}`, settings);
    return response.data;
  }
};
