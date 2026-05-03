import express from 'express';
import * as integrationController from './integration.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', integrationController.getIntegrations);

export default router;
