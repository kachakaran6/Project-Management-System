import express from 'express';
import * as organizationController from './organization.controller.js';
import * as inviteController from '../invite/invite.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

router.get('/my', organizationController.listMy);
router.post('/', organizationController.create);
router.get('/members', requirePermission(PERMISSIONS.VIEW_PROJECT), organizationController.members);
router.get('/search', requirePermission(PERMISSIONS.VIEW_PROJECT), organizationController.search);

router.get('/:orgId/members', requirePermission(PERMISSIONS.VIEW_PROJECT), organizationController.members);
router.get('/:orgId/search', requirePermission(PERMISSIONS.VIEW_PROJECT), organizationController.search);
router.post('/:orgId/invite', requirePermission(PERMISSIONS.INVITE_USER), organizationController.inviteMember);
router.patch('/:orgId/member/:userId', requirePermission(PERMISSIONS.CHANGE_MEMBER_ROLE), organizationController.updateMember);
router.delete('/:orgId/member/:userId', requirePermission(PERMISSIONS.MANAGE_MEMBERS), organizationController.removeMember);

// Permission management endpoints
router.get('/:orgId/members/:userId/permissions', requirePermission(PERMISSIONS.MANAGE_MEMBERS), organizationController.getMemberPermissions);
router.patch('/:orgId/members/:userId/permissions', requirePermission(PERMISSIONS.MANAGE_MEMBERS), organizationController.updateMemberPermissions);
router.get('/:orgId/roles/:role/permissions', requirePermission(PERMISSIONS.MANAGE_MEMBERS), organizationController.getRolePermissions);

// Invite management
router.get('/:orgId/invites', requirePermission(PERMISSIONS.INVITE_USER), inviteController.list);
router.delete('/:orgId/invites/:inviteId', requirePermission(PERMISSIONS.INVITE_USER), organizationController.revokeInvite);
router.post('/:orgId/invites/:inviteId/resend', requirePermission(PERMISSIONS.INVITE_USER), organizationController.resendInvite);

export default router;
