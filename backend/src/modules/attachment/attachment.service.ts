import Attachment from '../../models/Attachment.js';
import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';

/**
 * Upload an attachment (metadata only)
 */
export const storeAttachment = async (attachmentData: Record<string, any>, userId: any) => {
  const { fileName, fileType, fileSize, fileUrl, key, taskId, organizationId } = attachmentData;

  // Validate task access
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true });
  if (!task) throw new AppError('Task not found.', 404);
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
export const getTaskAttachments = async (taskId: any, organizationId: any) => {
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
