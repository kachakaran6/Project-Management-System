import express from 'express';

import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import * as activityLogController from './activityLog.controller.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN', 'OWNER', 'SUPER_ADMIN']));

router.get('/', activityLogController.list);
router.get('/health', (_req, res) => {
	res.status(200).json({ success: true, message: 'Activity log route is mounted.' });
});

export default router;
