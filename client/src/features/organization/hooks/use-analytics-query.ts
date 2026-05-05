import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import * as analyticsApi from "../api/analytics.api";

export const useUserAnalyticsSummaryQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-analytics-summary", userId],
    queryFn: () => analyticsApi.getUserAnalyticsSummary(userId!),
    enabled: !!userId,
  });
};

export const useUserActivitiesQuery = (userId: string | undefined, params: any = {}) => {
  return useQuery({
    queryKey: ["user-activities", userId, params],
    queryFn: () => analyticsApi.getUserActivities(userId!, params),
    enabled: !!userId,
  });
};

export const useInfiniteUserActivitiesQuery = (userId: string | undefined, limit: number = 20) => {
  return useInfiniteQuery({
    queryKey: ["user-activities-infinite", userId],
    queryFn: ({ pageParam = 1 }) => analyticsApi.getUserActivities(userId!, { page: pageParam, limit }),
    getNextPageParam: (lastPage: any) => {
      const { pagination } = lastPage.data || {};
      return pagination?.hasNextPage ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
  });
};

export const useUserSessionsQuery = (userId: string | undefined, params: any = {}) => {
  return useQuery({
    queryKey: ["user-sessions", userId, params],
    queryFn: () => analyticsApi.getUserSessions(userId!, params),
    enabled: !!userId,
  });
};
