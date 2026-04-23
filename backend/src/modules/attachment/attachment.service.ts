import Attachment from '../../models/Attachment.js';
import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import * as visibilityHelpers from '../../utils/visibilityHelpers.js';

/**
 * Upload an attachment (metadata only)
 */
export const storeAttachment = async (
  attachmentData: Record<string, any>,
  actor: { id: string; role?: string | null }
) => {
  const { fileName, fileType, fileSize, fileUrl, key, taskId, organizationId } = attachmentData;
  const userId = actor.id;

  // Validate task access
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true });
  if (!task) throw new AppError('Task not found.', 404);

  const hasAccess = await visibilityHelpers.canUserAccessTask(
    task._id,
    actor.id,
    task.creatorId,
    task.visibility,
    actor.role,
    Boolean(task.isDraft || task.visibility === 'DRAFT')
  );

  if (!hasAccess) {
    throw new AppError('Access denied to this task.', 403);
  }
  const project = task.projectId ? await Project.findById(task.projectId).select('name').lean() : null;
  const projectName = project?.name || 'General';

  const attachment = await Attachment.create({
    fileName,
    fileType,
    fileSize,
    fileUrl,
    key,
    taskId,
    organizationId,
    uploaderId: userId
  });

  // Log activity
  activityLog.logActivity({
    userId,
    organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: taskId,
    resourceType: 'Task',
    action: 'UPDATE', // Logic: adding attachment is an update to task
    metadata: { attachmentId: attachment._id, fileName }
  });

  // Trigger notification
  activityLog.triggerNotification({
    userIds: [task.creatorId], // Notify task creator
    organizationId,
    actorId: userId,
    type: 'TASK_UPDATED',
    message: `New attachment ${fileName} added to task: ${task.title}`,
    resourceId: taskId,
    resourceType: 'Task',
    metadata: {
      taskId: String(taskId),
      taskTitle: task.title,
      projectName,
      changedFields: ['Attachment'],
      timestamp: new Date(),
    }
  });

  return attachment;
};

/**
 * Get all attachments for a task
 */
export const getTaskAttachments = async (
  taskId: any,
  organizationId: any,
  actor: { id: string; role?: string | null }
) => {
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true })
    .select('_id creatorId visibility isDraft');
  if (!task) throw new AppError('Task not found.', 404);

  const hasAccess = await visibilityHelpers.canUserAccessTask(
    task._id,
    actor.id,
    task.creatorId,
    task.visibility,
    actor.role,
    Boolean((task as any).isDraft || task.visibility === 'DRAFT')
  );

  if (!hasAccess) {
    throw new AppError('Access denied to this task.', 403);
  }

  const attachments = await Attachment.find({ taskId, organizationId })
    .sort({ createdAt: -1 })
    .populate('uploaderId', 'firstName lastName')
    .lean();

  return attachments;
};

/**
 * Delete an attachment
 */
export const deleteAttachment = async (attachmentId: any, organizationId: any, userId: any) => {
  const attachment = await Attachment.findOneAndDelete({
    _id: attachmentId,
    organizationId,
    uploaderId: userId // Only uploader can delete for now
  });

  if (!attachment) throw new AppError('Attachment not found or unauthorized.', 404);

  return { success: true };
};
