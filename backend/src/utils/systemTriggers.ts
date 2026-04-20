import { logInfo } from '../services/logService.js';
import { createActivityLog } from '../services/activityLogService.js';
import Notification from '../models/Notification.js';
import OrganizationMember from '../models/OrganizationMember.js';
import { emitToUsers } from '../realtime/socket.server.js';
import { SOCKET_EVENTS } from '../realtime/socket.events.js';
import { NOTIFICATION_TYPES } from '../constants/index.js';
import * as telegramService from '../modules/notification/telegram.service.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

import Organization from '../models/Organization.js';

const getDisplayName = (user: any) => {
  if (!user) return 'System';
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user.email || 'System';
};

const normalizeChangedFields = (fields: any): string[] => {
  if (!Array.isArray(fields)) return [];
  const fieldLabelMap: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    dueDate: 'Due Date',
    startDate: 'Start Date',
    priority: 'Priority',
    status: 'Status',
    assigneeId: 'Assignee',
    assigneeIds: 'Assignees',
    tags: 'Tags',
    labels: 'Labels',
  };

  return fields
    .map((field: any) => fieldLabelMap[String(field)] || String(field || ''))
    .filter(Boolean);
};

const resolveTaskContext = async ({
  resourceId,
  projectId,
  metadata,
}: {
  resourceId?: any;
  projectId?: any;
  metadata?: Record<string, any>;
}) => {
  let taskTitle = metadata?.taskTitle || metadata?.title;
  let resolvedProjectId = metadata?.projectId || projectId;
  let projectName = metadata?.projectName;

  if (resourceId) {
    const taskDoc = await Task.findById(resourceId).select('title projectId').lean();
    if (taskDoc) {
      taskTitle = taskTitle || taskDoc.title;
      resolvedProjectId = resolvedProjectId || taskDoc.projectId;
    }
  }

  if (!projectName && resolvedProjectId) {
    const projectDoc = await Project.findById(resolvedProjectId).select('name').lean();
    projectName = projectDoc?.name;
  }

  return {
    taskTitle: taskTitle || 'Untitled Task',
    projectName: projectName || 'General',
  };
};

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
      const telegramEventMap: Record<string, { type: 'LOGINS' | 'TASKS' | 'COMMENTS' | 'ACTIVITY', emoji: string }> = {
        'TASK_CREATED': { type: 'TASKS', emoji: '📌' },
        'TASK_UPDATED': { type: 'TASKS', emoji: '🔄' },
        'TASK_DELETED': { type: 'TASKS', emoji: '🗑️' },
        'TASK_STATUS_UPDATED': { type: 'TASKS', emoji: '🚥' },
        'TASK_ASSIGNED': { type: 'TASKS', emoji: '👤' },
        'COMMENT_CREATED': { type: 'COMMENTS', emoji: '💬' },
        'MENTIONS': { type: 'COMMENTS', emoji: '🆔' },
        'USER_LOGIN': { type: 'LOGINS', emoji: '🔐' },
        'USER_LOGOUT': { type: 'LOGINS', emoji: '🔌' },
        'FAILED_LOGIN': { type: 'LOGINS', emoji: '⚠️' },
        'PAGE_OPENED': { type: 'ACTIVITY', emoji: '👀' },
        'ACTION_PERFORMED': { type: 'ACTIVITY', emoji: '⚡' },
        'PROJECT_CREATED': { type: 'TASKS', emoji: '📁' },
        'PROJECT_UPDATED': { type: 'TASKS', emoji: '📁' },
        'PROJECT_DELETED': { type: 'TASKS', emoji: '📁' },
      };

      const eventConfig = telegramEventMap[normalizedAction];
      if (eventConfig) {
        // Skip broadcast for COMMENT_CREATED - it's handled via triggerNotification() directly
        // to send personalized messages to task creator only
        if (normalizedAction === 'COMMENT_CREATED') {
          return;
        }

        const [user, org] = await Promise.all([
          User.findById(userId).lean(),
          Organization.findById(params.organizationId).lean()
        ]);
        
        const userName = getDisplayName(user);
        const orgName = org?.name || 'Unknown Organization';

        const taskActions = new Set([
          'TASK_CREATED',
          'TASK_UPDATED',
          'TASK_DELETED',
          'TASK_STATUS_UPDATED',
          'TASK_ASSIGNED',
        ]);

        let tgMessage = '';

        if (taskActions.has(normalizedAction)) {
          const taskContext = await resolveTaskContext({
            resourceId,
            projectId: params.projectId,
            metadata,
          });

          tgMessage = telegramService.buildTelegramMessage(
            normalizedAction as any,
            {
              taskId: String(resourceId || metadata?.taskId || ''),
              taskTitle: taskContext.taskTitle,
              projectName: taskContext.projectName,
              actorName: userName,
              oldStatus: metadata?.oldStatus,
              newStatus: metadata?.newStatus || metadata?.status,
              assignedTo: metadata?.assignedTo,
              assignedToId: metadata?.assignedToId,
              changedFields: normalizeChangedFields(metadata?.changedFields || metadata?.updatedFields),
              timestamp: metadata?.timestamp || new Date(),
            },
          );
        } else {
          const details: Record<string, any> = {
            'User': userName
          };
        
          if (eventConfig.type === 'TASKS') {
            details['Title'] = metadata?.title || metadata?.name || logMessage;
            if (metadata?.status) details['Status'] = metadata.status;
            if (metadata?.projectName) details['Project'] = metadata.projectName;
          } else if (eventConfig.type === 'LOGINS') {
            if (metadata?.device) details['Device'] = metadata.device;
            if (metadata?.ip) details['IP'] = metadata.ip;
          } else if (eventConfig.type === 'ACTIVITY') {
            details['Action'] = message || logMessage;
          }

          tgMessage = telegramService.formatTelegramMessage(
            normalizedAction.replace(/_/g, ' '),
            orgName,
            details,
            eventConfig.emoji
          );
        }

        telegramService.broadcastToOrg({
          organizationId: params.organizationId,
          eventType: eventConfig.type,
          message: tgMessage,
          excludeUserId: userId 
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
    const typeMap: Record<string, 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'MENTION' | 'COMMENT_CREATED' | null> = {
      [NOTIFICATION_TYPES.MENTION]: 'MENTION',
      [NOTIFICATION_TYPES.TASK_ASSIGNED]: 'TASK_ASSIGNED',
      [NOTIFICATION_TYPES.TASK_UPDATED]: 'TASK_UPDATED',
      [NOTIFICATION_TYPES.COMMENT_ADDED]: 'COMMENT_CREATED',
      [NOTIFICATION_TYPES.PROJECT_INVITE]: null,
      [NOTIFICATION_TYPES.NEW_MEMBER_JOINED]: null,
    };

    const eventType = typeMap[type] || null;

    if (eventType) {
      const [actor, recipientUsers, taskContext] = await Promise.all([
        User.findById(actorId).lean(),
        User.find({ _id: { $in: validUserIds } }).select('firstName lastName email').lean(),
        resolveTaskContext({ resourceId, metadata }),
      ]);

      const actorName = getDisplayName(actor);
      const recipientsById = new Map<string, any>();
      for (const recipient of recipientUsers as any[]) {
        recipientsById.set(String(recipient._id), recipient);
      }

      for (const recipientId of validUserIds) {
        const recipientUser = recipientsById.get(String(recipientId));
        const recipientName = getDisplayName(recipientUser);
        const payload = {
          taskId: String(resourceId || metadata?.taskId || ''),
          taskTitle: metadata?.taskTitle || taskContext.taskTitle,
          projectName: metadata?.projectName || taskContext.projectName,
          actorName,
          oldStatus: metadata?.oldStatus,
          newStatus: metadata?.newStatus,
          assignedTo: eventType === 'TASK_ASSIGNED' ? recipientName : metadata?.assignedTo,
          assignedToId: eventType === 'TASK_ASSIGNED' ? String(recipientId) : metadata?.assignedToId,
          changedFields: normalizeChangedFields(metadata?.changedFields),
          comment: metadata?.comment,
          timestamp: metadata?.timestamp || new Date(),
        };

        const tgMessage = telegramService.buildTelegramMessage(
          eventType,
          payload,
          { id: String(recipientId), name: recipientName },
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
