import * as projectService from './project.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';
import { logInfo } from '../../services/logService.js';

/**
 * Controller: Create Project
 */
export const create = asyncHandler(async (req, res) => {
  const {
    name, description, workspaceId, status, 
    techStack, startDate, endDate, visibility, members, code, defaultAssigneeId
  } = req.body;

  const project = await projectService.createProject({
    name,
    description,
    workspaceId,
    organizationId: req.organizationId,
    ownerId: req.user.id,
    techStack,
    startDate,
    endDate,
    visibility,
    members,
    status,
    code,
    defaultAssigneeId
  });

  // Structured Audit Log
  await logInfo(`New project created: ${name}`, {
    module: 'PROJECT',
    action: 'PROJECT_CREATED',
    performedBy: {
      userId: req.user.id,
      name: `${req.user.firstName} ${req.user.lastName}`,
    },
    target: {
      targetId: (project as any)._id,
      type: 'PROJECT',
      name: project.name
    },
    organizationId: req.organizationId || undefined,
    metadata: { status: project.status }
  });

  return successResponse(res, project, 'Project created successfully.', 201);
});

/**
 * Controller: Get all projects with advanced filtering
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  
  const filter = {
    organizationId: req.organizationId || undefined,
    userId: req.user.id, 
    role: req.user.role,
    workspaceId: req.query.workspaceId,
    status: req.query.status,
    search: req.query.search
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
    req.user.id,
    req.role // Passing organization-level role
  );

  return successResponse(res, project, 'Project updated successfully.');
});

/**
 * Controller: Archive project
 */
export const archive = asyncHandler(async (req, res) => {
  const project = await projectService.archiveProject(
    req.params.id,
    req.user.id,
    req.role
  );

  return successResponse(res, project, 'Project archived successfully.');
});

/**
 * Controller: Get Project by ID
 */
export const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user.id, req.role);
  return successResponse(res, project, 'Project details retrieved.');
});

/**
 * Controller: Delete Project
 */
export const remove = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id, req.role);
  return successResponse(res, null, 'Project deleted successfully.');
});

/**
 * Controller: Attach Page to Project
 */
export const attachPage = asyncHandler(async (req, res) => {
  const projectPage = await projectService.attachPage(
    req.params.id as string,
    req.params.pageId as string,
    req.user.id,
    req.organizationId as string
  );
  return successResponse(res, projectPage, 'Page attached to project successfully.', 201);
});

/**
 * Controller: Detach Page from Project
 */
export const detachPage = asyncHandler(async (req, res) => {
  await projectService.detachPage(
    req.params.id as string,
    req.params.pageId as string,
    req.user.id,
    req.organizationId as string
  );
  return successResponse(res, null, 'Page detached from project successfully.');
});

/**
 * Controller: Get Linked Pages for Project
 */
export const getLinkedPages = asyncHandler(async (req, res) => {
  const pages = await projectService.getLinkedPages(req.params.id as string);
  return successResponse(res, pages, 'Linked pages retrieved successfully.');
});

