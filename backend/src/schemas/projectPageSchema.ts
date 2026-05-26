import mongoose from 'mongoose';

const projectPageSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  pageId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Page',
    required: true,
    index: true
  },
  linkedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
});

// Ensure a page is only linked to a project once
projectPageSchema.index({ projectId: 1, pageId: 1 }, { unique: true });

export default projectPageSchema;
