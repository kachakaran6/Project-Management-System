import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import {
  AssignTaskUsersInput,
  CreateTaskInput,
  Task,
  TaskDraftFilters,
  TaskDraftInput,
  TaskFilters,
  UpdateTaskInput,
  TaskStatusHistory,
} from "@/types/task.types";


export const taskApi = {
  getTasks: async (
    filters: TaskFilters = {},
    config: any = {}
  ): Promise<ApiResponse<PaginatedResult<Task>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Task>>>(
      "/tasks",
      { ...config, params: filters },
    );
    return response.data;
  },

  getTask: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: CreateTaskInput | FormData): Promise<ApiResponse<Task>> => {
    const config = data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
    const response = await api.post<ApiResponse<Task>>("/tasks", data, config);
    return response.data;
  },

  getDrafts: async (
    filters: TaskDraftFilters = {},
  ): Promise<ApiResponse<PaginatedResult<Task>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Task>>>(
      "/tasks/drafts",
      { params: filters },
    );
    return response.data;
  },

  createDraft: async (data: TaskDraftInput, config?: import("axios").AxiosRequestConfig): Promise<ApiResponse<Task>> => {
    const response = await api.post<ApiResponse<Task>>("/tasks/drafts", data, config);
    return response.data;
  },

  updateDraft: async (
    id: string,
    data: TaskDraftInput,
    config?: import("axios").AxiosRequestConfig
  ): Promise<ApiResponse<Task>> => {
    const response = await api.patch<ApiResponse<Task>>(`/tasks/drafts/${id}`, data, config);
    return response.data;
  },

  publishDraft: async (
    id: string,
    data: CreateTaskInput | FormData,
  ): Promise<ApiResponse<Task>> => {
    const config = data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
    const response = await api.post<ApiResponse<Task>>(`/tasks/drafts/${id}/publish`, data, config);
    return response.data;
  },

  deleteDraft: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/tasks/drafts/${id}`);
    return response.data;
  },

  updateTask: async (
    id: string,
    data: UpdateTaskInput | FormData,
  ): Promise<ApiResponse<Task>> => {
    const config = data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
    const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, data, config);
    return response.data;
  },

  changeStatus: async (
    id: string,
    status: Task["status"],
  ): Promise<ApiResponse<Task>> => {
    const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, {
      status,
    });
    return response.data;
  },

  assignUsers: async (
    id: string,
    data: AssignTaskUsersInput,
  ): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(
      `/tasks/${id}/assign`,
      data,
    );
    return response.data;
  },

  deleteTask: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/tasks/${id}`);
    return response.data;
  },
  getStatusHistory: async (id: string): Promise<ApiResponse<TaskStatusHistory[]>> => {
    const response = await api.get<ApiResponse<TaskStatusHistory[]>>(`/tasks/${id}/status-history`);
    return response.data;
  },

  getGlobalStatusHistory: async (params: any = {}): Promise<ApiResponse<PaginatedResult<TaskStatusHistory>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<TaskStatusHistory>>>(`/tasks/status-history/all`, { params });
    return response.data;
  },

  // Task ↔ Pages Integration
  getLinkedPages: async (taskId: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/tasks/${taskId}/pages`);
    return response.data;
  },

  attachPage: async (taskId: string, pageId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/tasks/${taskId}/pages/${pageId}`);
    return response.data;
  },

  detachPage: async (taskId: string, pageId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/tasks/${taskId}/pages/${pageId}`);
    return response.data;
  },

  createAndAttachPage: async (taskId: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.post(`/tasks/${taskId}/pages/create`, data);
    return response.data;
  },

  saveUserOrder: async (projectId: string, statusId: string, taskIds: string[]): Promise<ApiResponse<null>> => {
    const response = await api.post(`/tasks/user-order`, { projectId, statusId, taskIds });
    return response.data;
  },

  searchTaskById: async (taskId: string): Promise<ApiResponse<Task>> => {
    const response = await api.get<ApiResponse<Task>>(`/tasks/by-id/${taskId}`);
    return response.data;
  },

  getTasksByProject: async (
    projectId: string,
    filters: TaskFilters = {}
  ): Promise<ApiResponse<PaginatedResult<Task>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Task>>>(
      `/tasks/project/${projectId}`,
      { params: filters }
    );
    return response.data;
  },

  searchTasks: async (
    q: string,
    filters: TaskFilters = {}
  ): Promise<ApiResponse<PaginatedResult<Task>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Task>>>(
      `/tasks/search/global`,
      { params: { ...filters, q } }
    );
    return response.data;
  },
};


