import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import {
  CreateProjectInput,
  Project,
  ProjectFilters,
} from "@/types/project.types";

export const projectApi = {
  getProjects: async (
    filters: ProjectFilters = {},
  ): Promise<ApiResponse<PaginatedResult<Project>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Project>>>(
      "/projects",
      {
        params: filters,
      },
    );
    return response.data;
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (
    data: CreateProjectInput,
  ): Promise<ApiResponse<Project>> => {
    const response = await api.post<ApiResponse<Project>>("/projects", data);
    return response.data;
  },

  updateProject: async (
    id: string,
    data: Partial<Project>,
  ): Promise<ApiResponse<Project>> => {
    const response = await api.patch<ApiResponse<Project>>(
      `/projects/${id}`,
      data,
    );
    return response.data;
  },

  deleteProject: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },

  getLinkedPages: async (projectId: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/projects/${projectId}/pages`);
    return response.data;
  },

  attachPage: async (projectId: string, pageId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/projects/${projectId}/pages/${pageId}`);
    return response.data;
  },

  detachPage: async (projectId: string, pageId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/projects/${projectId}/pages/${pageId}`);
    return response.data;
  },
};
