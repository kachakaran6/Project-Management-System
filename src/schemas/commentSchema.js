import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true,
    index: true 
  },
  authorId: { 
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
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // For threaded comments
  isEdited: { type: Boolean, default: false },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // New: Store mentioned user IDs
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }]
}, {
  timestamps: true
});

// Index for task-level comment threads
commentSchema.index({ taskId: 1, createdAt: 1 });

export default commentSchema;
