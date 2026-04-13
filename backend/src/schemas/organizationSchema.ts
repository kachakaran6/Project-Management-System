import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  logoUrl: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  meta: {
    description: { type: String },
    industry: { type: String },
    size: { type: String }
  }
}, {
  timestamps: true
});

// Index for slug-based lookups
organizationSchema.index({ slug: 1 });

export default organizationSchema;
