import mongoose from 'mongoose';

// Enhanced Page Schema for Professional Document Platform
// Fully backward compatible with v1, adds rich features in v2

const pageSchemaV2 = new mongoose.Schema(
  {
    // ========================================================================
    // IDENTITY
    // ========================================================================
    publicId: {
      type: String,
      default: () => `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      unique: true,
      sparse: true,
      index: true,
    },
    publicSlug: {
      type: String,
      default: () => `page_${Math.random().toString(36).substr(2, 9)}`,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    // ========================================================================
    // CORE CONTENT
    // ========================================================================
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    description: {
      type: String,
      default: '',
      index: 'text',
    },
    content: {
      type: mongoose.Schema.Types.Mixed, // Accept both string and JSON
      default: '<p></p>',
      index: 'text',
    },
    plainText: {
      type: String,
      default: '',
      index: 'text', // Full-text search index
    },
    icon: {
      type: String,
      default: 'P', // Default icon
    },
    coverUrl: {
      type: String,
      default: null,
    },

    // ========================================================================
    // CONTENT METADATA
    // ========================================================================
    wordCount: {
      type: Number,
      default: 0,
      index: true,
    },
    characterCount: {
      type: Number,
      default: 0,
    },
    blockCount: {
      type: Number,
      default: 0,
    },
    readingTimeSeconds: {
      type: Number,
      default: 0,
    },

    // ========================================================================
    // RICH BLOCKS (NOT IMPLEMENTED IN V1, PREPARED FOR V2)
    // ========================================================================
    blocks: [
      {
        id: { type: String, unique: false },
        type: {
          type: String,
          enum: [
            'text',
            'heading',
            'paragraph',
            'image',
            'video',
            'code',
            'quote',
            'callout',
            'table',
            'divider',
            'checklist',
            'toggle',
            'embed',
            'file',
            'mention',
            'task',
            'equation',
            'bookmark',
          ],
        },
        content: String,
        metadata: mongoose.Schema.Types.Mixed,
        children: [mongoose.Schema.Types.Mixed],
        position: Number,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // ========================================================================
    // VERSIONING
    // ========================================================================
    version: {
      type: Number,
      default: 1,
    },
    lastVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PageVersion',
      default: null,
    },

    // ========================================================================
    // COLLABORATION
    // ========================================================================
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['viewer', 'commenter', 'editor', 'owner'],
          default: 'viewer',
        },
        addedAt: { type: Date, default: Date.now },
        lastAccessedAt: { type: Date, default: Date.now },
      },
    ],
    activeEditorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    lastActiveEditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PageComment',
        default: [],
      },
    ],
    allowComments: {
      type: Boolean,
      default: true,
    },

    // ========================================================================
    // PAGE RELATIONS
    // ========================================================================
    parentPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      default: null,
      index: true,
    },
    childPageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Page',
        default: [],
      },
    ],
    linkedTaskIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: [],
      },
    ],
    linkedProjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: [],
      },
    ],
    linkedPageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Page',
        default: [],
      },
    ],
    mentionedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],

    // ========================================================================
    // CATEGORIZATION
    // ========================================================================
    tags: [
      {
        type: String,
        default: [],
        index: true,
      },
    ],
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ========================================================================
    // ACCESS CONTROL
    // ========================================================================
    visibility: {
      type: String,
      enum: ['PRIVATE', 'WORKSPACE', 'PUBLIC'],
      default: 'WORKSPACE',
      index: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    shares: [
      {
        id: String,
        userId: mongoose.Schema.Types.ObjectId,
        role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
        sharedAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ========================================================================
    // SETTINGS
    // ========================================================================
    allowSharing: {
      type: Boolean,
      default: true,
    },
    showInPublic: {
      type: Boolean,
      default: false,
    },
    allowExport: {
      type: Boolean,
      default: true,
    },

    // ========================================================================
    // SEARCH INDEX (for FTS)
    // ========================================================================
    searchIndex: {
      type: String,
      default: '',
    },

    // ========================================================================
    // LEGACY FIELDS (v1 compatibility)
    // ========================================================================
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdByPlatform: {
      type: String,
      enum: ['v1', 'v2'],
      default: 'v2',
    },

    // ========================================================================
    // TIMESTAMPS
    // ========================================================================
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'pages_v2', // Separate collection for new pages (can be merged later)
  },
);

// ============================================================================
// INDEXES (Critical for Performance)
// ============================================================================

// Full-text search index
pageSchemaV2.index({ title: 'text', description: 'text', plainText: 'text', tags: 'text' });

// Common queries
pageSchemaV2.index({ organizationId: 1, visibility: 1, createdAt: -1 });
pageSchemaV2.index({ creatorId: 1, createdAt: -1 });
pageSchemaV2.index({ organizationId: 1, parentPageId: 1 }); // Nested pages
pageSchemaV2.index({ organizationId: 1, tags: 1 });
pageSchemaV2.index({ visibility: 1, isPublished: 1 });
pageSchemaV2.index({ linkedTaskIds: 1 });
pageSchemaV2.index({ linkedProjectIds: 1 });
pageSchemaV2.index({ allowedUsers: 1 }); // For "shared with me"
pageSchemaV2.index({ isFavorite: 1, updatedAt: -1 });
pageSchemaV2.index({ isPinned: 1, createdAt: -1 });
pageSchemaV2.index({ isArchived: 1, updatedAt: -1 });

// Public pages
pageSchemaV2.index({ publicId: 1 });
pageSchemaV2.index({ publicSlug: 1 });
pageSchemaV2.index({ isPublished: 1, publicId: 1 });

// Collaboration
pageSchemaV2.index({ activeEditorIds: 1 });

// Compound index for common filters
pageSchemaV2.index({ organizationId: 1, visibility: 1, isArchived: 1, updatedAt: -1 });

// ============================================================================
// PAGE COMMENT SCHEMA
// ============================================================================

const pageCommentSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
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
      default: null, // If commenting on specific block
    },
    lineNumber: {
      type: Number,
      default: null, // For code blocks
    },
    replies: [
      {
        _id: mongoose.Schema.Types.ObjectId,
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

// ============================================================================
// PAGE VERSION SCHEMA
// ============================================================================

const pageVersionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
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
      type: mongoose.Schema.Types.Mixed, // Serialized TipTap content
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
  { timestamps: false }, // Versions are immutable
);

pageVersionSchema.index({ pageId: 1, versionNumber: -1 });
pageVersionSchema.index({ pageId: 1, createdAt: -1 });
pageVersionSchema.index({ createdBy: 1, createdAt: -1 });

// ============================================================================
// MODELS
// ============================================================================

const PageV2 = mongoose.model('PageV2', pageSchemaV2, 'pages_v2');
const PageComment = mongoose.model('PageComment', pageCommentSchema, 'page_comments');
const PageVersion = mongoose.model('PageVersion', pageVersionSchema, 'page_versions');

export { PageV2, PageComment, PageVersion, pageSchemaV2, pageCommentSchema, pageVersionSchema };
