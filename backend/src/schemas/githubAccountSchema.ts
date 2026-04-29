import mongoose from 'mongoose';

const githubAccountSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true,
    index: true 
  },
  githubUserId: { type: String, required: true },
  username: { type: String, required: true },
  accessToken: { type: String, required: true }, // Encrypted
  avatarUrl: { type: String },
  email: { type: String },
  lastSyncedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default githubAccountSchema;
