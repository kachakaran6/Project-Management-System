import mongoose from 'mongoose';

const taskPageSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task',
    required: true,
    index: true
  },
  pageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Page',
    required: true,
    index: true
  },
  linkedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
});

// Ensure a page is only linked to a task once
taskPageSchema.index({ taskId: 1, pageId: 1 }, { unique: true });

export default taskPageSchema;
