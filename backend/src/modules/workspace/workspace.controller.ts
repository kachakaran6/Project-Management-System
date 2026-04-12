import * as workspaceService from './workspace.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Workspace
 */
export const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const workspace = await workspaceService.createWorkspace({
    name,
    description,
    organizationId: req.organizationId,
    createdBy: req.user.id
  });

  return successResponse(res, workspace, 'Workspace created successfully.', 201);
});

/**
 * Controller: Get all workspaces in current organization context
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const { workspaces, totalCount } = await workspaceService.getWorkspaces(req.organizationId, { page, limit });
  const paginatedResults = paginate(workspaces, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Workspaces retrieved successfully.');
});

/**
 * Controller: Get single workspace
 */
export const getById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.id, req.organizationId);
  return successResponse(res, workspace, 'Workspace details retrieved.');
});

/**
 * Controller: Update workspace
 */
export const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const workspace = await workspaceService.updateWorkspace(
    req.params.id,
    req.organizationId,
    { name, description },
    req.user.id
  );

  return successResponse(res, workspace, 'Workspace updated successfully.');
});

/**
 * Controller: Delete workspace
 */
export const remove = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace(req.params.id, req.organizationId, req.user.id);
  return successResponse(res, null, 'Workspace deleted successfully.', 200);
});
