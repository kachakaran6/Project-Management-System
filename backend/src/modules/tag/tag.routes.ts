import express from 'express';
import * as tagController from './tag.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// Anyone in current organization can view tags
router.get('/', requirePermission(PERMISSIONS.VIEW_PROJECT), tagController.getAll);

router.post(
  '/', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  tagController.create
);

router.put(
  '/:id', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  tagController.update
);

// Manage tags on specific tasks
router.post(
  '/task/:taskId', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  tagController.assign
);

router.delete(
  '/task/:taskId/:tagId', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  tagController.removeByTask
);

// Delete tag globally (affects every task)
router.delete(
  '/:id', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  tagController.removeGlobal
);

export default router;
