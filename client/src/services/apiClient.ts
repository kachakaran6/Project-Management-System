import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5001/api/v1" : "/api/v1");

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Crucial for cookies
});

// Request interceptor to attach JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for 401 handling & Refresh Fallback
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if refresh call itself fails with 401
    if (originalRequest.url?.includes("/auth/refresh")) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      window.dispatchEvent(new CustomEvent("auth-logout"));
      return Promise.reject(error);
    }

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 1. Check for Revoked Session (Token Version Mismatch)
      if (error.response?.data?.code === "SESSION_REVOKED") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.dispatchEvent(new CustomEvent("auth-logout"));
        toast.error("Your session has been revoked from another device. Please log in again.");
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      
      // If we have a fallback refreshToken in localStorage, use it explicitly
      // Note: If cookies are working, axios will also send the refreshToken cookie due to withCredentials: true
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, 
          { refreshToken }, // Explicitly send for fallback
          { withCredentials: true }
        );

        if (res.data?.success) {
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          
          localStorage.setItem("token", accessToken);
          if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
          
          // Notify the app (AuthProvider) to update Redux state
          window.dispatchEvent(new CustomEvent("auth-token-refreshed", { detail: accessToken }));

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // All refresh attempts failed
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.dispatchEvent(new CustomEvent("auth-logout"));
        
        // Inform user clearly
        toast.error("Session expired. Please log in again.");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
