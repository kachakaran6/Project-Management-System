import * as tagService from './tag.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Tag
 */
export const create = asyncHandler(async (req, res) => {
  const { name, color, workspaceId } = req.body;
  const tag = await tagService.createTag({
    name,
    color,
    workspaceId,
    organizationId: req.organizationId
  });

  return successResponse(res, tag, 'Tag created successfully.', 201);
});

/**
 * Controller: Get Task Tags
 */
export const getAll = asyncHandler(async (req, res) => {
  const tags = await tagService.getTags(req.organizationId, req.query.workspaceId);
  return successResponse(res, tags, 'Tags retrieved successfully.');
});

/**
 * Controller: Assign Tag to Task
 */
export const assign = asyncHandler(async (req, res) => {
  const tagValue = req.body?.tagId || req.body?.name || req.body?.tagName || req.body?.label;
  await tagService.assignTagToTask(req.params.taskId, tagValue, req.organizationId);
  return successResponse(res, null, 'Tag assigned to task.');
});

/**
 * Controller: Remove Tag from Task
 */
export const removeByTask = asyncHandler(async (req, res) => {
  const { tagId } = req.params;
  await tagService.removeTagFromTask(req.params.taskId, tagId, req.organizationId);
  return successResponse(res, null, 'Tag removed from task.');
});

/**
 * Controller: Delete Tag Globally
 */
export const removeGlobal = asyncHandler(async (req, res) => {
  await tagService.deleteTag(req.params.id, req.organizationId);
  return successResponse(res, null, 'Tag deleted globally.');
});
