import mongoose from 'mongoose';

const taskTagSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true,
    index: true 
  },
  tagId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tag', 
    required: true,
    index: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  }
}, {
  timestamps: true
});

// Unique constraint to prevent duplicate tags on a single task
taskTagSchema.index({ taskId: 1, tagId: 1 }, { unique: true });

export default taskTagSchema;
