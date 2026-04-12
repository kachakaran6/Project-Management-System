import mongoose from 'mongoose';

const organizationMemberSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  role: { 
    type: String, 
    enum: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER', 'SUPER_ADMIN'], 
    default: 'MEMBER' 
  },
  // Custom permission overrides beyond the role defaults
  // Allows fine-grained control (e.g., MEMBER with DELETE_PROJECT permission)
  permissions: {
    type: [String],
    default: []
  },
  // Audit trail
  permissionsLastUpdated: {
    type: Date,
    default: null
  },
  permissionsUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Ensure a user is only a member of an organization once
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
// Index for finding active members
organizationMemberSchema.index({ organizationId: 1, isActive: 1 });

export default organizationMemberSchema;
