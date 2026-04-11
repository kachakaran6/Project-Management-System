import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  description: { type: String },
  icon: { type: String },
  isPrivate: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound index for scoped uniqueness
workspaceSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

// Full-text search index
workspaceSchema.index({ name: 'text', description: 'text' });

export default workspaceSchema;
