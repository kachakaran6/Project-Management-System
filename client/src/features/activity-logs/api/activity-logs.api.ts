import { api } from '@/lib/api/axios-instance';
import { ApiResponse } from '@/types/api.types';

import { ActivityLogFilters, ActivityLogListResult } from '../types/activity-log.types';

export const activityLogsApi = {
  async getActivityLogs(filters: ActivityLogFilters): Promise<ActivityLogListResult> {
    const response = await api.get<ApiResponse<ActivityLogListResult>>('/activity-logs', {
      params: filters,
    });

    const payload = response.data.data;

    return {
      items: payload?.items ?? [],
      pagination: {
        total: payload?.pagination?.total ?? 0,
        page: payload?.pagination?.page ?? 1,
        limit: payload?.pagination?.limit ?? 20,
        pages: payload?.pagination?.pages ?? 1,
        hasNextPage: payload?.pagination?.hasNextPage ?? false,
      },
    };
  },
};
