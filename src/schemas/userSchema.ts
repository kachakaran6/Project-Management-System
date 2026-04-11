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
  password: { type: String, required: true, select: false },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'ADMIN', 'USER'], 
    default: 'USER' 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'PENDING_APPROVAL'], 
    default: 'ACTIVE' 
  },
  isApproved: { type: Boolean, default: true },
  avatarUrl: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  lastLogin: { type: Date },
  settings: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Full-text search index
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

export default userSchema;
