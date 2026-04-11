import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import {
  AssignTaskUsersInput,
  CreateTaskInput,
  Task,
  TaskFilters,
  UpdateTaskInput,
} from "@/types/task.types";

export const taskApi = {
  getTasks: async (
    filters: TaskFilters = {},
  ): Promise<ApiResponse<PaginatedResult<Task>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<Task>>>(
      "/tasks",
      { params: filters },
    );
    return response.data;
  },

  getTask: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: CreateTaskInput): Promise<ApiResponse<Task>> => {
    const response = await api.post<ApiResponse<Task>>("/tasks", data);
    return response.data;
  },

  updateTask: async (
    id: string,
    data: UpdateTaskInput,
  ): Promise<ApiResponse<Task>> => {
    const response = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, data);
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
};
