import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: true 
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  },
  replacedByToken: { 
    type: String 
  } // for token rotation
}, {
  timestamps: true
});

// Auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
