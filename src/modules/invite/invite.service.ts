import crypto from 'crypto';
import OrganizationInvite from '../../models/OrganizationInvite.js';
import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import * as emailService from '../email/email.service.js';
import { getInviteTemplate } from '../email/email.templates.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { env } from '../../config/env.js';
import { logInfo } from '../../services/logService.js';

/**
 * Invite Service: Handing organization invitations
 */

/**
 * Send invite to organization
 * @param {object} inviteData - email, orgId, role, invitedBy
 */
export const sendInvite = async ({
  email,
  organizationId,
  role,
  invitedBy
}: {
  email: any;
  organizationId: any;
  role: any;
  invitedBy: any;
}) => {
  const inviteRole = ['ADMIN', 'MANAGER', 'MEMBER'].includes(role) ? role : 'MEMBER';

  // 1. Check if user already exists in organization
  const user = await User.findOne({ email });
  if (user) {
    const isMember = await OrganizationMember.findOne({ userId: user._id, organizationId });
    if (isMember) throw new AppError('User is already a member of this organization.', 400);
  }

  // 2. Check for existing pending invite
  const existingInvite = await OrganizationInvite.findOne({ email, organizationId, status: 'PENDING' });
  if (existingInvite) {
    existingInvite.status = 'EXPIRED';
    await existingInvite.save();
  }

  // 3. Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // 4. Create Invite record
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  const invite = await OrganizationInvite.create({
    email,
    organizationId,
    role: inviteRole,
    invitedBy,
    token,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });

  // 5. Send Invite Email
  const inviteUrl = `${env.frontendUrl || 'http://localhost:3000'}/invite/${token}`;
  const template = getInviteTemplate(org.name, inviteUrl);
  
  const emailResult = await emailService.sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });

  if (!emailResult.success) {
    // If email fails, we should handle it (rethrow or delete the newly created invite)
    // For now, let's just throw an error so the user knows why it failed.
    throw new AppError(`Failed to send invitation email: ${emailResult.error}`, 500);
  }

  await logInfo(`Organization invite sent to ${email}`, {
    userId: invitedBy,
    action: 'ORG_INVITE_SENT',
    status: 'SUCCESS',
    metadata: { organizationId, role: inviteRole, email }
  });

  return invite;
};

/**
 * Accept organization invitation
 */
export const acceptInvite = async (token: any, userId: any) => {
  const invite = await OrganizationInvite.findOne({ token, status: 'PENDING' });
  if (!invite) throw new AppError('Invalid or expired invitation.', 404);

  if (invite.expiresAt < new Date()) {
    invite.status = 'EXPIRED';
    await invite.save();
    throw new AppError('Invitation has expired.', 400);
  }

  const user = await User.findById(userId).select('email');
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new AppError('Invite email does not match the signed in account.', 403);
  }

  const existingMember = await OrganizationMember.findOne({ userId, organizationId: invite.organizationId });
  if (existingMember) {
    invite.status = 'ACCEPTED';
    await invite.save();
    return { organizationId: invite.organizationId, alreadyMember: true };
  }

  // Add user to organization
  await OrganizationMember.create({
    userId,
    organizationId: invite.organizationId,
    role: invite.role,
    isActive: true
  });

  // Update invite status
  invite.status = 'ACCEPTED';
  await invite.save();

  return { organizationId: invite.organizationId };
};

/**
 * Get all pending invites for an organization
 */
export const getOrganizationInvites = async (organizationId: any) => {
  await expireStaleInvites();

  return OrganizationInvite.find({ organizationId })
    .sort({ createdAt: -1 })
    .lean();
};

export const getInviteByToken = async (token: string) => {
  await expireStaleInvites();

  const invite = await OrganizationInvite.findOne({ token })
    .populate('organizationId', 'name slug logoUrl')
    .lean();
  if (!invite) {
    throw new AppError('Invalid invitation.', 404);
  }

  return invite;
};

export const revokeInvite = async (inviteId: string, organizationId: string) => {
  const invite = await OrganizationInvite.findOne({ _id: inviteId, organizationId });
  if (!invite) {
    throw new AppError('Invitation not found.', 404);
  }

  invite.status = 'EXPIRED';
  await invite.save();
  return invite;
};

export const resendInvite = async (inviteId: string, organizationId: string, invitedBy: string) => {
  const invite = await OrganizationInvite.findOne({ _id: inviteId, organizationId });
  if (!invite) {
    throw new AppError('Invitation not found.', 404);
  }

  if (invite.status === 'ACCEPTED') {
    throw new AppError('Accepted invitations cannot be resent.', 400);
  }

  invite.status = 'EXPIRED';
  await invite.save();

  return sendInvite({
    email: invite.email,
    organizationId,
    role: invite.role,
    invitedBy,
  });
};

export const expireStaleInvites = async () => {
  await OrganizationInvite.updateMany(
    { status: 'PENDING', expiresAt: { $lt: new Date() } },
    { $set: { status: 'EXPIRED' } },
  );
};
