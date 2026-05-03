import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  password: { type: String, required: false, select: false },
  provider: { 
    type: String, 
    enum: ['local', 'google', 'github'], 
    default: 'local' 
  },
  providerId: { type: String, index: true },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'USER', 'VIEWER'], 
    default: 'USER' 
  },
  requestedRole: {
    type: String,
    enum: ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'USER', 'VIEWER'],
    default: null,
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'PENDING_APPROVAL'], 
    default: 'ACTIVE' 
  },
  accessRequestStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'NONE',
  },
  accessRequestNote: { type: String },
  accessRequestedAt: { type: Date },
  accessReviewedAt: { type: Date },
  isApproved: { type: Boolean, default: true },
  avatarUrl: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  // OTP verification fields
  otpCode: { type: String, select: false },
  otpExpires: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  tokenVersion: { type: Number, default: 0 },
  lastLogin: { type: Date },
  settings: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      telegram: { type: Boolean, default: true },
      
      // Granular Personal Preferences
      notifyOnAssignment: { type: Boolean, default: true },
      notifyOnMention: { type: Boolean, default: true },
      notifyOnComment: { type: Boolean, default: true },
      notifyOnTaskUpdate: { type: Boolean, default: false }
    },
    telegramSettings: {
      enabled: { type: Boolean, default: true },
      taskNotifications: {
        all: { type: Boolean, default: false },       // ADMIN only
        assigned: { type: Boolean, default: true },   // MEMBER default
        created: { type: Boolean, default: true }
      },
      projectNotifications: {
        all: { type: Boolean, default: false },       // ADMIN only
        created: { type: Boolean, default: true }
      },
      activityNotifications: {
        all: { type: Boolean, default: false },       // ADMIN only
        own: { type: Boolean, default: true }
      },
      loginNotifications: {
        all: { type: Boolean, default: false },       // ADMIN only
        own: { type: Boolean, default: true }
      }
    },
    defaultAssignees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }],
    defaultTaskStatus: { 
      type: String, 
      default: null 
    }

  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  }
}, {
  timestamps: true
});

// Full-text search index
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

export default userSchema;
