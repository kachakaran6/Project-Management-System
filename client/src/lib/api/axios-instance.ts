import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

import {
  logApiError,
  logApiRequest,
  logApiResponse,
} from "@/lib/api/api-debug";
import { useAuthStore } from "@/store/auth-store";
import { ApiResponse } from "@/types/api.types";
import { RefreshResponse } from "@/types/auth.types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshingPromise: Promise<string | null> | null = null;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

async function refreshAccessToken(): Promise<string | null> {
  if (refreshingPromise) {
    return refreshingPromise;
  }

  refreshingPromise = api
    .post<ApiResponse<RefreshResponse>>("/auth/refresh")
    .then((response) => {
      const token = response.data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);
      return token;
    })
    .catch(() => {
      const { isAuthenticated, clearAuth } = useAuthStore.getState();
      if (isAuthenticated) {
        toast.error("Session expired. Please sign in again.");
      }
      clearAuth();
      return null;
    })
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, activeOrgId } = useAuthStore.getState();
    const requestUrl = config.url ?? "";
    const isAuthRoute = requestUrl.startsWith("/auth");

    if (accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (activeOrgId && !isAuthRoute) {
      config.headers.set("x-organization-id", activeOrgId);
    }

    // Comprehensive logging of outgoing requests (STEP 7)
    if (process.env.NODE_ENV === "development") {
      console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || "");
    }

    logApiRequest(config.method ?? "GET", config.url ?? "", config.data);
    return config;
  },
  (error: AxiosError) => {
    console.error("[API REQUEST ERROR]", error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    logApiResponse(
      response.config.method ?? "GET",
      response.config.url ?? "",
      response.status,
      response.data,
    );
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? "";
    const isRefreshEndpoint = requestUrl.startsWith("/auth/refresh");
    const isMeEndpoint = requestUrl.startsWith("/auth/me");
    const isLoginOrRegister =
      requestUrl.startsWith("/auth/login") ||
      requestUrl.startsWith("/auth/register");

    const { isAuthenticated } = useAuthStore.getState();

    // DIAGNOSIS: Handle "Network Error" (Connection refused, DNS failure, etc.)
    if (!error.response) {
      const isTimeout = error.code === "ECONNABORTED" || error.message.includes("timeout");
      const errorMsg = isTimeout 
        ? "Request timed out. The server might be waking up or under heavy load."
        : "Network Error: The API server is unreachable. Please check if the backend is running and the URL is correct.";
      
      console.error("[API NETWORK ERROR]", {
        message: error.message,
        code: error.code,
        url: originalRequest?.baseURL ? (originalRequest.baseURL + (originalRequest.url || "")) : originalRequest?.url,
        isProduction: process.env.NODE_ENV === "production"
      });

      toast.error(errorMsg);
      return Promise.reject(error);
    }

    logApiError(
      error.config?.method ?? "GET",
      error.config?.url ?? "",
      status,
      error.response?.data || error.message,
    );

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint &&
      !isLoginOrRegister
    ) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        if (token) {
          originalRequest.headers.set("Authorization", `Bearer ${token}`);
          return api(originalRequest);
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (status === 403) {
      const message = (error.response?.data as any)?.message || "Permission denied for this action.";
      toast.error(message);
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again shortly.");
    } else if (status === 401 && isAuthenticated && !isMeEndpoint) {
      toast.error("Session invalid. Please sign in.");
    }

    return Promise.reject(error);
  },
);
