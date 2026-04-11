import * as adminService from './admin.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Dashboard stats
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const { organizationId, role } = req as any;
  const stats = await adminService.getDashboardStats(organizationId, role);
  return successResponse(res, stats, 'Dashboard statistics retrieved.');
});

/**
 * Controller: Users List with Filters
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { role: filterRole, status } = req.query;
  const { organizationId, role } = req as any;
  const userList = await adminService.getUsers({ role: filterRole, status }, organizationId, role);
  return successResponse(res, userList, 'User list retrieved.');
});

/**
 * Controller: Update User
 */
export const updateUserInfo = asyncHandler(async (req, res) => {
  const user = await adminService.updateUser(req.params.userId, req.body);
  return successResponse(res, user, 'User updated successfully.');
});

/**
 * Controller: Create User
 */
export const createUserInfo = asyncHandler(async (req, res) => {
  const result = await adminService.createUser(req.body, (req.user as any).role);
  return successResponse(res, result, 'User created successfully.', 201);
});

/**
 * Controller: Delete User
 */
export const deleteUserInfo = asyncHandler(async (req, res) => {
  await adminService.deleteUser(req.params.userId, (req.user as any).role, (req.user as any).id);
  return successResponse(res, null, 'User deleted successfully.');
});

/**
 * Controller: Bulk Actions
 */
export const bulkUsersAction = asyncHandler(async (req, res) => {
  const result = await adminService.bulkAction(req.body, (req.user as any).role);
  return successResponse(res, result, 'Bulk action performed successfully.');
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
  const { organizationId, role } = req as any;
  const projects = await adminService.getAllProjects(organizationId, role);
  return successResponse(res, projects, 'Project list retrieved.');
});

/**
 * Controller: List Tasks Globally
 */
export const listTasks = asyncHandler(async (req, res) => {
  const { organizationId, role } = req as any;
  const tasks = await adminService.getAllTasks(organizationId, role);
  return successResponse(res, tasks, 'Task list retrieved.');
});

/**
 * Controller: System Logs
 */
export const listLogs = asyncHandler(async (req, res) => {
  const { actorId, action } = req.query;
  const logs = await adminService.getSystemLogs({ actorId, action });
  return successResponse(res, logs, 'System activity logs retrieved.');
});
