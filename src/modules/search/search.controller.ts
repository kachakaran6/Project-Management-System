import * as searchService from './search.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Global Search
 */
export const search = asyncHandler(async (req, res) => {
  const { q, type } = req.query;
  const results = await searchService.searchGlobal(q, req.organizationId, type, req.role);
  return successResponse(res, results, 'Search results retrieved.');
});
