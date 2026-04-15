import express from 'express';
import * as commentController from './comment.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// Task-scoped list endpoint (legacy path)
router.get('/task/:taskId', requirePermission(PERMISSIONS.VIEW_TASK), commentController.getAll);

router.post(
  '/', 
  requirePermission(PERMISSIONS.CREATE_COMMENT), 
  commentController.add
);

// REST-standard routes
router.put(
  '/:commentId',
  requirePermission(PERMISSIONS.EDIT_COMMENT),
  commentController.update
);

router.patch(
  '/:id', 
  requirePermission(PERMISSIONS.EDIT_COMMENT), 
  commentController.update
);

router.delete(
  '/:commentId', 
  requirePermission(PERMISSIONS.DELETE_COMMENT), 
  commentController.remove
);

// Legacy delete path support
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.DELETE_COMMENT),
  commentController.remove
);

export default router;
