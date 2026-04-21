export type ActivityEntityType =
  | 'TASK'
  | 'PROJECT'
  | 'TEAM'
  | 'USER'
  | 'WORKSPACE'
  | 'ORGANIZATION'
  | 'COMMENT'
  | 'SYSTEM';

export interface ActivityActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface ActivityLogEntry {
  _id: string;
  organizationId: string;
  userId: string;
  targetUserId?: string;
  action: string;
  entityType: ActivityEntityType | string;
  entityId: string;
  entityName: string;
  message?: string;
  module?: string;
  source?: 'activity' | 'legacy';
  metadata: {
    fieldChanged?: string;
    oldValue?: unknown;
    newValue?: unknown;
    projectName?: string;
    resourceId?: string;
    resourceType?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  user: ActivityActor;
  targetUser?: ActivityActor;
  projectName?: string;
}

export interface ActivityLogFilters {
  userId?: string;
  query?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogListResult {
  items: ActivityLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNextPage: boolean;
  };
}
