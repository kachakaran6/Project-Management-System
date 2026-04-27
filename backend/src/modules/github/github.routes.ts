import express from 'express';
import * as githubController from './github.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public webhook endpoint - requires raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), githubController.handleWebhook);

// Protected settings endpoints
router.use(requireAuth);
router.get('/settings/:projectId', githubController.getProjectSettings);
router.put('/settings/:projectId', githubController.updateProjectSettings);

export default router;
