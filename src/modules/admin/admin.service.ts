import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import Log from '../../models/Log.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { logInfo } from '../../services/logService.js';
import { ACTIVITY_ACTIONS } from '../../constants/index.js';
import { hashPassword } from '../../utils/password.js';

/**
 * Get Platform-wide Dashboard Statistics
 */
/**
 * Get Dashboard Statistics (Scoped for Multi-tenancy)
 */
export const getDashboardStats = async (organizationId?: string, actorRole?: string) => {
  const isSuperAdmin = actorRole === 'SUPER_ADMIN';
  
  // If not super admin, we must filter by organization
  const orgFilter = (!isSuperAdmin && organizationId) ? { organizationId } : {};
  const userQuery = (!isSuperAdmin && organizationId) 
    ? { _id: { $in: await getOrgUserIds(organizationId) } }
    : {};

  const [userCount, projectCount, taskCount, pendingAdmins] = await Promise.all([
    User.countDocuments(userQuery),
    Project.countDocuments({ ...orgFilter, isActive: true }),
    Task.countDocuments({ ...orgFilter, isActive: true }),
    isSuperAdmin ? User.countDocuments({ role: 'ADMIN', isApproved: false }) : 0
  ]);

  return {
    totalUsers: userCount,
    totalProjects: projectCount,
    totalTasks: taskCount,
    pendingAdminRequests: pendingAdmins
  };
};

/**
 * Helper to get all user IDs for an organization
 */
async function getOrgUserIds(organizationId: string): Promise<any[]> {
  const memberships = await OrganizationMember.find({ organizationId, isActive: true }).select('userId');
  return memberships.map(m => m.userId);
}

/**
 * List all users with filtering
 */
export const getUsers = async (filter: Record<string, any> = {}, organizationId?: string, actorRole?: string) => {
  const query: Record<string, any> = {};
  if (filter.role) query.role = filter.role;
  if (filter.status) query.status = filter.status;

  if (actorRole !== 'SUPER_ADMIN' && organizationId) {
    query._id = { $in: await getOrgUserIds(organizationId) };
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();
  const userIds = users.map((user: any) => String(user._id));
  const memberships = userIds.length
    ? await OrganizationMember.find({ userId: { $in: userIds }, isActive: true })
        .populate('organizationId', 'name')
        .lean()
    : [];

  const organizationByUserId = new Map<string, string>();
  memberships.forEach((membership: any) => {
    const userId = String(membership.userId);
    if (!organizationByUserId.has(userId)) {
      organizationByUserId.set(userId, membership.organizationId?.name || '');
    }
  });

  return users.map((user: any) => ({
    ...user,
    organizationName: organizationByUserId.get(String(user._id)) || '',
  }));
};

/**
 * Update User (Role, Status, Ban)
 */
export const updateUser = async (userId: any, updateData: Record<string, any>, actorRole?: string) => {
  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError('User not found.', 404);

  // Security: Admin cannot modify Super Admin
  if (actorRole === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
    throw new AppError('Forbidden: Admins cannot modify a Super Admin.', 403);
  }

  Object.assign(targetUser, updateData);
  await targetUser.save();
  
  return targetUser;
};

/**
 * Delete User
 */
export const deleteUser = async (userId: any, actorRole?: string, actorId?: string) => {
  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError('User not found.', 404);

  if (actorId && String(actorId) === String(userId)) {
    throw new AppError('You cannot delete your own account.', 400);
  }

  // Security: Admin cannot delete Super Admin
  if (actorRole === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
    throw new AppError('Forbidden: Admins cannot delete a Super Admin.', 403);
  }

  await User.findByIdAndDelete(userId);
  return { success: true };
};

/**
 * Create User (Super Admin only)
 */
export const createUser = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  password?: string;
  status?: string;
  isActive?: boolean;
}, actorRole?: string) => {
  if (actorRole !== 'SUPER_ADMIN') {
    throw new AppError('Only Super Admins can create users.', 403);
  }

  const existingUser = await User.findOne({ email: payload.email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User with this email already exists.', 400);
  }

  const generatedPassword = payload.password?.trim() || Math.random().toString(36).slice(-10) + 'Aa1!';
  const passwordHash = await hashPassword(generatedPassword);
  const role = payload.role || 'USER';
  const status = payload.status || (role === 'ADMIN' ? 'PENDING_APPROVAL' : 'ACTIVE');

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email.toLowerCase(),
    password: passwordHash,
    role,
    status,
    isActive: payload.isActive ?? true,
    isApproved: role === 'ADMIN' ? false : true,
    isEmailVerified: true,
  });

  await logInfo(`User created by super admin: ${user.email}`, {
    userId: user._id,
    action: ACTIVITY_ACTIONS.CREATE,
    status: 'SUCCESS',
    metadata: { createdBy: actorRole, role }
  });

  const { password: _password, ...publicUser } = user.toObject();
  return { user: publicUser, generatedPassword };
};

/**
 * Bulk Action for users
 */
export const bulkAction = async (payload: {
  userIds: string[];
  role?: string;
  status?: string;
  isActive?: boolean;
  action?: 'DELETE' | 'REMOVE';
}, actorRole: string) => {
  const { userIds, role, status, isActive, action } = payload;
  
  const query: any = { _id: { $in: userIds } };
  
  // If actor is just an ADMIN, exclude any SUPER_ADMINs from the operation
  if (actorRole === 'ADMIN') {
    query.role = { $ne: 'SUPER_ADMIN' };
  }

  if (action === 'DELETE' || action === 'REMOVE') {
    const normalizedIds = userIds.map((id) => String(id));
    if (normalizedIds.includes('')) {
      throw new AppError('Invalid user id in bulk action.', 400);
    }
    if (actorRole !== 'SUPER_ADMIN' && action === 'DELETE') {
      throw new AppError('Only Super Admins can perform permanent deletion.', 403);
    }
    await User.deleteMany(query);
    return { count: userIds.length };
  }

  const update: any = {};
  if (role) update.role = role;
  if (status) update.status = status;
  if (isActive !== undefined) update.isActive = isActive;

  const result = await User.updateMany(query, { $set: update });

  await logInfo(`Bulk action performed by ${actorRole}`, {
    action: ACTIVITY_ACTIONS.BULK_ACTION,
    status: 'SUCCESS',
    metadata: { payload, updatedCount: result.modifiedCount }
  });

  return { updatedCount: result.modifiedCount };
};

/**
 * Get Pending Admins
 */
export const getPendingAdmins = async () => {
  return User.find({
    $or: [
      { role: 'ADMIN', isApproved: false },
      { accessRequestStatus: 'PENDING' },
    ],
  })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Approve a pending admin
 */
export const approveAdminUser = async (userId: any) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  
  if (user.requestedRole) {
    user.role = user.requestedRole;
  }

  user.isApproved = true;
  user.status = 'ACTIVE';
  user.accessRequestStatus = 'APPROVED';
  user.accessReviewedAt = new Date();
  await user.save();

  await logInfo(`Admin user approved: ${user.email}`, {
    userId: user._id,
    action: ACTIVITY_ACTIONS.USER_APPROVED,
    status: 'SUCCESS',
    metadata: { approvedBy: 'SUPER_ADMIN' }
  });

  return user;
};

/**
 * Project Management (Global)
 */
export const getAllProjects = async (organizationId?: string, actorRole?: string) => {
  const query = (actorRole !== 'SUPER_ADMIN' && organizationId) ? { organizationId } : {};
  return Project.find(query).populate('ownerId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
};

/**
 * Task Management (Global)
 */
export const getAllTasks = async (organizationId?: string, actorRole?: string) => {
  const query = (actorRole !== 'SUPER_ADMIN' && organizationId) ? { organizationId } : {};
  return Task.find(query).populate('creatorId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
};

/**
 * System Activity Logs (New Observability Model)
 */
export const getSystemLogs = async (filter: Record<string, any> = {}) => {
  const query: Record<string, any> = {};
  
  if (filter.actorId) query.userId = filter.actorId;
  if (filter.action) query.action = filter.action;
  if (filter.level) query.level = filter.level;
  if (filter.status) query.status = filter.status;
  
  if (filter.startDate && filter.endDate) {
    query.createdAt = {
      $gte: new Date(filter.startDate),
      $lte: new Date(filter.endDate),
    };
  }

  // Fetch from the new structured Log model
  return Log.find(query)
    .populate('userId', 'firstName lastName email avatarUrl')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
};
