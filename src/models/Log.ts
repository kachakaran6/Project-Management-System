import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info',
    index: true
  },
  module: { 
    type: String, 
    index: true,
    default: 'SYSTEM' // e.g., 'AUTH', 'USER_MANAGEMENT', 'PROJECT', 'TASK'
  },
  action: { 
    type: String, 
    index: true 
  }, // e.g., 'USER_ROLE_UPDATED', 'LOGIN_SUCCESS', 'INVITATION_SENT'
  message: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILURE'], 
    default: 'SUCCESS',
    index: true 
  },
  
  // Who performed the action
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  performedBy: {
    userId: String,
    name: String,
    email: String
  },

  // What was the target of the action
  target: {
    targetId: String,
    type: String, // e.g., 'USER', 'PROJECT', 'ORGANIZATION'
    name: String
  },

  organizationId: {
    type: String,
    index: true
  },

  // NEW: Support for structured audit changes
  targetMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  metadata: { 
    type: mongoose.Schema.Types.Mixed 
  },
  
  // Technical Context
  requestId: { type: String, index: true },
  endpoint: { type: String },
  method: { type: String },
  responseTime: { type: Number },
  ip: { type: String },
  userAgent: { type: String },
  stack: { type: String } // For errors
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Optimization Indexes
logSchema.index({ createdAt: -1 });
logSchema.index({ organizationId: 1, createdAt: -1 });
logSchema.index({ module: 1, action: 1 });

// Auto-delete logs after 90 days (Extended Retention for Audit)
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Add text index for searching messages, actions, and user info
logSchema.index({ 
  message: 'text', 
  action: 'text',
  module: 'text',
  'performedBy.email': 'text',
  'performedBy.name': 'text'
});

const Log = mongoose.model('Log', logSchema);

export default Log;
