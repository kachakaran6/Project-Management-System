import express from 'express';
import * as commentController from './comment.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// All comment operations require CREATE_TASK (general task access for comments) 
// or define a specific COMMENT_CREATE permission if needed.
router.get('/task/:taskId', requirePermission(PERMISSIONS.VIEW_PROJECT), commentController.getAll);

router.post(
  '/', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  commentController.add
);

router.patch(
  '/:id', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  commentController.update
);

router.delete(
  '/:id', 
  requirePermission(PERMISSIONS.CREATE_TASK), 
  commentController.remove
);

export default router;
