import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { ROLES } from '../../constants/index.js';
import mongoose from 'mongoose';
import * as inviteService from '../invite/invite.service.js';

/**
 * Create a new organization and add the user as an ADMIN member.
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

    // 2. Add creator as ADMIN member
    await OrganizationMember.create([{
      organizationId: orgId,
      userId,
      role: ROLES.ADMIN,
      isActive: true
    }], { session });

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
    .populate('userId', 'firstName lastName email avatarUrl status lastLogin createdAt updatedAt')
    .sort({ joinedAt: 1 })
    .lean();

  return members.map((member: any) => ({
    id: member.userId?._id?.toString() || member.userId?.id || '',
    firstName: member.userId?.firstName || '',
    lastName: member.userId?.lastName || '',
    email: member.userId?.email || '',
    avatarUrl: member.userId?.avatarUrl,
    role: member.role,
    status: member.userId?.status === 'PENDING_APPROVAL' ? 'PENDING' : 'ACTIVE',
    joinedAt: member.joinedAt,
    lastActive: member.userId?.lastLogin,
  }));
};

export const updateOrganizationMemberRole = async (organizationId: string, userId: string, role: string, actorId: string) => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  const actorMembership = await OrganizationMember.findOne({ organizationId, userId: actorId, isActive: true });
  if (!actorMembership || (actorMembership.role !== 'ADMIN' && actorMembership.role !== 'SUPER_ADMIN')) {
    throw new AppError('Only organization admins can update member roles.', 403);
  }

  const member = await OrganizationMember.findOne({ organizationId, userId, isActive: true });
  if (!member) throw new AppError('Member not found.', 404);

  member.role = role as any;
  await member.save();

  return member;
};

export const removeOrganizationMember = async (organizationId: string, userId: string, actorId: string) => {
  const actorMembership = await OrganizationMember.findOne({ organizationId, userId: actorId, isActive: true });
  if (!actorMembership || (actorMembership.role !== 'ADMIN' && actorMembership.role !== 'SUPER_ADMIN')) {
    throw new AppError('Only organization admins can remove members.', 403);
  }

  const member = await OrganizationMember.findOne({ organizationId, userId, isActive: true });
  if (!member) throw new AppError('Member not found.', 404);

  member.isActive = false;
  await member.save();

  return { success: true };
};

export const listOrganizationInvites = async (organizationId: string) => {
  return inviteService.getOrganizationInvites(organizationId);
};
