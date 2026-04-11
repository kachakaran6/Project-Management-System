import express from 'express';
import * as workspaceController from './workspace.controller.js';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { ROLES, PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

// Apply requireAuth to all workspace routes
router.use(requireAuth);

// Anyone in current organization can view its workspaces
router.get('/', workspaceController.getAll);
router.get('/:id', workspaceController.getById);

// Create/Update/Delete requires elevated role (ADMIN or MANAGER) or MANAGE_WORKSPACE permission
router.post(
  '/',
  requireRole([ROLES.ADMIN, ROLES.MANAGER]),
  requirePermission(PERMISSIONS.MANAGE_WORKSPACE),
  workspaceController.create
);

router.patch(
  '/:id',
  requireRole([ROLES.ADMIN, ROLES.MANAGER]),
  requirePermission(PERMISSIONS.MANAGE_WORKSPACE),
  workspaceController.update
);

router.delete(
  '/:id',
  requireRole([ROLES.ADMIN, ROLES.MANAGER]),
  requirePermission(PERMISSIONS.MANAGE_WORKSPACE),
  workspaceController.remove
);

export default router;
