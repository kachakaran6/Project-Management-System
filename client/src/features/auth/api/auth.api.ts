import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";
import {
  LoginInput,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  SignupInput,
} from "@/types/auth.types";

export const authApi = {
  login: async (
    credentials: LoginInput,
  ): Promise<ApiResponse<LoginResponse>> => {
    const response = await api.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      credentials,
    );
    return response.data;
  },

  register: async (
    payload: SignupInput,
  ): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.post<ApiResponse<{ id: string }>>(
      "/auth/register",
      payload,
    );
    return response.data;
  },

  me: async (): Promise<ApiResponse<MeResponse>> => {
    const response = await api.get<ApiResponse<MeResponse>>("/auth/me");
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<RefreshResponse>> => {
    const response =
      await api.post<ApiResponse<RefreshResponse>>("/auth/refresh");
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>("/auth/logout");
    return response.data;
  },
  
  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (payload: any): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>("/auth/reset-password", payload);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<ApiResponse<null>> => {
    const response = await api.get<ApiResponse<null>>(`/auth/verify-email?token=${token}`);
    return response.data;
  },
};
