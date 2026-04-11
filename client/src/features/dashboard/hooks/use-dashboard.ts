"use client";

import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "@/features/dashboard/api/dashboard.api";

export const dashboardQueryKeys = {
  stats: ["dashboard", "stats"] as const,
  taskStats: ["dashboard", "task-stats"] as const,
  activity: ["dashboard", "activity"] as const,
};

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.stats,
    queryFn: dashboardApi.getDashboardStats,
    staleTime: 45_000,
  });
}

export function useTaskStatsQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.taskStats,
    queryFn: dashboardApi.getTaskStats,
    staleTime: 45_000,
  });
}

export function useActivityQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.activity,
    queryFn: dashboardApi.getActivity,
    staleTime: 20_000,
  });
}
