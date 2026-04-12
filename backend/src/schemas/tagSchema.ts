import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' }, // Indigo-500 default
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  workspaceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace',
    index: true 
  }
}, {
  timestamps: true
});

// Unique tag name per organization/workspace
tagSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export default tagSchema;
