import Comment from '../../models/Comment.js';
import Task from '../../models/Task.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { parseMentions } from '../../utils/mentionParser.js';
import * as activityLog from '../../utils/systemTriggers.js';

/**
 * Add a comment to a task
 */
export const addComment = async (commentData: Record<string, any>, userId: any) => {
  const { content, taskId, organizationId, parentId } = commentData;

  // 1. Validate task access
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true });
  if (!task) throw new AppError('Task not found.', 404);

  // 2. Parse Mentions
  const mentions = await parseMentions(content, organizationId);

  // 3. Create Comment
  const comment = await Comment.create({
    content,
    taskId,
    authorId: userId,
    organizationId,
    parentId,
    mentions
  });

  // 4. Activity Logs and Notifications
  activityLog.logActivity({
    userId,
    organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: taskId,
    resourceType: 'Task',
    action: 'COMMENT',
    metadata: { commentId: comment._id }
  });

  // Trigger notification for mentions
  if (mentions.length > 0) {
    activityLog.triggerNotification({
      userIds: mentions,
      organizationId,
      actorId: userId,
      type: 'MENTION',
      message: `You were mentioned in a comment on task: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task'
    });
  }

  // Trigger notification for task creator if not the actor
  if (task.creatorId && task.creatorId.toString() !== userId.toString()) {
     activityLog.triggerNotification({
        userIds: [task.creatorId],
        organizationId,
        actorId: userId,
        type: 'COMMENT_ADDED',
        message: `New comment on your task: ${task.title}`,
        resourceId: taskId,
        resourceType: 'Task'
     });
  }

  return comment;
};

/**
 * Get comments for a task (nested/threaded)
 */
export const getComments = async (
  taskId: any,
  organizationId: any,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
) => {
  const skip = (page - 1) * limit;

  // Fetch all comments for the task
  // In a really large discussion, you'd only fetch top-level and lazy-load replies
  const [comments, totalCount] = await Promise.all([
    Comment.find({ taskId, organizationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'firstName lastName avatarUrl')
      .lean(),
    Comment.countDocuments({ taskId, organizationId })
  ]);

  // Build thread structure (optional client-side or server-side)
  // For simplicity, we return flat array but the parentId allows building the tree client-side.
  return { comments, totalCount };
};

/**
 * Update a comment
 */
export const updateComment = async (commentId: any, organizationId: any, content: any, userId: any) => {
  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, organizationId, authorId: userId },
    { $set: { content, isEdited: true } },
    { new: true }
  );

  if (!comment) throw new AppError('Comment not found or unauthorized.', 404);

  return comment;
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId: any, organizationId: any, userId: any) => {
  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    organizationId,
    authorId: userId
  });

  if (!comment) throw new AppError('Comment not found or unauthorized.', 404);

  return { success: true };
};
