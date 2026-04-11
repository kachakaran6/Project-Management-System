import Attachment from '../../models/Attachment.js';
import Task from '../../models/Task.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';

/**
 * Upload an attachment (metadata only)
 */
export const storeAttachment = async (attachmentData, userId) => {
  const { fileName, fileType, fileSize, fileUrl, key, taskId, organizationId } = attachmentData;

  // Validate task access
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true });
  if (!task) throw new AppError('Task not found.', 404);

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
    resourceType: 'Task'
  });

  return attachment;
};

/**
 * Get all attachments for a task
 */
export const getTaskAttachments = async (taskId, organizationId) => {
  const attachments = await Attachment.find({ taskId, organizationId })
    .sort({ createdAt: -1 })
    .populate('uploaderId', 'firstName lastName')
    .lean();

  return attachments;
};

/**
 * Delete an attachment
 */
export const deleteAttachment = async (attachmentId, organizationId, userId) => {
  const attachment = await Attachment.findOneAndDelete({
    _id: attachmentId,
    organizationId,
    uploaderId: userId // Only uploader can delete for now
  });

  if (!attachment) throw new AppError('Attachment not found or unauthorized.', 404);

  return { success: true };
};
