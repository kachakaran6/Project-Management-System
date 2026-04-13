import express from 'express';
import * as inviteController from './invite.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

// Public invite lookup for the acceptance page
router.get('/:token', inviteController.lookup);
router.post('/accept', requireAuth, inviteController.accept);

router.use(requireAuth);

// Anyone in current organization with permission can invite
router.get('/', requirePermission(PERMISSIONS.INVITE_USER), inviteController.list);

router.post(
  '/', 
  requirePermission(PERMISSIONS.INVITE_USER), 
  inviteController.invite
);

export default router;
