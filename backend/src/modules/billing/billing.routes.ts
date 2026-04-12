import express from 'express';
import * as billingController from './billing.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/permission.middleware.js';
import { PERMISSIONS } from '../../constants/index.js';

const router = express.Router();

/**
 * Webhook: Public but validated by Stripe Signature
 * NOTE: Stripe webhook requires raw request body. 
 * Ensure express.raw() is configured for this specific path in app.js if needed.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.webhook);

router.use(requireAuth);

router.get('/', billingController.getSubscription);

router.post(
  '/checkout', 
  requirePermission(PERMISSIONS.MANAGE_WORKSPACE), 
  billingController.checkout
);

export default router;
