import * as inviteService from './invite.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

const resolveOrganizationId = (req: any) => {
  const paramId = req.params.orgId;
  return (!paramId || paramId === '0') ? req.organizationId : paramId;
};

const resolveToken = (req: any) => req.params.token || req.body.token;

/**
 * Controller: Send Invitation
 */
export const invite = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const invite = await inviteService.sendInvite({
    email,
    role,
    organizationId: resolveOrganizationId(req),
    invitedBy: req.user.id
  });

  return successResponse(res, invite, 'Invitation sent successfully.', 201);
});

/**
 * Controller: Accept Invitation
 */
export const accept = asyncHandler(async (req, res) => {
  const token = resolveToken(req);
  const result = await inviteService.acceptInvite(token, req.user.id);
  return successResponse(res, result, 'Invitation accepted successfully.');
});

/**
 * Controller: List Invitations
 */
export const list = asyncHandler(async (req, res) => {
  const invites = await inviteService.getOrganizationInvites(resolveOrganizationId(req));
  return successResponse(res, invites, 'Invitations retrieved successfully.');
});

/**
 * Controller: Lookup Invitation by Token
 */
export const lookup = asyncHandler(async (req, res) => {
  const invite = await inviteService.getInviteByToken(resolveToken(req));
  return successResponse(res, invite, 'Invitation retrieved successfully.');
});

/**
 * Controller: Revoke Invitation
 */
export const revoke = asyncHandler(async (req, res) => {
  const invite = await inviteService.revokeInvite(req.params.id as string, resolveOrganizationId(req));
  return successResponse(res, invite, 'Invitation revoked successfully.');
});

/**
 * Controller: Resend Invitation
 */
export const resend = asyncHandler(async (req, res) => {
  const invite = await inviteService.resendInvite(
    req.params.id as string,
    resolveOrganizationId(req),
    req.user.id,
  );

  return successResponse(res, invite, 'Invitation resent successfully.');
});
