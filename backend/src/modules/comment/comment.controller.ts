import * as commentService from './comment.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Add Comment
 */
export const add = asyncHandler(async (req, res) => {
  const { content, parentId } = req.body;
  const taskId = req.params.taskId || req.body.taskId;

  const comment = await commentService.addComment({
    content,
    taskId,
    parentId,
    organizationId: req.organizationId
  }, { id: req.user.id, role: req.role || req.user.role });

  return successResponse(res, comment, 'Comment added successfully.', 201);
});

/**
 * Controller: Get Task Comments
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const taskId = req.params.taskId;

  const { comments, totalCount } = await commentService.getComments(
    taskId,
    req.organizationId,
    { id: req.user.id, role: req.role || req.user.role },
    { page, limit }
  );
  const paginatedResults = paginate(comments, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Comments retrieved successfully.');
});

/**
 * Controller: Update Comment
 */
export const update = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const comment = await commentService.updateComment(
    req.params.commentId || req.params.id,
    req.organizationId,
    content,
    { id: req.user.id, role: req.role || req.user.role }
  );

  return successResponse(res, comment, 'Comment updated successfully.');
});

/**
 * Controller: Delete Comment
 */
export const remove = asyncHandler(async (req, res) => {
  await commentService.deleteComment(
    req.params.commentId || req.params.id,
    req.organizationId,
    { id: req.user.id, role: req.role || req.user.role }
  );

  return successResponse(res, null, 'Comment deleted successfully.');
});
