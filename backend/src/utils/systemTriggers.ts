import { logInfo } from '../services/logService.js';
import Notification from '../models/Notification.js';
import OrganizationMember from '../models/OrganizationMember.js';
import { emitToUsers } from '../realtime/socket.server.js';
import { SOCKET_EVENTS } from '../realtime/socket.events.js';
import { NOTIFICATION_TYPES } from '../constants/index.js';

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
    const uniqueUserIds = [...new Set(userIds.map((userId) => String(userId)))];
    const validUserIds = organizationId
      ? await OrganizationMember.find({
          organizationId,
          userId: { $in: uniqueUserIds },
          isActive: true
        }).distinct('userId')
      : uniqueUserIds;

    const titleMap: Record<string, string> = {
      [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'Task assigned',
      [NOTIFICATION_TYPES.TASK_UPDATED]: 'Task updated',
      [NOTIFICATION_TYPES.COMMENT_ADDED]: 'New comment',
      [NOTIFICATION_TYPES.MENTION]: 'You were mentioned',
      [NOTIFICATION_TYPES.PROJECT_INVITE]: 'Project invitation'
    };

    const link = resourceType === 'Task' && resourceId ? `/tasks/${resourceId}` : resourceType === 'Project' && resourceId ? `/projects/${resourceId}` : undefined;

    const notifications = validUserIds.map((recipientId) => ({
      recipientId,
      organizationId,
      senderId: actorId,
      type,
      title: titleMap[type] || 'Notification',
      message,
      link,
      metadata: {
        resourceId,
        resourceType,
      },
      resourceId,
      resourceType
    }));

    if (notifications.length === 0) {
      return [];
    }

    const createdNotifications = await Notification.insertMany(notifications);
    emitToUsers(validUserIds, SOCKET_EVENTS.NOTIFICATION_NEW, createdNotifications);
    return createdNotifications;
  } catch (error) {
    console.error('Notification trigger failed:', error);
    return [];
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
