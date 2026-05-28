import mongoose from 'mongoose';

const pageCommentSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PageV2',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    blockId: {
      type: String,
      default: null,
    },
    lineNumber: {
      type: Number,
      default: null,
    },
    replies: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

pageCommentSchema.index({ pageId: 1, createdAt: -1 });

const PageComment = (mongoose.models && (mongoose.models as any).PageComment) || mongoose.model('PageComment', pageCommentSchema, 'page_comments');

export default PageComment;
