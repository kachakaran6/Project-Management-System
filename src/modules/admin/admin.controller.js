import * as adminService from './admin.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Dashboard stats
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  return successResponse(res, stats, 'Global dashboard statistics retrieved.');
});

/**
 * Controller: Users List with Filters
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { role, status } = req.query;
  const userList = await adminService.getUsers({ role, status });
  return successResponse(res, userList, 'Global user list retrieved.');
});

/**
 * Controller: Update User
 */
export const updateUserInfo = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.userId, req.body);
  return successResponse(res, user, 'User updated successfully.');
});

/**
 * Controller: Delete User
 */
export const deleteUserInfo = asyncHandler(async (req, res) => {
  await adminService.deleteUser(req.params.userId);
  return successResponse(res, null, 'User deleted successfully.');
});

/**
 * Controller: Get pending admins
 */
export const getPendingAdmins = asyncHandler(async (req, res) => {
  const list = await adminService.getPendingAdmins();
  return successResponse(res, list, 'Pending admin requests retrieved.');
});

/**
 * Controller: Approve admin
 */
export const approveAdmin = asyncHandler(async (req, res) => {
  const user = await adminService.approveAdminUser(req.params.userId);
  return successResponse(res, user, `User ${user.email} approved as ADMIN.`);
});

/**
 * Controller: List Projects Globally
 */
export const listProjects = asyncHandler(async (req, res) => {
  const projects = await adminService.getAllProjects();
  return successResponse(res, projects, 'Global project list retrieved.');
});

/**
 * Controller: List Tasks Globally
 */
export const listTasks = asyncHandler(async (req, res) => {
  const tasks = await adminService.getAllTasks();
  return successResponse(res, tasks, 'Global task list retrieved.');
});

/**
 * Controller: System Logs
 */
export const listLogs = asyncHandler(async (req, res) => {
  const { actorId, action } = req.query;
  const logs = await adminService.getSystemLogs({ actorId, action });
  return successResponse(res, logs, 'System activity logs retrieved.');
});
