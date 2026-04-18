import Tag from '../../models/Tag.js';
import TaskTag from '../../models/TaskTag.js';
import { AppError } from '../../middlewares/errorHandler.js';
import mongoose from 'mongoose';

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
  const rawTag = String(tagId || '').trim();
  if (!rawTag) {
    throw new AppError('Tag identifier or name is required.', 400);
  }

  let resolvedTagId: any = rawTag;

  // Backward compatibility: accept plain label names in tagId and resolve/create tag.
  if (!mongoose.Types.ObjectId.isValid(rawTag)) {
    const existingTag = await Tag.findOne({
      organizationId,
      name: { $regex: new RegExp(`^${rawTag}$`, 'i') },
    });

    if (existingTag) {
      resolvedTagId = existingTag._id;
    } else {
      const createdTag = await Tag.create({
        name: rawTag,
        organizationId,
      });
      resolvedTagId = createdTag._id;
    }
  }

  try {
    const taskTag = await TaskTag.create({ taskId, tagId: resolvedTagId, organizationId });
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
  if (!mongoose.Types.ObjectId.isValid(String(tagId || ''))) {
    throw new AppError('Invalid tagId. Expected a valid ObjectId.', 400);
  }

  await TaskTag.findOneAndDelete({ taskId, tagId, organizationId });
  return { success: true };
};

/**
 * Delete a tag globally (affects all tasks)
 */
export const deleteTag = async (tagId: any, organizationId: any) => {
  if (!mongoose.Types.ObjectId.isValid(String(tagId || ''))) {
    throw new AppError('Invalid tagId. Expected a valid ObjectId.', 400);
  }

  const tag = await Tag.findOneAndDelete({ _id: tagId, organizationId });
  if (!tag) throw new AppError('Tag not found or unauthorized.', 404);

  // Clean up all task assignments for this tag
  await TaskTag.deleteMany({ tagId, organizationId });

  return { success: true };
};
