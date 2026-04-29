import mongoose from 'mongoose';

const githubActivitySchema = new mongoose.Schema({
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true,
    index: true 
  },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    index: true 
  },
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task',
    index: true 
  },
  type: { 
    type: String, 
    enum: ['commit', 'pr_opened', 'pr_merged', 'branch_created', 'push'], 
    required: true 
  },
  githubRepoId: { type: String, required: true },
  referenceId: { type: String }, // SHA or PR number
  author: {
    username: String,
    avatarUrl: String
  },
  message: { type: String },
  url: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: false // We use our own createdAt from GitHub or event time
});

githubActivitySchema.index({ workspaceId: 1, createdAt: -1 });

export default githubActivitySchema;
