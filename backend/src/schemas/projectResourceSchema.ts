import mongoose from 'mongoose';

const projectResourceSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true, 
    index: true 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    index: true 
  },
  title: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['link', 'credential', 'note'], 
    required: true 
  },
  url: { type: String, trim: true },
  username: { type: String, trim: true },
  password: { type: String }, // Stored encrypted
  description: { type: String },
  tags: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

projectResourceSchema.virtual('id').get(function() {
  return this._id;
});

export default projectResourceSchema;
