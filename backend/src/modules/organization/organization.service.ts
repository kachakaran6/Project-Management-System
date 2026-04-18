import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { ROLES } from '../../constants/index.js';
import mongoose from 'mongoose';
import * as inviteService from '../invite/invite.service.js';
import * as auditLogService from '../auditLog/auditLog.service.js';
import { createActivityLog } from '../../services/activityLogService.js';
import { ROLE_HIERARCHY, type RoleType, normalizeRoleName, DEFAULT_ROLE_PERMISSIONS } from '../../utils/permissionPresets.js';
import { getIO } from '../../realtime/socket.server.js';

/**
 * Create a new organization and add the user as an OWNER member.
 */
export const createOrganization = async (userId: string, data: { name: string; slug?: string; description?: string }) => {
  const { name, description } = data;
  
  // Generate slug if not provided
  let slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  // Ensure slug is unique
  const existing = await Organization.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create Organization
    const organization = await Organization.create([{
      name,
      slug,
      ownerId: userId,
      meta: { description }
    }], { session });

    const orgId = organization[0]._id;

    // 2. Add creator as OWNER member
    await OrganizationMember.create([{
      organizationId: orgId,
      userId,
      role: 'OWNER',
      isActive: true
    }], { session });

    await createActivityLog({
      userId,
      organizationId: orgId.toString(),
      action: 'USER_ADDED',
      entityType: 'ORGANIZATION',
      entityId: orgId.toString(),
      entityName: organization[0].name,
      targetUserId: userId,
      metadata: { role: 'OWNER', event: 'organization_created' },
    });

    // 3. Log the organization creation
    await auditLogService.logAuditEvent({
      organizationId: orgId.toString(),
      performedBy: userId,
      action: 'MEMBER_INVITED',
      targetMember: userId,
      metadata: { event: 'organization_created', role: 'OWNER' }
    });

    await session.commitTransaction();
    session.endSession();

    return organization[0];
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(error.message || 'Failed to create organization', 400);
  }
};

/**
 * Get all organizations for a user
 */
export const getUserOrganizations = async (userId: string) => {
  const memberships = await OrganizationMember.find({ userId, isActive: true })
    .populate('organizationId')
    .lean();
  
  return memberships.map((m: any) => ({
    ...m.organizationId,
    role: m.role,
    id: m.organizationId._id || m.organizationId.id
  }));
};

export const getOrganizationMembers = async (organizationId: string) => {
  const members = await OrganizationMember.find({ organizationId, isActive: true })
    .populate('userId', 'firstName lastName email avatarUrl status isActive lastLogin createdAt updatedAt')
    .sort({ joinedAt: 1 })
    .lean();

  return members.map((member: any) => ({
    id: member.userId?._id?.toString() || member.userId?.id || '',
    firstName: member.userId?.firstName || '',
    lastName: member.userId?.lastName || '',
    email: member.userId?.email || '',
    avatarUrl: member.userId?.avatarUrl,
    role: member.role,
    permissions: member.permissions || [],
    status: member.userId?.isActive === false 
      ? 'DISABLED' 
      : (member.userId?.status === 'PENDING_APPROVAL' ? 'PENDING' : 'ACTIVE'),
    joinedAt: member.joinedAt,
    lastActive: member.userId?.lastLogin,
  }));
};

/**
 * Update organization member role with proper validation and audit logging
 * CRITICAL: Enforces role hierarchy and multi-tenant security
 */
export const updateOrganizationMemberRole = async (
  organizationId: string,
  userId: string,
  newRole: string,
  actorId: string
) => {
  // Validate organization exists
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  // SECURITY: Validate actor has permission to change roles
  const actorMembership = await OrganizationMember.findOne({
    organizationId,
    userId: actorId,
    isActive: true
  });
  if (!actorMembership) {
    throw new AppError('Actor is not a member of this organization.', 403);
  }

  // Only OWNER and ADMIN can change member roles
  const actorRole = actorMembership.role as RoleType;
  const normalizedActorRole = normalizeRoleName(actorRole);
  if (normalizedActorRole !== 'OWNER' && normalizedActorRole !== 'ADMIN') {
    throw new AppError('Only organization owners and admins can change member roles.', 403);
  }

  // Get target member
  const member = await OrganizationMember.findOne({
    organizationId,
    userId,
    isActive: true
  });
  if (!member) throw new AppError('Member not found.', 404);

  // Normalize roles for hierarchy comparison
  const normalizedNewRole = normalizeRoleName(newRole) as RoleType;
  const normalizedCurrentRole = normalizeRoleName(member.role as string) as RoleType;
  const actorHierarchyLevel = ROLE_HIERARCHY[normalizedActorRole];
  const targetHierarchyLevel = ROLE_HIERARCHY[normalizedCurrentRole];
  const newRoleHierarchyLevel = ROLE_HIERARCHY[normalizedNewRole];

  // SECURITY: Non-owners cannot modify participants with a HIGHER role, 
  // and cannot assign a role HIGHER than their own.
  // We allow equal-level promotion (Admin -> Admin) per SaaS best practices.
  if (normalizedActorRole !== 'OWNER') {
    const isSelfChange = String(actorId) === String(userId);

    // Block modifying someone with a strictly HIGHER role
    if (!isSelfChange && targetHierarchyLevel > actorHierarchyLevel) {
      throw new AppError(
        'You cannot modify members with a higher role than your own.',
        403
      );
    }

    // Block assigning a role strictly HIGHER than your own
    if (newRoleHierarchyLevel > actorHierarchyLevel) {
      throw new AppError(
        'You cannot assign a role higher than your own.',
        403
      );
    }
  }

  // Prevent demoting the only OWNER
  if (normalizedCurrentRole === 'OWNER' && normalizedNewRole !== 'OWNER') {
    const ownerCount = await OrganizationMember.countDocuments({
      organizationId,
      role: 'OWNER',
      isActive: true
    });
    if (ownerCount === 1) {
      throw new AppError(
        'Cannot remove the last owner from the organization.',
        403
      );
    }
  }

  // Store old state for audit
  const oldRole = member.role;
  const oldPermissions = member.permissions || [];

  // Update role
  member.role = normalizedNewRole;
  member.permissionsLastUpdated = new Date();
  member.permissionsUpdatedBy = new mongoose.Types.ObjectId(actorId);
  
  // Clear custom permissions when role changes (reset to role defaults)
  member.permissions = [];

  await member.save();

  // AUDIT: Log the role change
  await auditLogService.logAuditEvent({
    organizationId: organizationId.toString(),
    performedBy: actorId,
    action: 'MEMBER_ROLE_CHANGED',
    targetMember: userId,
    changes: {
      before: { role: oldRole, permissions: oldPermissions },
      after: { role: normalizedNewRole, permissions: [] }
    },
    reason: 'Direct role change'
  });

  await createActivityLog({
    userId: actorId,
    organizationId: organizationId.toString(),
    action: 'MEMBER_ROLE_CHANGED',
    entityType: 'USER',
    entityId: userId,
    entityName: member.userId?.toString() || userId,
    targetUserId: userId,
    metadata: {
      oldRole,
      newRole: normalizedNewRole,
      changes: { before: { role: oldRole, permissions: oldPermissions }, after: { role: normalizedNewRole, permissions: [] } },
    },
  });

  // REALTIME: Emit socket event for real-time UI updates
  try {
    const io = getIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('member_role_changed', {
        memberId: userId,
        oldRole,
        newRole: normalizedNewRole,
        changedBy: actorId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Socket] Failed to emit member_role_changed:', error);
  }

  return {
    id: member.userId?.toString() || member._id.toString(),
    userId: member.userId,
    role: member.role,
    permissions: member.permissions,
    permissionsLastUpdated: member.permissionsLastUpdated
  };
};

/**
 * Update member permissions (granular control)
 * Allows assigning specific permissions beyond role defaults
 */
export const updateMemberPermissions = async (
  organizationId: string,
  userId: string,
  permissions: string[],
  actorId: string
) => {
  // Validate organization exists
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  // SECURITY: Validate actor has permission
  const actorMembership = await OrganizationMember.findOne({
    organizationId,
    userId: actorId,
    isActive: true
  });
  if (!actorMembership) {
    throw new AppError('Actor is not a member of this organization.', 403);
  }

  const normalizedActorRole = normalizeRoleName(actorMembership.role as string) as RoleType;
  if (normalizedActorRole !== 'OWNER' && normalizedActorRole !== 'ADMIN') {
    throw new AppError('Only organization owners and admins can manage permissions.', 403);
  }

  const member = await OrganizationMember.findOne({
    organizationId,
    userId,
    isActive: true
  });
  if (!member) throw new AppError('Member not found.', 404);

  const oldPermissions = member.permissions || [];
  member.permissions = permissions;
  member.permissionsLastUpdated = new Date();
  member.permissionsUpdatedBy = new mongoose.Types.ObjectId(actorId);

  await member.save();

  // AUDIT: Log permission change
  await auditLogService.logAuditEvent({
    organizationId: organizationId.toString(),
    performedBy: actorId,
    action: 'MEMBER_PERMISSIONS_CHANGED',
    targetMember: userId,
    changes: {
      before: { permissions: oldPermissions },
      after: { permissions }
    }
  });

  await createActivityLog({
    userId: actorId,
    organizationId: organizationId.toString(),
    action: 'MEMBER_PERMISSIONS_CHANGED',
    entityType: 'USER',
    entityId: userId,
    entityName: member.userId?.toString() || userId,
    targetUserId: userId,
    metadata: {
      changes: { before: { permissions: oldPermissions }, after: { permissions } },
    },
  });

  // REALTIME: Emit socket event
  try {
    const io = getIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('permissions_updated', {
        memberId: userId,
        permissions,
        changedBy: actorId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Socket] Failed to emit permissions_updated:', error);
  }

  return {
    id: member.userId?.toString() || member._id.toString(),
    userId: member.userId,
    role: member.role,
    permissions: member.permissions,
    permissionsLastUpdated: member.permissionsLastUpdated
  };
};

/**
 * Get member permissions (role defaults + custom overrides)
 */
export const getMemberPermissions = async (organizationId: string, userId: string) => {
  const member = await OrganizationMember.findOne({
    organizationId,
    userId,
    isActive: true
  }).select('role permissions');

  if (!member) throw new AppError('Member not found.', 404);

  const normalizedRole = normalizeRoleName(member.role as string) as RoleType;
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
  const customPermissions = member.permissions || [];

  // Combine role permissions with custom overrides
  const effectivePermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));

  return {
    role: member.role,
    rolePermissions,
    customPermissions,
    effectivePermissions
  };
};

/**
 * Remove organization member with audit logging
 */
export const removeOrganizationMember = async (organizationId: string, userId: string, actorId: string) => {
  // SECURITY: Validate actor has permission
  const actorMembership = await OrganizationMember.findOne({
    organizationId,
    userId: actorId,
    isActive: true
  });
  if (!actorMembership) {
    throw new AppError('Actor is not a member of this organization.', 403);
  }

  const normalizedActorRole = normalizeRoleName(actorMembership.role as string) as RoleType;
  if (normalizedActorRole !== 'OWNER' && normalizedActorRole !== 'ADMIN') {
    throw new AppError('Only organization owners and admins can remove members.', 403);
  }

  const member = await OrganizationMember.findOne({
    organizationId,
    userId,
    isActive: true
  });
  if (!member) throw new AppError('Member not found.', 404);

  // Prevent removing the only OWNER
  if (member.role === 'OWNER') {
    const ownerCount = await OrganizationMember.countDocuments({
      organizationId,
      role: 'OWNER',
      isActive: true
    });
    if (ownerCount === 1) {
      throw new AppError('Cannot remove the last owner from the organization.', 403);
    }
  }

  const oldRole = member.role;
  member.isActive = false;
  await member.save();

  // AUDIT: Log member removal
  await auditLogService.logAuditEvent({
    organizationId: organizationId.toString(),
    performedBy: actorId,
    action: 'MEMBER_REMOVED',
    targetMember: userId,
    changes: {
      before: { role: oldRole },
      after: { role: 'REMOVED' }
    }
  });

  await createActivityLog({
    userId: actorId,
    organizationId: organizationId.toString(),
    action: 'MEMBER_REMOVED',
    entityType: 'USER',
    entityId: userId,
    entityName: member.userId?.toString() || userId,
    targetUserId: userId,
    metadata: { oldRole },
  });

  // REALTIME: Emit socket event
  try {
    const io = getIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('member_removed', {
        memberId: userId,
        removedBy: actorId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Socket] Failed to emit member_removed:', error);
  }

  return { success: true };
};

export const listOrganizationInvites = async (organizationId: string) => {
  return inviteService.getOrganizationInvites(organizationId);
};

/**
 * Search organization members by name or email
 * Used for @mention assignment systems
 */
export const searchOrganizationMembers = async (organizationId: string, query: string) => {
  // 1. Find all active memberships for this org
  const memberships = await OrganizationMember.find({ 
    organizationId, 
    isActive: true 
  }).select('userId role');

  const userIds = memberships.map(m => m.userId);

  // 2. Search linked users with name/email regex
  const users = await User.find({
    _id: { $in: userIds },
    $or: [
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ]
  })
  .select('firstName lastName email avatarUrl')
  .limit(10)
  .lean();

  // 3. Map back with role info if needed
  const roleMap = new Map(memberships.map(m => [m.userId.toString(), m.role]));

  return users.map(user => ({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: roleMap.get(user._id.toString())
  }));
};
