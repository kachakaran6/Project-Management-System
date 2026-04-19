import mongoose from 'mongoose';

const telegramConnectionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true
  },
  chatId: { 
    type: String, 
    default: null 
  },
  isConnected: { 
    type: Boolean, 
    default: false 
  },
  role: {
    type: String,
    enum: ['ADMIN', 'MEMBER'],
    default: 'MEMBER'
  },
  verificationToken: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// A user can have one connection per organization
telegramConnectionSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

export default telegramConnectionSchema;
