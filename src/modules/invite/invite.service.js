import crypto from 'crypto';
import Invite from '../../models/Invite.js';
import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import * as emailService from '../email/email.service.js';
import { getInviteTemplate } from '../email/email.templates.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { env } from '../../config/env.js';

/**
 * Invite Service: Handing organization invitations
 */

/**
 * Send invite to organization
 * @param {object} inviteData - email, orgId, role, invitedBy
 */
export const sendInvite = async ({ email, organizationId, role, invitedBy }) => {
  // 1. Check if user already exists in organization
  const user = await User.findOne({ email });
  if (user) {
    const isMember = await OrganizationMember.findOne({ userId: user._id, organizationId });
    if (isMember) throw new AppError('User is already a member of this organization.', 400);
  }

  // 2. Check for existing pending invite
  const existingInvite = await Invite.findOne({ email, organizationId, status: 'PENDING' });
  if (existingInvite) throw new AppError('Invitation already sent and is still pending.', 400);

  // 3. Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // 4. Create Invite record
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  const invite = await Invite.create({
    email,
    organizationId,
    role,
    invitedBy,
    token
  });

  // 5. Send Invite Email
  const inviteUrl = `${env.frontendUrl || 'http://localhost:3000'}/invite/accept?token=${token}`;
  const template = getInviteTemplate(org.name, inviteUrl);
  
  await emailService.sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });

  return invite;
};

/**
 * Accept organization invitation
 */
export const acceptInvite = async (token, userId) => {
  const invite = await Invite.findOne({ token, status: 'PENDING' });
  if (!invite) throw new AppError('Invalid or expired invitation.', 404);

  if (invite.expiresAt < new Date()) {
    invite.status = 'EXPIRED';
    await invite.save();
    throw new AppError('Invitation has expired.', 400);
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
export const getOrganizationInvites = async (organizationId) => {
  return Invite.find({ organizationId, status: 'PENDING' }).lean();
};
