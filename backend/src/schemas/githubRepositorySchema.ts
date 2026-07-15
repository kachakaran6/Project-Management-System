import mongoose from 'mongoose';

const githubRepositorySchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: false,
    index: true 
  },
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true,
    index: true 
  },
  repoId: { type: String, required: true }, // GitHub repo ID
  repoName: { type: String, required: true },
  fullName: { type: String, required: true },
  owner: { type: String, required: true },
  branch: { type: String, default: 'main' },
  permissions: { type: String, enum: ['read', 'write'], default: 'read' },
  webhookId: { type: String },
  webhookSecret: { type: String },
  isWebhookActive: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: Date.now },
  settings: {
    autoStatusUpdate: { type: Boolean, default: true },
    commitFallback: { type: Boolean, default: true },
    enforceBranchNaming: { type: Boolean, default: false },
    autoAssignPrAuthor: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Ensure a repo is only linked once per workspace
githubRepositorySchema.index({ workspaceId: 1, repoId: 1 }, { unique: true });

export default githubRepositorySchema;
