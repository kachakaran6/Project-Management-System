import Tag from '../../models/Tag.js';
import TaskTag from '../../models/TaskTag.js';
import { AppError } from '../../middlewares/errorHandler.js';
import mongoose from 'mongoose';

/**
 * Tag Service: Reusable metadata tagging system with color and icon support
 */

/**
 * Normalize tag for frontend
 */
export const normalizeTag = (tag: any) => {
  if (!tag) return null;
  const t = tag.toObject ? tag.toObject() : tag;
  return {
    id: String(t._id),
    name: t.name,
    label: t.label,
    color: t.color,
    icon: t.icon,
    organizationId: String(t.organizationId),
    workspaceId: t.workspaceId ? String(t.workspaceId) : undefined,
    createdBy: t.createdBy ? String(t.createdBy) : undefined,
    createdAt: t.createdAt
  };
};

/**
 * Create a new tag
 */
export const createTag = async (tagData: Record<string, any>) => {
  const { name, label, color, icon, organizationId, workspaceId, createdBy } = tagData;

  const tagName = String(name || label || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!tagName) throw new AppError('Tag name or label is required.', 400);

  const existing = await Tag.findOne({ name: tagName, organizationId });
  if (existing) throw new AppError('Tag with this name already exists in organization.', 400);

  const tag = await Tag.create({ 
    name: tagName, 
    label: label || name, 
    color: color || '#6366f1', 
    icon: icon || 'Tag',
    organizationId, 
    workspaceId,
    createdBy
  });
  
  return normalizeTag(tag);
};

/**
 * Update a tag
 */
export const updateTag = async (id: string, updateData: Record<string, any>, organizationId: any) => {
  const { name, label, color, icon } = updateData;
  
  const query: Record<string, any> = { _id: id, organizationId };
  const update: Record<string, any> = {};
  
  if (label) update.label = label;
  if (color) update.color = color;
  if (icon) update.icon = icon;
  if (name) update.name = String(name).trim().toLowerCase().replace(/\s+/g, '-');

  const tag = await Tag.findOneAndUpdate(query, { $set: update }, { new: true });
  if (!tag) throw new AppError('Tag not found or unauthorized.', 404);
  
  return normalizeTag(tag);
};

/**
 * Get all tags for organization/workspace
 */
export const getTags = async (organizationId: any, workspaceId: any = null) => {
  const query: Record<string, any> = { organizationId };
  if (workspaceId) query.workspaceId = workspaceId;

  const tags = await Tag.find(query).sort({ label: 1 }).lean();
  return tags.map(normalizeTag);
};

/**
 * Assign tag to a task (Support multiple)
 */
export const assignTagsToTask = async (taskId: any, tagIds: any[], organizationId: any) => {
  if (!Array.isArray(tagIds)) tagIds = [tagIds];
  
  const bulkOps = tagIds.map(tagId => ({
    updateOne: {
      filter: { taskId, tagId, organizationId },
      update: { taskId, tagId, organizationId },
      upsert: true
    }
  }));

  if (bulkOps.length > 0) {
    await TaskTag.bulkWrite(bulkOps);
  }
  
  return { success: true };
};

/**
 * Sync tags for a task (Replace all)
 */
export const syncTaskTags = async (taskId: any, tagIds: string[], organizationId: any) => {
  // Clear old
  await TaskTag.deleteMany({ taskId, organizationId });
  
  // Assign new
  if (tagIds.length > 0) {
    const docs = tagIds.map(tagId => ({
      taskId,
      tagId,
      organizationId
    }));
    await TaskTag.insertMany(docs, { ordered: false }).catch(err => {
      if (err.code !== 11000) throw err;
    });
  }
  
  return { success: true };
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
