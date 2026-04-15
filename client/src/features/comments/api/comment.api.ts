import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import {
  CreateCommentInput,
  TaskComment,
  UpdateCommentInput,
} from "@/types/comment.types";

export const commentApi = {
  getTaskComments: async (
    taskId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<PaginatedResult<TaskComment>>> => {
    const response = await api.get<ApiResponse<PaginatedResult<TaskComment>>>(
      `/tasks/${taskId}/comments`,
      { params },
    );
    return response.data;
  },

  createTaskComment: async (
    taskId: string,
    data: CreateCommentInput,
  ): Promise<ApiResponse<TaskComment>> => {
    const response = await api.post<ApiResponse<TaskComment>>(
      `/tasks/${taskId}/comments`,
      data,
    );
    return response.data;
  },

  updateComment: async (
    commentId: string,
    data: UpdateCommentInput,
  ): Promise<ApiResponse<TaskComment>> => {
    const response = await api.put<ApiResponse<TaskComment>>(
      `/comments/${commentId}`,
      data,
    );
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/comments/${commentId}`);
    return response.data;
  },
};
