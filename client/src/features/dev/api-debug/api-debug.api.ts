import { api } from "@/lib/api/axios-instance";

export interface ApiDebugRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  payload?: unknown;
}

export interface ApiDebugResponse {
  status: number;
  durationMs: number;
  data: unknown;
}

export const apiDebugApi = {
  async execute(request: ApiDebugRequest): Promise<ApiDebugResponse> {
    const endpoint = request.endpoint.startsWith("/")
      ? request.endpoint
      : `/${request.endpoint}`;

    const started = performance.now();

    const response = await api.request({
      method: request.method,
      url: endpoint,
      data: request.payload,
    });

    return {
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      data: response.data,
    };
  },
};
