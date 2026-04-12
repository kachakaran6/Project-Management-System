import * as attachmentService from './attachment.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Store Attachment
 */
export const store = asyncHandler(async (req, res) => {
  const attachment = await attachmentService.storeAttachment({
    ...req.body,
    organizationId: req.organizationId
  }, req.user.id);

  return successResponse(res, attachment, 'Attachment stored successfully.', 201);
});

/**
 * Controller: Get Task Attachments
 */
export const getAll = asyncHandler(async (req, res) => {
  const attachments = await attachmentService.getTaskAttachments(req.params.taskId, req.organizationId);
  return successResponse(res, attachments, 'Attachments retrieved successfully.');
});

/**
 * Controller: Remove Attachment
 */
export const remove = asyncHandler(async (req, res) => {
  await attachmentService.deleteAttachment(req.params.id, req.organizationId, req.user.id);
  return successResponse(res, null, 'Attachment removed successfully.');
});
