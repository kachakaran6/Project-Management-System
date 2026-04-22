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

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

// ─── Concurrency Control for Token Refresh ────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

/**
 * Process the queue of pending requests after a refresh attempt.
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

const authChannel = typeof window !== "undefined" ? new BroadcastChannel("auth_refresh") : null;

if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data.type === "REFRESH_SUCCESS") {
      useAuthStore.getState().setAccessToken(event.data.accessToken);
    }
  };
}

/**
 * Perform the actual token refresh call to the backend.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await api.post<ApiResponse<RefreshResponse>>("/auth/refresh", {}, { withCredentials: true });
    const token = response.data.data.accessToken;
    
    // Update local store
    useAuthStore.getState().setAccessToken(token);

    // Notify other tabs via BroadcastChannel
    authChannel?.postMessage({ type: "REFRESH_SUCCESS", accessToken: token });

    return token;
  } catch (error: any) {
    if (error.response?.status === 401) {
      const { isAuthenticated, clearAuth } = useAuthStore.getState();
      if (isAuthenticated) {
        toast.error("Session expired. Please sign in again.");
      }
      clearAuth();
    }
    return null;
  }
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

    // 1. Handle Network Errors
    if (!error.response) {
      const isTimeout = error.code === "ECONNABORTED" || error.message.includes("timeout");
      const errorMsg = isTimeout
        ? "Request timed out. The server might be waking up or under heavy load."
        : "Network Error: The API server is unreachable. Please check your connection.";

      toast.error(errorMsg);
      return Promise.reject(error);
    }

    logApiError(
      error.config?.method ?? "GET",
      error.config?.url ?? "",
      status,
      error.response?.data || error.message,
    );

    // 2. Handle 401 Unauthorized (Centralized Refresh Logic)
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint &&
      !isLoginOrRegister
    ) {
      // If a refresh is already in progress, add this request to the queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark the request as retried and start the refresh process
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = await refreshAccessToken();
        
        if (token) {
          isRefreshing = false;
          processQueue(null, token);
          
          originalRequest.headers.set("Authorization", `Bearer ${token}`);
          return api(originalRequest);
        } else {
          // If refresh failed and returned null
          isRefreshing = false;
          processQueue(new Error("Refresh failed"));
          return Promise.reject(error);
        }
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        return Promise.reject(refreshError);
      }
    }

    // 3. Handle Other Errors
    if (status === 403) {
      const message = (error.response?.data as any)?.message || "Permission denied for this action.";
      toast.error(message);
    } else if (status && status >= 500) {
      toast.error("Server error. Please try again shortly.");
    }

    return Promise.reject(error);
  },
);
