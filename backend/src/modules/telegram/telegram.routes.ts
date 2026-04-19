import express from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import * as telegramController from './telegram.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/settings', telegramController.getSettings);
router.post('/initiate', telegramController.initiateConnection);
router.post('/verify', telegramController.verifyConnection);
router.post('/disconnect', telegramController.disconnect);

// Admin only routes
router.patch('/org-settings', requireRole(['ADMIN', 'SUPER_ADMIN']), telegramController.updateOrgSettings);

export default router;
