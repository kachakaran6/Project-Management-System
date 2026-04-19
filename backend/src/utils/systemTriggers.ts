import { logInfo } from '../services/logService.js';
import { createActivityLog } from '../services/activityLogService.js';
import Notification from '../models/Notification.js';
import OrganizationMember from '../models/OrganizationMember.js';
import { emitToUsers } from '../realtime/socket.server.js';
import { SOCKET_EVENTS } from '../realtime/socket.events.js';
import { NOTIFICATION_TYPES } from '../constants/index.js';
import * as telegramService from '../modules/notification/telegram.service.js';
import User from '../models/User.js';

import Organization from '../models/Organization.js';

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

  const normalizedAction = (() => {
    const actionKey = String(action || '').toUpperCase();
    const resource = String(resourceType || '').toUpperCase();

    if (actionKey === 'CREATE_PROJECT' || (actionKey === 'CREATE' && resource === 'PROJECT')) return 'PROJECT_CREATED';
    if (actionKey === 'UPDATE_PROJECT' || (actionKey === 'UPDATE' && resource === 'PROJECT')) return 'PROJECT_UPDATED';
    if (actionKey === 'DELETE_PROJECT' || (actionKey === 'DELETE' && resource === 'PROJECT')) return 'PROJECT_DELETED';

    if (actionKey === 'CREATE' && resource === 'TASK') return 'TASK_CREATED';
    if (actionKey === 'UPDATE' && resource === 'TASK') return 'TASK_UPDATED';
    if (actionKey === 'DELETE' && resource === 'TASK') return 'TASK_DELETED';
    if (actionKey === 'STATUS_CHANGE' && resource === 'TASK') return 'TASK_STATUS_UPDATED';
    if (actionKey === 'ASSIGN' && resource === 'TASK') return 'TASK_ASSIGNED';

    if (actionKey === 'COMMENT') return 'COMMENT_CREATED';
    if (actionKey === 'MEMBER_REMOVED') return 'MEMBER_REMOVED';
    if (actionKey === 'MEMBER_ROLE_CHANGED') return 'MEMBER_ROLE_CHANGED';
    if (actionKey === 'MEMBER_PERMISSIONS_CHANGED') return 'MEMBER_PERMISSIONS_CHANGED';

    return actionKey;
  })();

  if (params.organizationId && userId && action && resourceType && resourceId) {
    try {
      await createActivityLog({
        userId: String(userId),
        organizationId: String(params.organizationId),
        action: normalizedAction,
        entityType: String(resourceType).toUpperCase() as any,
        entityId: String(resourceId),
        entityName: String(metadata?.entityName || metadata?.name || metadata?.title || message || resourceType || 'Unknown'),
        metadata: {
          ...metadata,
          resourceType,
          resourceId,
          organizationId: params.organizationId,
          workspaceId: params.workspaceId,
          projectId: params.projectId,
        },
      });

      // Telegram Broadcast Logic (Multi-tenant)
      const telegramEventMap: Record<string, string> = {
        'TASK_CREATED': 'TASK_CREATED',
        'TASK_UPDATED': 'TASK_UPDATED',
        'TASK_DELETED': 'TASK_DELETED',
        'TASK_STATUS_UPDATED': 'TASK_UPDATED',
        'COMMENT_CREATED': 'MENTIONS',
        'PROJECT_CREATED': 'ALL_ACTIVITY',
        'PROJECT_UPDATED': 'ALL_ACTIVITY',
        'PROJECT_DELETED': 'ALL_ACTIVITY',
        'ADMIN_LOGINS': 'ADMIN_LOGINS'
      };

      const eventType = telegramEventMap[normalizedAction];
      if (eventType) {
        const [user, org] = await Promise.all([
          User.findById(userId).lean(),
          Organization.findById(params.organizationId).lean()
        ]);
        
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
        const orgName = org?.name || 'Unknown Organization';
        
        const tgMessage = telegramService.formatTelegramMessage(
          normalizedAction.replace(/_/g, ' '),
          orgName,
          {
            'By': userName,
            'Resource': resourceType,
            'Title': metadata?.title || metadata?.name || logMessage
          }
        );

        await telegramService.broadcastToOrg({
          organizationId: params.organizationId,
          eventType,
          message: tgMessage,
          // excludeUserId: userId // Commented out so you can see your own notifications for testing
        });
      }

    } catch (error) {
      console.error('[ActivityLog] Failed to create activity log from systemTriggers:', error);
    }
  }

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
  resourceType,
  metadata = {},
}: {
  userIds: any[];
  organizationId: any;
  actorId: any;
  type: any;
  message: any;
  resourceId: any;
  resourceType: any;
  metadata?: Record<string, any>;
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
      [NOTIFICATION_TYPES.PROJECT_INVITE]: 'Project invitation',
      [NOTIFICATION_TYPES.NEW_MEMBER_JOINED]: 'New Member Joined',
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
        ...metadata,
      },
      resourceId,
      resourceType
    }));

    if (notifications.length === 0) {
      return [];
    }

    const createdNotifications = await Notification.insertMany(notifications);
    emitToUsers(validUserIds, SOCKET_EVENTS.NOTIFICATION_NEW, createdNotifications);

    // Telegram Notifications for affected users (Direct mapped via connection)
    for (const recipientId of validUserIds) {
      const typeMap: Record<string, string> = {
        [NOTIFICATION_TYPES.MENTION]: 'MENTIONS',
        [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'TASK_CREATED', 
      };

      const eventType = typeMap[type];
      if (eventType) {
        const [actor, org] = await Promise.all([
          User.findById(actorId).lean(),
          Organization.findById(organizationId).lean()
        ]);
        
        const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'System';
        const orgName = org?.name || 'Unknown';
        
        const tgMessage = telegramService.formatTelegramMessage(
          titleMap[type] || 'Notification',
          orgName,
          {
            'From': actorName,
            'Message': message,
            'Resource': resourceType,
            'Link': `[View online](${process.env.FRONTEND_URL || 'https://pms-orbit.com'}${link || ''})`
          }
        );

        await telegramService.sendDirectNotification(String(recipientId), String(organizationId), tgMessage);
      }
    }

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
