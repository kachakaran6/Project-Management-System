import Stripe from 'stripe';
import { env } from '../../config/env.js';

const stripe = new Stripe(env.stripeSecretKey || 'sk_test_mock_123');

/**
 * Stripe Service: Thin wrapper for Stripe API interactions
 */

/**
 * Create a checkout session
 */
export const createCheckoutSession = async ({
  customerId,
  priceId,
  organizationId,
  successUrl,
  cancelUrl
}: {
  customerId: any;
  priceId: any;
  organizationId: any;
  successUrl: any;
  cancelUrl: any;
}) => {
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
export const createCustomer = async (email: any, name: any, organizationId: any) => {
  return stripe.customers.create({
    email,
    name,
    metadata: { organizationId }
  });
};

/**
 * Construct event for webhook validation
 */
export const constructWebhookEvent = (payload: any, signature: any) => {
  return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret!);
};
