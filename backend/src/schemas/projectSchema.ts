import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
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
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'completed', 'archived', 'planned', 'on_hold'], default: 'active' },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date },
  endDate: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to map _id to id for API responses
projectSchema.virtual('id').get(function() {
  return this._id;
});

// Index for workspace-level project listing
projectSchema.index({ workspaceId: 1, createdAt: -1 });

// Full-text search index
projectSchema.index({ name: 'text', description: 'text' });

export default projectSchema;
