import { Router } from 'express';
import * as settingsController from './settings.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/default-assignees', settingsController.getDefaultAssignees);
router.put('/default-assignees', settingsController.updateDefaultAssignees);

export default router;
