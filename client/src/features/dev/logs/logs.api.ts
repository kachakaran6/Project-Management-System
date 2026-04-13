import { api } from "@/lib/api/axios-instance";
import { ApiLogEntry, clearApiLogs, getApiLogs } from "@/lib/api/api-debug";

export interface AppLogEntry {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  context?: unknown;
}

export const logsApi = {
  async getApiLogs(): Promise<ApiLogEntry[]> {
    return getApiLogs();
  },

  async clearApiLogs(): Promise<void> {
    clearApiLogs();
  },

  async getServerLogs(): Promise<AppLogEntry[]> {
    try {
      const response = await api.get("/admin/logs");
      return response.data?.data ?? [];
    } catch {
      return [];
    }
  },
};
