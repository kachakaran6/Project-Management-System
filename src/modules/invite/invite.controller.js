import * as inviteService from './invite.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';

/**
 * Controller: Send Invitation
 */
export const invite = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const invite = await inviteService.sendInvite({
    email,
    role,
    organizationId: req.organizationId,
    invitedBy: req.user.id
  });

  return successResponse(res, invite, 'Invitation sent successfully.', 201);
});

/**
 * Controller: Accept Invitation
 */
export const accept = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await inviteService.acceptInvite(token, req.user.id);
  return successResponse(res, result, 'Invitation accepted successfully.');
});

/**
 * Controller: List Invitations
 */
export const list = asyncHandler(async (req, res) => {
  const invites = await inviteService.getOrganizationInvites(req.organizationId);
  return successResponse(res, invites, 'Invitations retrieved successfully.');
});
