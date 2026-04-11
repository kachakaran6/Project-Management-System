import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import { User, UserListItem, UserWithRole } from "@/types/user.types";

export const userApi = {
  getProfile: async (): Promise<
    ApiResponse<{ user: UserWithRole; organizationId?: string; role?: string }>
  > => {
    const response =
      await api.get<
        ApiResponse<{
          user: UserWithRole;
          organizationId?: string;
          role?: string;
        }>
      >("/auth/me");
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>("/users/profile", data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post<ApiResponse<{ url: string }>>(
      "/users/avatar",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  listUsers: async (): Promise<ApiResponse<UserListItem[]>> => {
    const response = await api.get<ApiResponse<UserListItem[]>>("/admin/users");
    return response.data;
  },
};
