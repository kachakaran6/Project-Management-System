import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '<p></p>' },
  visibility: {
    type: String,
    enum: ['PRIVATE', 'WORKSPACE', 'PUBLIC'],
    default: 'WORKSPACE',
    index: true,
  },
  publicId: {
    type: String,
    default: null,
    unique: true,
    sparse: true,
    index: true,
  },
  publicSlug: {
    type: String,
    default: null,
  },
  isPublished: {
    type: Boolean,
    default: false,
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
pageSchema.index({ isPublished: 1, publicId: 1 });
pageSchema.index({ title: 'text', content: 'text' });

export default pageSchema;
