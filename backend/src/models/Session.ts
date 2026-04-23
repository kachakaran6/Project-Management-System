import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'unknown'],
      default: 'unknown',
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, isActive: 1, lastActiveAt: -1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;
