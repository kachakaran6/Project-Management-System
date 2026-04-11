import express from 'express';
import * as attachmentController from './attachment.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

router.get('/task/:taskId', requirePermission(PERMISSIONS.VIEW_PROJECT), attachmentController.getAll);

router.post(
  '/', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  attachmentController.store
);

router.delete(
  '/:id', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  attachmentController.remove
);

export default router;
