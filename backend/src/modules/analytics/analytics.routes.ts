import express from 'express';
import * as analyticsController from './analytics.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

router.use(requireAuth);

// Access restricted to ADMIN/OWNER for viewing other users' analytics
router.get(
  '/:userId/summary',
  requirePermission(PERMISSIONS.VIEW_PROJECT), // Re-using VIEW_PROJECT as a base, but we should ideally have a VIEW_ANALYTICS
  analyticsController.getUserSummary
);

router.get(
  '/:userId/activities',
  requirePermission(PERMISSIONS.VIEW_PROJECT),
  analyticsController.getUserActivities
);

router.get(
  '/:userId/sessions',
  requirePermission(PERMISSIONS.VIEW_PROJECT),
  analyticsController.getUserSessions
);

export default router;
