import Stripe from 'stripe';
import { env } from '../../config/env.js';

const stripe = new Stripe(env.stripeSecretKey || 'sk_test_mock_123');

/**
 * Stripe Service: Thin wrapper for Stripe API interactions
 */

/**
 * Create a checkout session
 */
export const createCheckoutSession = async ({ customerId, priceId, organizationId, successUrl, cancelUrl }) => {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId }
  });
};

/**
 * Create a Stripe customer
 */
export const createCustomer = async (email, name, organizationId) => {
  return stripe.customers.create({
    email,
    name,
    metadata: { organizationId }
  });
};

/**
 * Construct event for webhook validation
 */
export const constructWebhookEvent = (payload, signature) => {
  return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
};
