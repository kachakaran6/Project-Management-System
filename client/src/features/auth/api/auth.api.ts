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

  updateMe: async (payload: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ApiResponse<{ user: import("@/types/user.types").UserWithRole }>> => {
    const response = await api.patch<ApiResponse<{ user: import("@/types/user.types").UserWithRole }>>(
      "/auth/me",
      payload,
    );
    return response.data;
  },

  sendOtp: async (email: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>("/auth/send-otp", { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<ApiResponse<{ user: any }>> => {
    const response = await api.post<ApiResponse<{ user: any }>>("/auth/verify-otp", { email, otp });
    return response.data;
  },

  requestOrganizationAccess: async (payload?: {
    requestedRole?: "ADMIN";
    note?: string;
  }): Promise<
    ApiResponse<{
      status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
      requestedRole?: string | null;
      requestedAt?: string | null;
      reviewedAt?: string | null;
      note?: string | null;
    }>
  > => {
    const response = await api.post<
      ApiResponse<{
        status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
        requestedRole?: string | null;
        requestedAt?: string | null;
        reviewedAt?: string | null;
        note?: string | null;
      }>
    >("/auth/request-organization-access", payload ?? { requestedRole: "ADMIN" });
    return response.data;
  },

  getOrganizationAccessStatus: async (): Promise<
    ApiResponse<{
      status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
      requestedRole?: string | null;
      requestedAt?: string | null;
      reviewedAt?: string | null;
      note?: string | null;
      currentRole?: string | null;
    }>
  > => {
    const response = await api.get<
      ApiResponse<{
        status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
        requestedRole?: string | null;
        requestedAt?: string | null;
        reviewedAt?: string | null;
        note?: string | null;
        currentRole?: string | null;
      }>
    >("/auth/organization-access-status");
    return response.data;
  },
};
