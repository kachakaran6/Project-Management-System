import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What action was performed
  action: {
    type: String,
    enum: [
      'MEMBER_ROLE_CHANGED',
      'MEMBER_PERMISSIONS_CHANGED',
      'MEMBER_INVITED',
      'MEMBER_REMOVED',
      'MEMBER_REACTIVATED',
      'ROLE_PERMISSION_PRESET_CHANGED'
    ],
    required: true,
    index: true
  },
  
  // Target of the action (if applicable)
  targetMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Details of the change
  changes: {
    before: {
      role: String,
      permissions: [String]
    },
    after: {
      role: String,
      permissions: [String]
    }
  },
  
  // Additional context
  reason: String,
  metadata: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Only use createdAt
});

// Index for org + action queries
auditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
// Index for member-specific audit trails
auditLogSchema.index({ organizationId: 1, targetMember: 1, createdAt: -1 });

export default auditLogSchema;
