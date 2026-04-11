import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import OrganizationMember from '../models/OrganizationMember.js';

/**
 * Log a system activity
 * @param {object} params
 */
export const logActivity = async ({
  userId,
  organizationId = null,
  workspaceId = null,
  projectId = null,
  resourceId, // ID of the Task, Project, etc.
  resourceType, // 'Task', 'Project', 'Workspace'
  action, // 'CREATE_PROJECT', 'DELETE_TASK', etc.
  metadata = {}
}: {
  userId: unknown;
  organizationId?: unknown;
  workspaceId?: unknown;
  projectId?: unknown;
  resourceId: unknown;
  resourceType: unknown;
  action: unknown;
  metadata?: Record<string, unknown>;
}) => {
  try {
    await Activity.create({
      actorId: userId,
      organizationId,
      workspaceId,
      projectId,
      entityId: resourceId,
      entityType: resourceType,
      action,
      metadata
    });
  } catch (error: unknown) {
    const activityError = error as Error;
    console.error('Activity logging failed:', activityError.message);
  }
};

/**
 * Trigger notification to specific users
 * @param {object} params
 */
export const triggerNotification = async ({
  userIds, // Array of user IDs to notify
  organizationId,
  actorId, // User who triggered notification
  type, // 'TASK_ASSIGNED', 'TASK_UPDATED', etc.
  message,
  resourceId,
  resourceType
}: {
  userIds: unknown[];
  organizationId: unknown;
  actorId: unknown;
  type: unknown;
  message: unknown;
  resourceId: unknown;
  resourceType: unknown;
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
  } catch (error: unknown) {
    const notificationError = error as Error;
    console.error('Notification trigger failed:', notificationError.message);
  }
};

/**
 * Notify all organization admins/members (optional ready)
 */
export const notifyOrgMembers = async (organizationId: unknown, params: Record<string, unknown>) => {
  const members = await OrganizationMember.find({ organizationId, isActive: true }).select('userId');
  const userIds = members.map((m: any) => m.userId);
  await triggerNotification({ ...(params as any), userIds });
};
