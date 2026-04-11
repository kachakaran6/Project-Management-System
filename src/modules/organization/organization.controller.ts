import * as organizationService from './organization.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as inviteService from '../invite/invite.service.js';
 
 const getTargetOrgId = (req: any) => {
   const orgId = req.params.orgId || req.organizationId;
   if (!orgId) throw new AppError('Organization context not found.', 400);
   return orgId as string;
 };

/**
 * Controller: Create Organization
 */
export const create = asyncHandler(async (req, res) => {
  const { name, slug, description } = req.body;
  if (!name) {
    throw new AppError('Organization name is required.', 400);
  }

  const organization = await organizationService.createOrganization((req.user as any).id, {
    name,
    slug,
    description
  });

  return successResponse(res, organization, 'Organization created successfully.', 201);
});

/**
 * Controller: List User Organizations
 */
export const listMy = asyncHandler(async (req, res) => {
  const organizations = await organizationService.getUserOrganizations((req.user as any).id);
  return successResponse(res, organizations, 'Your organizations retrieved successfully.');
});

export const members = asyncHandler(async (req, res) => {
  const orgId = getTargetOrgId(req);
  const members = await organizationService.getOrganizationMembers(orgId);
  const invites = await organizationService.listOrganizationInvites(orgId);

  return successResponse(res, { members, invites }, 'Organization members retrieved successfully.');
});

export const updateMember = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const orgId = getTargetOrgId(req);
  const member = await organizationService.updateOrganizationMemberRole(
    orgId,
    req.params.userId as string,
    role,
    req.user.id,
  );

  return successResponse(res, member, 'Organization member updated successfully.');
});

export const removeMember = asyncHandler(async (req, res) => {
  const orgId = getTargetOrgId(req);
  const result = await organizationService.removeOrganizationMember(
    orgId,
    req.params.userId as string,
    req.user.id,
  );

  return successResponse(res, result, 'Organization member removed successfully.');
});

export const inviteMember = asyncHandler(async (req, res) => {
  const orgId = getTargetOrgId(req);
  const invite = await inviteService.sendInvite({
    email: req.body.email,
    role: req.body.role,
    organizationId: orgId,
    invitedBy: req.user.id,
  });

  return successResponse(res, invite, 'Invitation sent successfully.', 201);
});

export const revokeInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.revokeInvite(req.params.inviteId as string, req.params.orgId as string);
  return successResponse(res, invite, 'Invitation revoked successfully.');
});

export const resendInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.resendInvite(req.params.inviteId as string, req.params.orgId as string, req.user.id);
  return successResponse(res, invite, 'Invitation resent successfully.');
});
