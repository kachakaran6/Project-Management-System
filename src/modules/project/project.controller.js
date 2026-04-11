import * as projectService from './project.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Project
 */
export const create = asyncHandler(async (req, res) => {
  const { name, description, workspaceId, status } = req.body;
  const project = await projectService.createProject({
    name,
    description,
    workspaceId,
    organizationId: req.organizationId,
    ownerId: req.user.id,
    status
  });

  return successResponse(res, project, 'Project created successfully.', 201);
});

/**
 * Controller: Get all projects with advanced filtering
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  const filter = {
    organizationId: req.organizationId,
    userId: req.user.id, // Support solo mode
    role: req.user.role,
    workspaceId: req.query.workspaceId,
    status: req.query.status
  };

  const { projects, totalCount } = await projectService.getProjects(filter, { page, limit });
  const paginatedResults = paginate(projects, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Projects retrieved successfully.');
});

/**
 * Controller: Update project
 */
export const update = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(
    req.params.id,
    req.body,
    req.user.id
  );

  return successResponse(res, project, 'Project updated successfully.');
});

/**
 * Controller: Archive project
 */
export const archive = asyncHandler(async (req, res) => {
  const project = await projectService.archiveProject(
    req.params.id,
    req.user.id
  );

  return successResponse(res, project, 'Project archived successfully.');
});

/**
 * Controller: Get Project by ID
 */
export const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
  return successResponse(res, project, 'Project details retrieved.');
});

/**
 * Controller: Delete Project
 */
export const remove = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);
  return successResponse(res, null, 'Project deleted successfully.');
});
