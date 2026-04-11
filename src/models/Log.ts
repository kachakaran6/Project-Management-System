import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info',
    index: true
  },
  message: { type: String, required: true },
  action: { type: String, index: true }, // e.g., 'CREATE_TASK', 'LOGIN_SUCCESS'
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILURE'], 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  requestId: { type: String, index: true },
  endpoint: { type: String },
  method: { type: String },
  responseTime: { type: Number }, // in ms
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  stack: { type: String } // For errors
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Auto-delete logs after 30 days (Log Retention Strategy)
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Add text index for searching messages and actions
logSchema.index({ message: 'text', action: 'text' });

const Log = mongoose.model('Log', logSchema);

export default Log;
