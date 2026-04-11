import express from 'express';
import * as inviteController from './invite.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// Anyone in current organization with permission can invite
router.get('/', requirePermission(PERMISSIONS.INVITE_USER), inviteController.list);

router.post(
  '/', 
  requirePermission(PERMISSIONS.INVITE_USER), 
  inviteController.invite
);

// Accepting an invite requires valid authentication but not necessarily within the same org
router.post('/accept', inviteController.accept);

export default router;
