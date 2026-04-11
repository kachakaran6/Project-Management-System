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
router.get('/members', requirePermission(PERMISSIONS.INVITE_USER), organizationController.members);

router.get('/:orgId/members', requirePermission(PERMISSIONS.INVITE_USER), organizationController.members);
router.post('/:orgId/invite', requirePermission(PERMISSIONS.INVITE_USER), organizationController.inviteMember);
router.patch('/:orgId/member/:userId', requirePermission(PERMISSIONS.INVITE_USER), organizationController.updateMember);
router.delete('/:orgId/member/:userId', requirePermission(PERMISSIONS.INVITE_USER), organizationController.removeMember);
router.get('/:orgId/invites', requirePermission(PERMISSIONS.INVITE_USER), inviteController.list);
router.delete('/:orgId/invites/:inviteId', requirePermission(PERMISSIONS.INVITE_USER), organizationController.revokeInvite);
router.post('/:orgId/invites/:inviteId/resend', requirePermission(PERMISSIONS.INVITE_USER), organizationController.resendInvite);

export default router;
