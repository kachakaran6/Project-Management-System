import * as analyticsService from './analytics.service.js';
import * as activityLogService from '../../services/activityLogService.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Get user analytics summary
 */
export const getUserSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    throw new AppError('Organization context required.', 400);
  }

  const summary = await analyticsService.getUserAnalyticsSummary(organizationId as string, userId as string);
  return successResponse(res, summary, 'User analytics summary retrieved successfully.');
});

/**
 * Get user activities with filtering and pagination
 */
export const getUserActivities = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const organizationId = req.organizationId;

  if (!organizationId) {
    throw new AppError('Organization context required.', 400);
  }

  const { page, limit, type, dateFrom, dateTo, search } = req.query;

  const activities = await activityLogService.listActivityLogs({
    organizationId: organizationId as string,
    userId: userId as string,
    entityType: type as string,
    startDate: dateFrom as string,
    endDate: dateTo as string,
    query: search as string,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });

  return successResponse(res, activities, 'User activities retrieved successfully.');
});

/**
 * Get user login sessions
 */
export const getUserSessions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const sessions = await analyticsService.getUserSessions(
    userId as string,
    Number(limit) || 20,
    Number(page) || 1
  );

  return successResponse(res, sessions, 'User sessions retrieved successfully.');
});
