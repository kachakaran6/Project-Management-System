import mongoose from 'mongoose';
import { ACTIVITY_ACTIONS } from '../constants/index.js';

const activitySchema = new mongoose.Schema({
  action: { 
    type: String, 
    enum: Object.values(ACTIVITY_ACTIONS), 
    required: true,
    index: true 
  },
  actorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the Task, Project, etc.
  entityType: { 
    type: String, 
    enum: ['Task', 'Project', 'Workspace', 'Organization', 'Comment'], 
    required: true 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, // Flexible JSON for diffs, etc.
    default: {} 
  },
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only need creation time
});

// Index for auditing specific entities
activitySchema.index({ entityId: 1, entityType: 1 });
// Index for time-based filtering in dashboards
activitySchema.index({ organizationId: 1, createdAt: -1 });

export default activitySchema;
