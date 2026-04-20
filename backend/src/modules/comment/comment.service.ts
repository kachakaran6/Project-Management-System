import Comment from '../../models/Comment.js';
import Task from '../../models/Task.js';
import Project from '../../models/Project.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { parseMentions } from '../../utils/mentionParser.js';
import * as activityLog from '../../utils/systemTriggers.js';
import mongoose from 'mongoose';
import { emitToRoom } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../realtime/socket.events.js';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN']);

const isValidObjectId = (value: unknown) => mongoose.Types.ObjectId.isValid(String(value || ''));

const isCommentOwner = (comment: any, userId: string) => {
  const ownerId = comment?.userId || comment?.authorId;
  return ownerId && String(ownerId) === String(userId);
};

const canManageComment = (comment: any, actor: { id: string; role?: string | null }) => {
  if (isCommentOwner(comment, actor.id)) {
    return true;
  }

  return Boolean(actor.role && ADMIN_ROLES.has(actor.role));
};

/**
 * Add a comment to a task
 */
export const addComment = async (commentData: Record<string, any>, userId: any) => {
  const { content, taskId, organizationId, parentId } = commentData;

  if (!content || !String(content).trim()) {
    throw new AppError('Comment content is required.', 400);
  }

  if (!isValidObjectId(taskId)) {
    throw new AppError('Invalid taskId.', 400);
  }

  if (parentId && !isValidObjectId(parentId)) {
    throw new AppError('Invalid parentId.', 400);
  }

  // 1. Validate task access
  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true });
  if (!task) throw new AppError('Task not found.', 404);

  // 2. Parse Mentions
  const mentions = await parseMentions(content, organizationId);
  const project = task.projectId ? await Project.findById(task.projectId).select('name').lean() : null;
  const projectName = project?.name || 'General';

  // 3. Create Comment
  const comment = await Comment.create({
    content: String(content).trim(),
    taskId,
    userId,
    authorId: userId,
    organizationId,
    parentId,
    mentions
  });

  emitToRoom(SOCKET_ROOMS.TASK(taskId), SOCKET_EVENTS.COMMENT_ADDED, {
    taskId,
    commentId: comment._id,
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
    const actor = await User.findById(userId).select('firstName lastName email').lean();
    const actorName = actor 
      ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email 
      : 'Someone';
      
    activityLog.triggerNotification({
      userIds: mentions,
      organizationId,
      actorId: userId,
      type: 'MENTION',
      message: `You were mentioned in a comment on task: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        projectName,
        actorName,
        comment: String(content).trim().slice(0, 150),
        timestamp: new Date(),
      }
    });
  }

  // Trigger notification for task creator if not the actor
  if (task.creatorId && task.creatorId.toString() !== userId.toString()) {
    const actor = await User.findById(userId).select('firstName lastName email').lean();
    const actorName = actor 
      ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email 
      : 'Someone';
      
     activityLog.triggerNotification({
        userIds: [task.creatorId],
        organizationId,
        actorId: userId,
        type: 'COMMENT_ADDED',
        message: `New comment on your task: ${task.title}`,
        resourceId: taskId,
        resourceType: 'Task',
        metadata: {
         taskId: String(taskId),
         taskTitle: task.title,
         projectName,
         actorName,
         changedFields: ['Comment'],
         comment: String(content).trim().slice(0, 150),
         timestamp: new Date(),
        }
     });
  }

  return await comment.populate('userId', 'firstName lastName email avatarUrl');
};

/**
 * Get comments for a task (nested/threaded)
 */
export const getComments = async (
  taskId: any,
  organizationId: any,
  actor: { id: string; role?: string | null },
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
) => {
  if (!isValidObjectId(taskId)) {
    throw new AppError('Invalid taskId.', 400);
  }

  const task = await Task.findOne({ _id: taskId, organizationId, isActive: true }).select('_id');
  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  const skip = (page - 1) * limit;

  const [comments, totalCount] = await Promise.all([
    Comment.find({ taskId, organizationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email avatarUrl')
      .populate('authorId', 'firstName lastName email avatarUrl')
      .lean(),
    Comment.countDocuments({ taskId, organizationId })
  ]);

  const hydratedComments = comments.map((comment: any) => {
    const user = comment.userId || comment.authorId || null;
    const owner = isCommentOwner(comment, actor.id);
    const admin = Boolean(actor.role && ADMIN_ROLES.has(actor.role));

    return {
      ...comment,
      userId: user,
      authorId: user,
      canEdit: owner || admin,
      canDelete: owner || admin,
    };
  });

  return { comments: hydratedComments, totalCount };
};

/**
 * Update a comment
 */
export const updateComment = async (
  commentId: any,
  organizationId: any,
  content: any,
  actor: { id: string; role?: string | null }
) => {
  if (!isValidObjectId(commentId)) {
    throw new AppError('Invalid commentId.', 400);
  }

  if (!content || !String(content).trim()) {
    throw new AppError('Comment content is required.', 400);
  }

  const existing = await Comment.findOne({ _id: commentId, organizationId });
  if (!existing) {
    throw new AppError('Comment not found.', 404);
  }

  if (!canManageComment(existing, actor)) {
    throw new AppError('You are not allowed to update this comment.', 403);
  }

  existing.content = String(content).trim();
  existing.isEdited = true;
  if (!existing.userId && existing.authorId) {
    existing.userId = existing.authorId;
  }
  if (!existing.authorId && existing.userId) {
    existing.authorId = existing.userId;
  }

  await existing.save();

  emitToRoom(SOCKET_ROOMS.TASK(existing.taskId), SOCKET_EVENTS.COMMENT_UPDATED, {
    taskId: existing.taskId,
    commentId: existing._id,
  });

  return await existing.populate('userId', 'firstName lastName email avatarUrl');
};

/**
 * Delete a comment
 */
export const deleteComment = async (
  commentId: any,
  organizationId: any,
  actor: { id: string; role?: string | null }
) => {
  if (!isValidObjectId(commentId)) {
    throw new AppError('Invalid commentId.', 400);
  }

  const comment = await Comment.findOne({ _id: commentId, organizationId });
  if (!comment) {
    throw new AppError('Comment not found.', 404);
  }

  if (!canManageComment(comment, actor)) {
    throw new AppError('You are not allowed to delete this comment.', 403);
  }

  const taskId = comment.taskId;
  await Comment.deleteOne({ _id: commentId });

  emitToRoom(SOCKET_ROOMS.TASK(taskId), SOCKET_EVENTS.COMMENT_DELETED, {
    taskId,
    commentId,
  });

  return { success: true };
};
