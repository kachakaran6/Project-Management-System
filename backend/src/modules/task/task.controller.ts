import * as taskService from './task.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Task
 */
export const create = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    ...req.body,
    organizationId: req.organizationId as string // Still pass if exists, but not forced
  }, req.user.id, (req.role as string) || 'MEMBER');

  return successResponse(res, task, 'Task created successfully.', 201);
});

/**
 * Controller: Get Tasks with advanced filtering
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user.role as string);
  const targetUserId = (isAdmin && req.query.userId) 
    ? (req.query.userId === 'all' ? null : (req.query.userId as string))
    : null;

  const filter = {
    organizationId: req.organizationId as string,
    userId: req.user.id,
    role: req.user.role, 
    search: req.query.search,
    workspaceId: req.query.workspaceId,
    projectId: req.query.projectId,
    status: req.query.status,
    priority: req.query.priority,
    visibility: req.query.visibility,
    assigneeId: req.query.assigneeId,
    creatorOrAssigneeId: targetUserId,
    tagId: req.query.tagId,
    dueDate: req.query.dueDate
  };

  const { tasks, totalCount } = await taskService.getTasks(
    filter,
    { page, limit },
    req.user.id,
    (req.role as string) || 'MEMBER'
  );
  const paginatedResults = paginate(tasks, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Tasks retrieved successfully.');
});

/**
 * Controller: Update Task
 */
export const update = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(
    req.params.id as string,
    req.body,
    req.user.id,
    (req.role as string) || 'MEMBER'
  );

  return successResponse(res, task, 'Task updated successfully.');
});

/**
 * Controller: Assign Users to Task
 */
export const assign = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or missing userIds.' });
  }

  await taskService.assignUsers(req.params.id as string, userIds, req.user.id, (req.role as string) || 'MEMBER');
  return successResponse(res, null, 'Users assigned successfully.');
});

/**
 * Controller: Change Task Status
 */
export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await taskService.changeStatus(
    req.params.id as string,
    status,
    req.user.id
  );

  return successResponse(res, task, `Task status changed to ${status}.`);
});

/**
 * Controller: Get Task by ID
 */
export const getById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(
    req.params.id as string,
    req.user.id,
    (req.role as string) || 'MEMBER'
  );
  return successResponse(res, task, 'Task details retrieved.');
});

/**
 * Controller: Delete Task
 */
export const remove = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id as string, req.user.id);
  return successResponse(res, null, 'Task deleted successfully.');
});

/**
 * Controller: Update Task Visibility
 */
export const updateVisibility = asyncHandler(async (req, res) => {
  const { visibility, visibleToUsers } = req.body;
  
  if (!visibility) {
    return res.status(400).json({ success: false, message: 'Visibility is required.' });
  }

  const task = await taskService.updateTask(
    req.params.id as string,
    { visibility, visibleToUsers },
    req.user.id,
    (req.role as string) || 'MEMBER'
  );

  return successResponse(res, task, 'Task visibility updated successfully.');
});

/**
 * Controller: Add Users to Private Task
 */
export const addVisibilityUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or missing userIds.' });
  }

  await taskService.addTaskVisibilityUsers(req.params.id as string, userIds, req.user.id, (req.role as string) || 'MEMBER');
  return successResponse(res, null, 'Users added to task visibility.');
});

/**
 * Controller: Remove Users from Private Task
 */
export const removeVisibilityUsers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or missing userIds.' });
  }

  await taskService.removeTaskVisibilityUsers(req.params.id as string, userIds, req.user.id, (req.role as string) || 'MEMBER');
  return successResponse(res, null, 'Users removed from task visibility.');
});
