import mongoose from 'mongoose';

const taskStatusHistorySchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByName: {
    type: String,
    required: true
  },
  fromStatus: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  fromStatusName: String,
  fromStatusColor: String,
  toStatus: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  toStatusName: {
    type: String,
    required: true
  },
  toStatusColor: {
    type: String,
    default: '#64748b'
  },
  changedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  }
}, {
  timestamps: false
});

// Index for quick lookups
taskStatusHistorySchema.index({ taskId: 1, changedAt: -1 });

export default taskStatusHistorySchema;
