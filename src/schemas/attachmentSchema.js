import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true }, // In bytes
  fileUrl: { type: String, required: true },
  key: { type: String, required: true }, // S3/Cloud storage key
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task',
    index: true 
  },
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export default attachmentSchema;
