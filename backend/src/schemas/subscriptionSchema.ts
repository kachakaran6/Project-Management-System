import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_TIERS } from '../constants/index.js';

const subscriptionSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    unique: true,
    index: true 
  },
  tier: { 
    type: String, 
    enum: Object.values(SUBSCRIPTION_TIERS), 
    default: SUBSCRIPTION_TIERS.FREE 
  },
  status: { 
    type: String, 
    enum: Object.values(SUBSCRIPTION_STATUS), 
    default: SUBSCRIPTION_STATUS.ACTIVE 
  },
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  stripeCustomerId: { type: String, unique: true, sparse: true },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  trialStart: { type: Date },
  trialEnd: { type: Date }
}, {
  timestamps: true
});

export default subscriptionSchema;
