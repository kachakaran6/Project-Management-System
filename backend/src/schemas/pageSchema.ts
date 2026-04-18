import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '<p></p>' },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE'],
    default: 'PUBLIC',
    index: true,
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
    default: null,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

pageSchema.index({ organizationId: 1, createdAt: -1 });
pageSchema.index({ creatorId: 1, createdAt: -1 });
pageSchema.index({ title: 'text', content: 'text' });

export default pageSchema;
