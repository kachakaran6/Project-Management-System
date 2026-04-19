import mongoose from 'mongoose';
import { TASK_STATUS, TASK_PRIORITY } from '../constants/index.js';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: false,
    index: true 
  },
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    index: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: Object.values(TASK_STATUS), 
    default: TASK_STATUS.TODO 
  },
  priority: { 
    type: String, 
    enum: Object.values(TASK_PRIORITY), 
    default: TASK_PRIORITY.MEDIUM 
  },
  dueDate: { type: Date },
  startDate: { type: Date },
  position: { type: Number, default: 0 }, // For drag-and-drop ordering
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to map _id to id for API responses
taskSchema.virtual('id').get(function() {
  return this._id;
});

// Compound indexes for common queries
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, dueDate: 1 });
taskSchema.index({ organizationId: 1, creatorId: 1 });

// Full-text search index
taskSchema.index({ title: 'text', description: 'text' });

export default taskSchema;
