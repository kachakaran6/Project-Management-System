import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export type ResourceType = 'link' | 'credential' | 'note';

export interface ProjectResource {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  type: ResourceType;
  url?: string;
  username?: string;
  password?: string;
  description?: string;
  tags?: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateResourceInput = {
  title: string;
  type: ResourceType;
  url?: string;
  username?: string;
  password?: string;
  description?: string;
  tags?: string[];
};

export const projectResourcesApi = {
  getResources: async (projectId: string): Promise<ApiResponse<ProjectResource[]>> => {
    const response = await api.get(`/project-resources/${projectId}/resources`);
    return response.data;
  },

  getResourceById: async (projectId: string, resourceId: string): Promise<ApiResponse<ProjectResource>> => {
    const response = await api.get(`/project-resources/${projectId}/resources/${resourceId}`);
    return response.data;
  },

  createResource: async (projectId: string, data: CreateResourceInput): Promise<ApiResponse<ProjectResource>> => {
    const response = await api.post(`/project-resources/${projectId}/resources`, data);
    return response.data;
  },

  updateResource: async (projectId: string, resourceId: string, data: Partial<CreateResourceInput>): Promise<ApiResponse<ProjectResource>> => {
    const response = await api.patch(`/project-resources/${projectId}/resources/${resourceId}`, data);
    return response.data;
  },

  deleteResource: async (projectId: string, resourceId: string): Promise<ApiResponse<{ success: boolean }>> => {
    const response = await api.delete(`/project-resources/${projectId}/resources/${resourceId}`);
    return response.data;
  }
};
