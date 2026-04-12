import Tag from '../../models/Tag.js';
import TaskTag from '../../models/TaskTag.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Tag Service: Reusable metadata tagging system
 */

/**
 * Create a new tag
 */
export const createTag = async (tagData: Record<string, any>) => {
  const { name, color, organizationId, workspaceId } = tagData;

  const existing = await Tag.findOne({ name, organizationId });
  if (existing) throw new AppError('Tag with this name already exists in organization.', 400);

  const tag = await Tag.create({ name, color, organizationId, workspaceId });
  return tag;
};

/**
 * Get all tags for organization/workspace
 */
export const getTags = async (organizationId: any, workspaceId: any = null) => {
  const query: Record<string, any> = { organizationId };
  if (workspaceId) query.workspaceId = workspaceId;

  return Tag.find(query).sort({ name: 1 }).lean();
};

/**
 * Assign tag to a task
 */
export const assignTagToTask = async (taskId: any, tagId: any, organizationId: any) => {
  try {
    const taskTag = await TaskTag.create({ taskId, tagId, organizationId });
    return taskTag;
  } catch (error: unknown) {
    const tagError = error as { code?: number };
    if (tagError.code === 11000) return { success: true, message: 'Already tagged' };
    throw error;
  }
};

/**
 * Remove tag from a task
 */
export const removeTagFromTask = async (taskId: any, tagId: any, organizationId: any) => {
  await TaskTag.findOneAndDelete({ taskId, tagId, organizationId });
  return { success: true };
};

/**
 * Delete a tag globally (affects all tasks)
 */
export const deleteTag = async (tagId: any, organizationId: any) => {
  const tag = await Tag.findOneAndDelete({ _id: tagId, organizationId });
  if (!tag) throw new AppError('Tag not found or unauthorized.', 404);

  // Clean up all task assignments for this tag
  await TaskTag.deleteMany({ tagId, organizationId });

  return { success: true };
};
