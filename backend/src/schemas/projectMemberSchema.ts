import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
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
  role: { 
    type: String, 
    enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'], 
    default: 'MEMBER' 
  },
  isActive: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure a user is only added once to a project
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export default projectMemberSchema;
