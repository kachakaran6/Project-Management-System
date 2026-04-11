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
  } catch (error) {
    console.error('Activity logging failed:', error.message);
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
}) => {
  try {
    const notifications = userIds.map(userId => ({
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
    console.error('Notification trigger failed:', error.message);
  }
};

/**
 * Notify all organization admins/members (optional ready)
 */
export const notifyOrgMembers = async (organizationId, params) => {
  const members = await OrganizationMember.find({ organizationId, isActive: true }).select('userId');
  const userIds = members.map(m => m.userId);
  await triggerNotification({ ...params, userIds });
};
