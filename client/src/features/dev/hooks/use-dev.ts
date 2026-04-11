"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  apiDebugApi,
  ApiDebugRequest,
} from "@/features/dev/api-debug/api-debug.api";
import { logsApi } from "@/features/dev/logs/logs.api";
import { systemApi } from "@/features/dev/system/system.api";

const devQueryKeys = {
  apiLogs: ["dev", "api-logs"] as const,
  serverLogs: ["dev", "server-logs"] as const,
  systemHealth: ["dev", "system-health"] as const,
  clientInfo: ["dev", "client-info"] as const,
};

export function useApiLogsQuery() {
  return useQuery({
    queryKey: devQueryKeys.apiLogs,
    queryFn: () => logsApi.getApiLogs(),
    refetchInterval: 4000,
  });
}

export function useServerLogsQuery() {
  return useQuery({
    queryKey: devQueryKeys.serverLogs,
    queryFn: () => logsApi.getServerLogs(),
    refetchInterval: 8000,
  });
}

export function useSystemInfoQuery() {
  return useQuery({
    queryKey: devQueryKeys.systemHealth,
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 20000,
  });
}

export function useClientInfoQuery() {
  return useQuery({
    queryKey: devQueryKeys.clientInfo,
    queryFn: () => Promise.resolve(systemApi.getClientInfo()),
    staleTime: Infinity,
  });
}

export function useClearApiLogsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logsApi.clearApiLogs(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: devQueryKeys.apiLogs });
    },
  });
}

export function useApiDebugMutation() {
  return useMutation({
    mutationFn: (request: ApiDebugRequest) => apiDebugApi.execute(request),
  });
}
