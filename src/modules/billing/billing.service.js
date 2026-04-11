import Subscription from '../../models/Subscription.js';
import * as stripeService from './stripe.service.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_TIERS } from '../../constants/index.js';

/**
 * Handle Stripe Webhook Events
 */
export const handleWebhook = async (event) => {
  const data = event.data.object;
  const type = event.type;
  
  const organizationId = data.metadata?.organizationId;

  logger.info(`💳 Stripe Webhook Received: ${type}`);

  switch (type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await Subscription.findOneAndUpdate(
        { organizationId },
        {
          stripeSubscriptionId: data.id || data.subscription,
          stripeCustomerId: data.customer,
          status: data.status.toUpperCase(),
          currentPeriodEnd: new Date(data.current_period_end * 1000),
          cancelAtPeriodEnd: data.cancel_at_period_end
        },
        { upsert: true }
      );
      break;

    case 'customer.subscription.deleted':
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: data.id },
        { status: SUBSCRIPTION_STATUS.CANCELED }
      );
      break;
  }
};

/**
 * Create a billing checkout session
 */
export const createPortalSession = async (organizationId, priceId, userEmail) => {
  let sub = await Subscription.findOne({ organizationId });
  
  if (!sub || !sub.stripeCustomerId) {
    const customer = await stripeService.createCustomer(userEmail, `Org: ${organizationId}`, organizationId);
    sub = await Subscription.findOneAndUpdate(
      { organizationId },
      { stripeCustomerId: customer.id },
      { upsert: true, new: true }
    );
  }

  // Placeholder URLs — replace with real frontend URLs from env
  const successUrl = 'http://localhost:3000/billing/success';
  const cancelUrl = 'http://localhost:3000/billing/cancel';

  return stripeService.createCheckoutSession({
    customerId: sub.stripeCustomerId,
    priceId,
    organizationId,
    successUrl,
    cancelUrl
  });
};

/**
 * Get subscription details for organization
 */
export const getSubscription = async (organizationId) => {
  return Subscription.findOne({ organizationId }).lean();
};
