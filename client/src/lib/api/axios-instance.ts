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
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5001/api/v1" : "/api/v1");

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshingPromise: Promise<string | null> | null = null;
const authChannel = typeof window !== "undefined" ? new BroadcastChannel("auth_refresh") : null;

if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data.type === "REFRESH_STARTED") {
      // If another tab started refreshing, we just wait for the result
      // But we can't easily share the promise itself across processes
      // So we'll trigger a refresh check or just let the interceptor handle the 401
    } else if (event.data.type === "REFRESH_SUCCESS") {
      useAuthStore.getState().setAccessToken(event.data.accessToken);
    }
  };
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshingPromise) {
    return refreshingPromise;
  }

  refreshingPromise = api
    .post<ApiResponse<RefreshResponse>>("/auth/refresh", {}, { withCredentials: true })
    .then((response) => {
      const token = response.data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);

      // Notify other tabs
      authChannel?.postMessage({ type: "REFRESH_SUCCESS", accessToken: token });

      return token;
    })
    .catch((error) => {
      if (error.response?.status === 401) {
        const { isAuthenticated, clearAuth } = useAuthStore.getState();
        if (isAuthenticated) {
          toast.error("Session expired. Please sign in again.");
        }
        clearAuth();
      }
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

    // Comprehensive logging of outgoing requests 
    if (import.meta.env.DEV) {
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
    const isLoginOrRegister =
      requestUrl.startsWith("/auth/login") ||
      requestUrl.startsWith("/auth/register");

    // 1. Handle Network Errors (Render cold starts, timeout, offline)
    if (!error.response) {
      const isTimeout = error.code === "ECONNABORTED" || error.message.includes("timeout");
      const errorMsg = isTimeout
        ? "Request timed out. The server might be waking up or under heavy load."
        : "Network Error: The API server is unreachable. Please check your connection.";

      console.error("[API NETWORK ERROR]", {
        message: error.message,
        code: error.code,
        url: originalRequest?.baseURL ? (originalRequest.baseURL + (originalRequest.url || "")) : originalRequest?.url,
      });

      // DO NOT clearAuth() here. Just notify the user.
      toast.error(errorMsg);
      return Promise.reject(error);
    }

    logApiError(
      error.config?.method ?? "GET",
      error.config?.url ?? "",
      status,
      error.response?.data || error.message,
    );

    // 2. Handle 401 Unauthorized (Token expired)
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
        // If refresh failed, reject original request
        return Promise.reject(err);
      }
    }

    // 3. Handle Other Errors
    if (status === 403) {
      const message = (error.response?.data as any)?.message || "Permission denied for this action.";
      toast.error(message);
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again shortly.");
    }
    // Note: 401 on non-retryable requests or failed refresh is handled by throwing or auth store state

    return Promise.reject(error);
  },
);
