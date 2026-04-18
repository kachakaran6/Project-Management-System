import { adminApi } from "@/features/admin/api/admin.api";

const baseApiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1";

export interface ClientSystemInfo {
  userAgent: string;
  language: string;
  platform: string;
  online: boolean;
  cores: number | null;
  memoryGb: number | null;
  timestamp: string;
}

export const systemApi = {
  async getHealth() {
    return adminApi.getSystemHealth(baseApiUrl);
  },

  getClientInfo(): ClientSystemInfo {
    if (typeof window === "undefined") {
      return {
        userAgent: "server-render",
        language: "unknown",
        platform: "unknown",
        online: true,
        cores: null,
        memoryGb: null,
        timestamp: new Date().toISOString(),
      };
    }

    const nav = window.navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      userAgentData?: { platform?: string };
    };

    return {
      userAgent: nav.userAgent,
      language: nav.language,
      platform: nav.userAgentData?.platform || nav.platform || "unknown",
      online: nav.onLine,
      cores: nav.hardwareConcurrency ?? null,
      memoryGb: nav.deviceMemory ?? null,
      timestamp: new Date().toISOString(),
    };
  },
};
