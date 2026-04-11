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
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEMBER'], 
    default: 'MEMBER' 
  },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Ensure a user is only a member of an organization once
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export default organizationMemberSchema;
