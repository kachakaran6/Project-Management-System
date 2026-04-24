import apiClient from "@/services/apiClient";

export const authAPI = {
  login: (credentials: any) => apiClient.post("/auth/login", credentials),
  fetchMe: () => apiClient.get("/auth/me"),
  logout: () => apiClient.post("/auth/logout"),
};
