import * as resourceService from './project-resource.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller to handle Project Resource requests
 */

export const getResources = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const sessionOrgId = req.organizationId as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  const hasAccess = await resourceService.checkProjectAccess(projectId, userId, sessionOrgId, userRole);
  if (!hasAccess) throw new AppError('Unauthorized access to project resources', 403);

  const resources = await resourceService.getResources(projectId);

  return successResponse(res, resources, 'Resources retrieved successfully.');
});

export const getResourceById = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const resourceId = req.params.resourceId as string;
  const sessionOrgId = req.organizationId as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  const hasAccess = await resourceService.checkProjectAccess(projectId, userId, sessionOrgId, userRole);
  if (!hasAccess) throw new AppError('Unauthorized access to project resources', 403);

  const resource = await resourceService.getResourceById(resourceId, projectId);

  return successResponse(res, resource, 'Resource details retrieved.');
});

export const createResource = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const sessionOrgId = req.organizationId as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  const hasAccess = await resourceService.checkProjectAccess(projectId, userId, sessionOrgId, userRole);
  if (!hasAccess) throw new AppError('Unauthorized access to project resources', 403);

  const resource = await resourceService.createResource({
    ...req.body,
    projectId,
    organizationId: sessionOrgId
  }, userId);

  return successResponse(res, resource, 'Resource created successfully.', 201);
});

export const updateResource = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const resourceId = req.params.resourceId as string;
  const sessionOrgId = req.organizationId as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  const hasAccess = await resourceService.checkProjectAccess(projectId, userId, sessionOrgId, userRole);
  if (!hasAccess) throw new AppError('Unauthorized access to project resources', 403);

  const resource = await resourceService.updateResource(resourceId, projectId, req.body, userId);

  return successResponse(res, resource, 'Resource updated successfully.');
});

export const deleteResource = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const resourceId = req.params.resourceId as string;
  const sessionOrgId = req.organizationId as string;
  const userId = req.user.id as string;
  const userRole = req.user.role as string;

  const hasAccess = await resourceService.checkProjectAccess(projectId, userId, sessionOrgId, userRole);
  if (!hasAccess) throw new AppError('Unauthorized access to project resources', 403);

  await resourceService.deleteResource(resourceId, projectId);

  return successResponse(res, null, 'Resource deleted successfully.');
});
