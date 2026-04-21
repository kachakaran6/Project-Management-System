import crypto from 'crypto';
import OrganizationInvite from '../../models/OrganizationInvite.js';
import Organization from '../../models/Organization.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import User from '../../models/User.js';
import * as emailService from '../email/email.service.js';
import { getInviteTemplate } from '../email/email.templates.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { logInfo, logWarn } from '../../services/logService.js';
import { env } from '../../config/env.js';
import { NOTIFICATION_TYPES } from '../../constants/index.js';
import { triggerNotification } from '../../utils/systemTriggers.js';

/**
 * Invite Service: Handing organization invitations
 */

const ADMIN_ROLES = ['OWNER', 'ADMIN'];

const getDisplayName = (user: any) => {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return fullName || user?.email || 'A new user';
};

const notifyMemberJoined = async ({
  organizationId,
  joinedUserId,
  joinedUserName,
  inviteId,
}: {
  organizationId: any;
  joinedUserId: any;
  joinedUserName: string;
  inviteId?: any;
}) => {
  const notifyAdminsOnly = env.notifyAdminsOnly;

  const memberQuery: Record<string, any> = {
    organizationId,
    isActive: true,
  };

  if (notifyAdminsOnly) {
    memberQuery.role = { $in: ADMIN_ROLES };
  }

  const recipientUserIds = await OrganizationMember.find(memberQuery).distinct('userId');
  const recipientsExcludingActor = recipientUserIds.filter(
    (recipientId: any) => String(recipientId) !== String(joinedUserId),
  );

  if (recipientsExcludingActor.length === 0) {
    return;
  }

  const message = `${joinedUserName} has joined your organization successfully.`;

  await triggerNotification({
    userIds: recipientsExcludingActor,
    organizationId,
    actorId: joinedUserId,
    type: NOTIFICATION_TYPES.NEW_MEMBER_JOINED,
    message,
    resourceId: organizationId,
    resourceType: 'Organization',
    metadata: {
      joinedUserId: String(joinedUserId),
      joinedUserName,
      inviteId: inviteId ? String(inviteId) : undefined,
      notifyAdminsOnly,
    },
  });
};

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
  console.info(`[InviteService] Checking if user ${email} is already in org ${organizationId}`);
  const user = await User.findOne({ email });
  if (user) {
    const isMember = await OrganizationMember.findOne({ userId: user._id, organizationId });
    if (isMember) {
       console.warn(`[InviteService] User ${email} is already a member of org ${organizationId}`);
       throw new AppError('User is already a member of this organization.', 400);
    }
  }

  // 2. Check for existing pending invite
  console.info(`[InviteService] Checking existing invites for ${email} in org ${organizationId}`);
  const existingInvite = await OrganizationInvite.findOne({ email, organizationId, status: 'PENDING' });
  if (existingInvite) {
    console.info(`[InviteService] Expiring existing invite ${existingInvite._id}`);
    existingInvite.status = 'EXPIRED';
    await existingInvite.save();
  }

  // 3. Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // 4. Create Invite record
  const org = await Organization.findById(organizationId);
  if (!org) throw new AppError('Organization not found.', 404);

  console.info(`[InviteService] Creating invite record in DB for ${email} in org ${organizationId}`);
  const invite = await OrganizationInvite.create({
    email,
    organizationId,
    role: inviteRole,
    invitedBy,
    token,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });
  console.info(`[InviteService] Invite record created: ${invite._id}`);

  // 5. Send Invite Email
  console.info(`[InviteService] Sending invite email to ${email} for org ${org.name}...`);
  const inviteUrl = `${env.frontendUrl || 'http://localhost:3000'}/invite/${token}`;
  const template = getInviteTemplate(org.name, inviteUrl);
  
  const emailResult = await emailService.sendEmail({
    to: email,
    subject: template.subject,
    html: template.html
  });
  console.info(`[InviteService] Email result for ${email}:`, emailResult);

  if (!emailResult.success) {
    await logWarn(`Organization invite created but email delivery failed for ${email}`, {
      userId: invitedBy,
      action: 'ORG_INVITE_EMAIL_FAILED',
      status: 'FAILURE',
      metadata: {
        organizationId,
        role: inviteRole,
        email,
        error: emailResult.error,
      },
    });

    if (env.inviteEmailRequired) {
      throw new AppError(`Failed to send invitation email: ${emailResult.error}`, 500);
    }

    return {
      ...invite.toObject(),
      emailDelivery: {
        success: false,
        error: emailResult.error,
      },
    };
  }

  await logInfo(`Organization invite sent to ${email}`, {
    userId: invitedBy,
    action: 'ORG_INVITE_SENT',
    status: 'SUCCESS',
    metadata: { organizationId, role: inviteRole, email }
  });

  return {
    ...invite.toObject(),
    emailDelivery: {
      success: true,
    },
  };
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

  const user = await User.findById(userId).select('email firstName lastName');
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

  try {
    await notifyMemberJoined({
      organizationId: invite.organizationId,
      joinedUserId: userId,
      joinedUserName: getDisplayName(user),
      inviteId: invite._id,
    });
  } catch (error: any) {
    await logWarn('Member joined notification failed', {
      userId,
      action: 'ORG_MEMBER_JOINED_NOTIFICATION_FAILED',
      status: 'FAILURE',
      metadata: {
        organizationId: String(invite.organizationId),
        inviteId: String(invite._id),
        error: error?.message,
      },
    });
  }

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
