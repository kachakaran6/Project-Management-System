import mongoose from 'mongoose';
import { ROLES } from '../constants/index.js';

const workspaceMemberSchema = new mongoose.Schema({
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true,
    index: true 
  },
  userId: { 
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
  roleOverride: { 
    type: String, 
    enum: Object.values(ROLES) 
  }
}, {
  timestamps: true
});

// Compound index for uniqueness and filtering
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ organizationId: 1, userId: 1 });

export default workspaceMemberSchema;
