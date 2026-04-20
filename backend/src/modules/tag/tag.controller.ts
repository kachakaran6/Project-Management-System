import * as tagService from './tag.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Tag
 */
export const create = asyncHandler(async (req, res) => {
  const tag = await tagService.createTag({
    ...req.body,
    organizationId: req.organizationId as string,
    createdBy: req.user.id
  });

  return successResponse(res, tag, 'Tag created successfully.', 201);
});

/**
 * Controller: Update Tag
 */
export const update = asyncHandler(async (req, res) => {
  const tag = await tagService.updateTag(req.params.id as string, req.body, req.organizationId as string);
  return successResponse(res, tag, 'Tag updated successfully.');
});

/**
 * Controller: Get All Tags
 */
export const getAll = asyncHandler(async (req, res) => {
  const tags = await tagService.getTags(req.organizationId as string, req.query.workspaceId as string);
  return successResponse(res, tags, 'Tags retrieved successfully.');
});

/**
 * Controller: Assign Tag to Task
 */
export const assign = asyncHandler(async (req, res) => {
  const { tagIds } = req.body;
  await tagService.assignTagsToTask(req.params.taskId as string, tagIds, req.organizationId as string);
  return successResponse(res, null, 'Tags assigned to task.');
});

/**
 * Controller: Remove Tag from Task
 */
export const removeByTask = asyncHandler(async (req, res) => {
  const { tagId } = req.params;
  await tagService.removeTagFromTask(req.params.taskId as string, tagId as string, req.organizationId as string);
  return successResponse(res, null, 'Tag removed from task.');
});

/**
 * Controller: Delete Tag Globally
 */
export const removeGlobal = asyncHandler(async (req, res) => {
  await tagService.deleteTag(req.params.id as string, req.organizationId as string);
  return successResponse(res, null, 'Tag deleted globally.');
});
