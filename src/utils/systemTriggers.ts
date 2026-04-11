import { logInfo } from '../services/logService.js';
import Notification from '../models/Notification.js';
import OrganizationMember from '../models/OrganizationMember.js';

interface ActivityParams {
  userId: any;
  organizationId?: any;
  workspaceId?: any;
  projectId?: any;
  resourceId?: any; // ID of the Task, Project, etc.
  resourceType?: string; // 'Task', 'Project', 'Workspace'
  action: string; // 'CREATE_PROJECT', 'DELETE_TASK', etc.
  metadata?: Record<string, any>;
  message?: string;
  status?: 'SUCCESS' | 'FAILURE';
}

/**
 * Log a system activity (New Observability Wrapper)
 */
export const logActivity = async (params: ActivityParams) => {
  const { 
    userId, 
    action, 
    resourceType, 
    resourceId, 
    message,
    status = 'SUCCESS',
    metadata = {} 
  } = params;

  // Build human readable message if not provided
  const logMessage = message || `${action.replace(/_/g, ' ')} ${resourceType ? `on ${resourceType}` : ''}`;

  await logInfo(logMessage, {
    userId,
    action,
    status,
    metadata: {
      ...metadata,
      resourceType,
      resourceId,
      organizationId: params.organizationId,
      workspaceId: params.workspaceId,
      projectId: params.projectId
    }
  });
};

/**
 * Trigger notification to specific users
 */
export const triggerNotification = async ({
  userIds,
  organizationId,
  actorId,
  type,
  message,
  resourceId,
  resourceType
}: {
  userIds: any[];
  organizationId: any;
  actorId: any;
  type: any;
  message: any;
  resourceId: any;
  resourceType: any;
}) => {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      organizationId,
      actorId,
      type,
      message,
      resourceId,
      resourceType
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Notification trigger failed:', error);
  }
};

/**
 * Notify all organization admins/members
 */
export const notifyOrgMembers = async (organizationId: any, params: any) => {
  const members = await OrganizationMember.find({ organizationId, isActive: true }).select('userId');
  const userIds = members.map((m: any) => m.userId);
  await triggerNotification({ ...params, userIds, organizationId });
};
