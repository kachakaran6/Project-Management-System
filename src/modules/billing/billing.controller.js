import * as billingService from './billing.service.js';
import * as stripeService from './stripe.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';

/**
 * Controller: Create Checkout Session
 */
export const checkout = asyncHandler(async (req, res) => {
  const { priceId } = req.body;
  const session = await billingService.createPortalSession(
    req.organizationId,
    priceId,
    req.user.email
  );

  return successResponse(res, { url: session.url }, 'Checkout session created.');
});

/**
 * Controller: Stripe Webhook
 */
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await billingService.handleWebhook(event);
  
  res.status(200).json({ received: true });
});

/**
 * Controller: Get Subscription
 */
export const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await billingService.getSubscription(req.organizationId);
  return successResponse(res, subscription, 'Subscription details retrieved.');
});
