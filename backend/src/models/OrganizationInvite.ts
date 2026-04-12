import mongoose from 'mongoose';

const organizationInviteSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['ADMIN', 'MANAGER', 'MEMBER'],
    default: 'MEMBER',
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED'],
    default: 'PENDING',
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

organizationInviteSchema.index({ organizationId: 1, email: 1, status: 1 });
organizationInviteSchema.index({ expiresAt: 1, status: 1 });

const OrganizationInvite = mongoose.model('OrganizationInvite', organizationInviteSchema);

export default OrganizationInvite;
