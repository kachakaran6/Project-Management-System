import express from 'express';
import * as githubController from './github.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public webhook endpoint — raw body required for HMAC signature verification
router.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), githubController.handleWebhook);

// Protected endpoints
// Note: express.json() is applied here explicitly because app.ts mounts
// this router BEFORE the global express.json() middleware (needed so that
// express.raw() on /webhook doesn't get overridden).
router.use(requireAuth);
router.use(express.json({ limit: '500kb' }));
router.get('/settings/:projectId', githubController.getProjectSettings);
router.put('/settings/:projectId', githubController.updateProjectSettings);
router.get('/activity/:projectId', githubController.getProjectGithubActivity);
router.get('/full-activity/:projectId', githubController.getFullGithubActivity);

export default router;
