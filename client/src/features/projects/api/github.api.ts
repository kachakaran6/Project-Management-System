import { api } from "@/lib/api/axios-instance";

export interface GithubSettings {
  repoUrl: string;
  webhookSecret: string;
  autoStatusUpdate: boolean;
  isEnabled: boolean;
  hasAccessToken?: boolean; // server never returns the raw token
}

export interface GithubFullActivityItem {
  id: string;
  type: "commit" | "pr" | "branch";
  prState?: "open" | "closed" | "merged";
  title: string;
  description?: string;
  author: string;
  authorAvatar?: string;
  authorProfile?: string;
  url: string;
  hash?: string;
  prNumber?: number;
  createdAt: string;
  taskCode: string | null;
  taskId: string | null;
}

export type GithubFullActivityResponse = GithubFullActivityItem[];

export interface GitHubActivityItem {
  taskId: string;
  taskCode: string | null;
  taskTitle: string;
  type: "commit" | "pr" | "branch";
  url: string;
  message: string;
  author?: string;
  authorAvatar?: string;
  hash?: string;
  createdAt: string;
}

export interface GitHubActivityResponse {
  items: GitHubActivityItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const githubApi = {
  getSettings: async (projectId: string) => {
    const response = await api.get(`/github/settings/${projectId}`);
    return response.data;
  },
  updateSettings: async (projectId: string, settings: Partial<GithubSettings>) => {
    const response = await api.put(`/github/settings/${projectId}`, settings);
    return response.data;
  },
  getProjectActivity: async (
    projectId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ success: boolean; data: GitHubActivityResponse }> => {
    const response = await api.get(`/github/activity/${projectId}`, { params });
    return response.data;
  },
  getFullActivity: async (
    projectId: string,
    params: { page?: number; per_page?: number; type?: string } = {}
  ): Promise<{ success: boolean; data: GithubFullActivityResponse }> => {
    const response = await api.get(`/github/full-activity/${projectId}`, { params });
    return response.data;
  },
};
