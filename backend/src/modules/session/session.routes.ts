import express from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as sessionController from './session.controller.js';

const router = express.Router();

router.get('/', requireAuth, sessionController.getSessions);
router.post('/logout', requireAuth, sessionController.logoutSession);
router.post('/logout-all', requireAuth, sessionController.logoutAllSessions);

export default router;
