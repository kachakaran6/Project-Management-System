import apiClient from "@/services/apiClient";

export const authAPI = {
  login: (credentials: any) => apiClient.post("/auth/login", credentials),
  fetchMe: () => apiClient.get("/auth/me"),
  logout: () => apiClient.post("/auth/logout"),
  logoutAll: () => apiClient.post("/auth/logout-all"),
  googleCallback: (code: string) => apiClient.post("/auth/google/callback", { code }),
  githubCallback: (code: string) => apiClient.post("/auth/github/callback", { code }),
};
