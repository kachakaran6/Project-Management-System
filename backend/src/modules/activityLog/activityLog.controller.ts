import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import { listActivityLogs } from '../../services/activityLogService.js';

export const list = asyncHandler(async (req, res) => {
  const { userId, action, entityType, startDate, endDate, query, page, limit } = req.query;

  const result = await listActivityLogs({
    organizationId: String(req.organizationId || ''),
    userId: userId ? String(userId) : undefined,
    action: action ? String(action) : undefined,
    entityType: entityType ? String(entityType) : undefined,
    startDate: startDate ? String(startDate) : undefined,
    endDate: endDate ? String(endDate) : undefined,
    query: query ? String(query) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  return successResponse(res, result, 'Activity logs retrieved successfully.');
});
