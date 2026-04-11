import * as commentService from './comment.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Add Comment
 */
export const add = asyncHandler(async (req, res) => {
  const { content, taskId, parentId } = req.body;
  const comment = await commentService.addComment({
    content,
    taskId,
    parentId,
    organizationId: req.organizationId
  }, req.user.id);

  return successResponse(res, comment, 'Comment added successfully.', 201);
});

/**
 * Controller: Get Task Comments
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const { comments, totalCount } = await commentService.getComments(req.params.taskId, req.organizationId, { page, limit });
  const paginatedResults = paginate(comments, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Comments retrieved successfully.');
});

/**
 * Controller: Update Comment
 */
export const update = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const comment = await commentService.updateComment(
    req.params.id,
    req.organizationId,
    content,
    req.user.id
  );

  return successResponse(res, comment, 'Comment updated successfully.');
});

/**
 * Controller: Delete Comment
 */
export const remove = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.organizationId, req.user.id);
  return successResponse(res, null, 'Comment deleted successfully.');
});
