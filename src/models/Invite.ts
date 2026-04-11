import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  role: { 
    type: String, 
    enum: ['ADMIN', 'MANAGER', 'MEMBER'], 
    default: 'MEMBER' 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  invitedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'], 
    default: 'PENDING' 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

// Index for cleanup and lookup
inviteSchema.index({ email: 1, organizationId: 1 }, { unique: true });

const Invite = mongoose.model('Invite', inviteSchema);
export default Invite;
