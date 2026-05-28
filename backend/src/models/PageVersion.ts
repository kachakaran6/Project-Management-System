import mongoose from 'mongoose';

const pageVersionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PageV2',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    plainText: {
      type: String,
      default: '',
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeDescription: {
      type: String,
      default: null,
    },
    changeType: {
      type: String,
      enum: ['auto-save', 'manual', 'restore', 'import'],
      default: 'auto-save',
    },
    tags: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false },
);

pageVersionSchema.index({ pageId: 1, versionNumber: -1 });
pageVersionSchema.index({ pageId: 1, createdAt: -1 });
pageVersionSchema.index({ createdBy: 1, createdAt: -1 });

const PageVersion = (mongoose.models && (mongoose.models as any).PageVersion) || mongoose.model('PageVersion', pageVersionSchema, 'page_versions');

export default PageVersion;
