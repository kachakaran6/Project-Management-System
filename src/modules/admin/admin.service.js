import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Activity from '../../models/Activity.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Get Platform-wide Dashboard Statistics
 */
export const getDashboardStats = async () => {
  const [userCount, projectCount, taskCount, pendingAdmins] = await Promise.all([
    User.countDocuments({}),
    Project.countDocuments({ isActive: true }),
    Task.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'ADMIN', isApproved: false })
  ]);

  return {
    totalUsers: userCount,
    totalProjects: projectCount,
    totalTasks: taskCount,
    pendingAdminRequests: pendingAdmins
  };
};

/**
 * List all users with filtering
 */
export const getUsers = async (filter = {}) => {
  const query = {};
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;
  
  return User.find(query).select('-password').sort({ createdAt: -1 }).lean();
};

/**
 * Update User (Role, Status, Ban)
 */
export const updateUser = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-password');
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

/**
 * Delete User
 */
export const deleteUser = async (userId) => {
  const result = await User.findByIdAndDelete(userId);
  if (!result) throw new AppError('User not found.', 404);
  return { success: true };
};

/**
 * Get Pending Admins
 */
export const getPendingAdmins = async () => {
  return User.find({ role: 'ADMIN', isApproved: false }).select('-password').sort({ createdAt: -1 }).lean();
};

/**
 * Approve a pending admin
 */
export const approveAdminUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  
  user.isApproved = true;
  user.status = 'ACTIVE';
  await user.save();
  return user;
};

/**
 * Project Management (Global)
 */
export const getAllProjects = async () => {
  return Project.find({}).populate('ownerId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
};

/**
 * Task Management (Global)
 */
export const getAllTasks = async () => {
  return Task.find({}).populate('creatorId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
};

/**
 * System Activity Logs
 */
export const getSystemLogs = async (filter = {}) => {
  const query = {};
  if (filter.actorId) query.actorId = filter.actorId;
  if (filter.action) query.action = filter.action;
  
  return Activity.find(query).populate('actorId', 'firstName lastName email').sort({ createdAt: -1 }).limit(100).lean();
};
