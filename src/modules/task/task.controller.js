import * as taskService from './task.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Create Task
 */
export const create = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    ...req.body,
    organizationId: req.organizationId // Still pass if exists, but not forced
  }, req.user.id);

  return successResponse(res, task, 'Task created successfully.', 201);
});

/**
 * Controller: Get Tasks with advanced filtering
 */
export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  const filter = {
    organizationId: req.organizationId,
    userId: req.user.id, // Support solo mode
    role: req.user.role, 
    workspaceId: req.query.workspaceId,
    projectId: req.query.projectId,
    status: req.query.status,
    priority: req.query.priority,
    assigneeId: req.query.assigneeId,
    tagId: req.query.tagId,
    dueDate: req.query.dueDate
  };

  const { tasks, totalCount } = await taskService.getTasks(filter, { page, limit });
  const paginatedResults = paginate(tasks, totalCount, page, limit);

  return successResponse(res, paginatedResults, 'Tasks retrieved successfully.');
});

/**
 * Controller: Update Task
 */
export const update = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(
    req.params.id,
    req.body,
    req.user.id,
    req.role
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

  await taskService.assignUsers(req.params.id, userIds, req.user.id);
  return successResponse(res, null, 'Users assigned successfully.');
});

/**
 * Controller: Change Task Status
 */
export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await taskService.changeStatus(
    req.params.id,
    status,
    req.user.id
  );

  return successResponse(res, task, `Task status changed to ${status}.`);
});

/**
 * Controller: Get Task by ID
 */
export const getById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  return successResponse(res, task, 'Task details retrieved.');
});

/**
 * Controller: Delete Task
 */
export const remove = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.user.id);
  return successResponse(res, null, 'Task deleted successfully.');
});
