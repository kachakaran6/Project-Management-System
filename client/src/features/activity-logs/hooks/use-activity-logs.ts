import { useQuery } from '@tanstack/react-query';

import { activityLogsApi } from '../api/activity-logs.api';
import { ActivityLogFilters } from '../types/activity-log.types';

export const activityLogsQueryKeys = {
  all: ['activity-logs'] as const,
  list: (filters: ActivityLogFilters) => ['activity-logs', filters] as const,
};

export function useActivityLogsQuery(filters: ActivityLogFilters, enabled = true) {
  return useQuery({
    queryKey: activityLogsQueryKeys.list(filters),
    queryFn: () => activityLogsApi.getActivityLogs(filters),
    enabled,
    staleTime: 15_000,
  });
}
