// Enhanced Page Types for Professional Document Platform
// Maintains backward compatibility while adding rich features

import type { ObjectId } from 'mongoose';

// ============================================================================
// VISIBILITY & ACCESS CONTROL
// ============================================================================

export type PageVisibility = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
export type PageRole = 'viewer' | 'commenter' | 'editor' | 'owner';

export interface PageShare {
  id: string;
  userId: ObjectId;
  role: PageRole;
  sharedAt: Date;
  expiresAt?: Date;
}

export interface PageCollaborator {
  userId: ObjectId;
  role: PageRole;
  addedAt: Date;
  lastAccessedAt: Date;
}

// ============================================================================
// CONTENT BLOCKS (TipTap Serialized)
// ============================================================================

export type BlockType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'code'
  | 'quote'
  | 'callout'
  | 'table'
  | 'divider'
  | 'checklist'
  | 'toggle'
  | 'embed'
  | 'file'
  | 'mention'
  | 'task'
  | 'equation'
  | 'bookmark'
  | 'kanban'
  | 'database';

export interface PageBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata: Record<string, unknown>;
  children?: PageBlock[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// TipTap Serialized Content
export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  text?: string;
}

// ============================================================================
// VERSION HISTORY
// ============================================================================

export interface PageVersion {
  _id: ObjectId;
  pageId: ObjectId;
  versionNumber: number;
  title: string;
  content: JSONContent;
  plainText: string;
  wordCount: number;
  createdBy: ObjectId;
  createdAt: Date;
  changeDescription?: string;
  changeType?: 'auto-save' | 'manual' | 'restore' | 'import';
  tags?: string[];
}

export interface PageVersionBrowser {
  versionId: ObjectId;
  versionNumber: number;
  title: string;
  createdBy: {
    id: ObjectId;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  changeType: string;
  changeDescription?: string;
  wordCount: number;
}

export interface VersionDiff {
  addedBlocks: PageBlock[];
  removedBlocks: PageBlock[];
  modifiedBlocks: Array<{
    blockId: string;
    before: PageBlock;
    after: PageBlock;
  }>;
  reorderedBlocks: Array<{
    blockId: string;
    fromPosition: number;
    toPosition: number;
  }>;
}

// ============================================================================
// COMMENTS & COLLABORATION
// ============================================================================

export interface PageComment {
  _id: ObjectId;
  pageId: ObjectId;
  authorId: ObjectId;
  content: string;
  blockId?: string; // If commenting on specific block
  lineNumber?: number; // For code blocks
  replies: PageCommentReply[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PageCommentReply {
  _id: ObjectId;
  authorId: ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresenceData {
  userId: ObjectId;
  userName: string;
  userColor: string;
  cursorPosition?: {
    line: number;
    char: number;
  };
  selection?: {
    startLine: number;
    startChar: number;
    endLine: number;
    endChar: number;
  };
  isTyping: boolean;
  lastActiveAt: Date;
}

// ============================================================================
// PAGE METADATA & RELATIONS
// ============================================================================

export interface PageMetadata {
  icon?: string; // Emoji or icon name
  coverUrl?: string;
  description?: string;
  tags?: string[];
  readingTimeSeconds?: number;
  wordCount?: number;
  characterCount?: number;
  blockCount?: number;
}

export interface PageRelations {
  parentPageId?: ObjectId; // For nested pages
  childPageIds?: ObjectId[]; // Sub-pages
  linkedTaskIds?: ObjectId[]; // Related tasks
  linkedProjectIds?: ObjectId[]; // Related projects
  linkedPageIds?: ObjectId[]; // Manual page links (backlinks)
  mentionedUserIds?: ObjectId[]; // Users mentioned
  referencedPageIds?: ObjectId[]; // Pages referenced
}

export interface PageHierarchy {
  level: number; // 0 = root, 1 = nested, etc.
  path: ObjectId[]; // Full path from root to this page
  position: number; // Order among siblings
}

export interface PageSearchIndex {
  title: string;
  description: string;
  content: string; // Full plaintext content
  tags: string[];
  creatorName: string;
  lastModifiedBy: string;
}

// ============================================================================
// COMPLETE PAGE DOCUMENT (ENHANCED)
// ============================================================================

export interface PageDocV2 {
  // Identity
  _id: ObjectId;
  publicId: string; // Unique public share ID
  publicSlug: string; // URL-friendly slug
  organizationId?: ObjectId;

  // Core Content
  title: string;
  description?: string;
  content: JSONContent | string; // Accept both for backward compatibility
  plainText?: string; // Extracted full text for search
  icon?: string;
  coverUrl?: string;

  // Content Metadata
  wordCount: number;
  characterCount?: number;
  blockCount?: number;
  readingTimeSeconds?: number;

  // Rich Structure
  blocks?: PageBlock[];
  version: number;
  lastVersionId?: ObjectId;

  // Collaboration
  collaborators?: PageCollaborator[];
  activeEditorIds?: ObjectId[];
  lastActiveEditor?: ObjectId;
  comments?: ObjectId[]; // References to PageComment docs
  allowComments: boolean;

  // Relations
  parentPageId?: ObjectId;
  childPageIds?: ObjectId[];
  linkedTaskIds?: ObjectId[];
  linkedProjectIds?: ObjectId[];
  linkedPageIds?: ObjectId[];
  mentionedUserIds?: ObjectId[];

  // Categorization
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;

  // Access Control
  visibility: PageVisibility;
  creatorId: ObjectId;
  allowedUsers?: ObjectId[];
  shares?: PageShare[]; // Detailed sharing info
  isPublished?: boolean;

  // Settings
  allowSharing: boolean;
  showInPublic: boolean;
  allowExport: boolean;

  // Search Index
  searchIndex?: string; // Full-text search index

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastEditedAt?: Date;

  // Legacy compatibility
  createdByPlatform?: 'v1' | 'v2'; // Track origin
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePageInput {
  title: string;
  content?: JSONContent | string;
  visibility?: PageVisibility;
  allowedUsers?: ObjectId[];
  icon?: string;
  description?: string;
  parentPageId?: ObjectId;
}

export interface UpdatePageInput {
  title?: string;
  content?: JSONContent | string;
  visibility?: PageVisibility;
  allowedUsers?: ObjectId[];
  description?: string;
  icon?: string;
  coverUrl?: string;
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
}

export interface PageFiltersInput {
  page?: number;
  limit?: number;
  visibility?: PageVisibility[];
  search?: string;
  createdByMe?: boolean;
  recentlyEdited?: boolean;
  tags?: string[];
  hasLinkedTasks?: boolean;
  showArchived?: boolean;
  parentPageId?: ObjectId;
}

export interface PageListResponse {
  items: PageDocV2[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SharePageInput {
  userId: ObjectId;
  role: PageRole;
  expiresAt?: Date;
}

export interface ExportPageInput {
  format: 'pdf' | 'docx' | 'markdown' | 'html';
  includeComments?: boolean;
  includeHistory?: boolean;
  includeMetadata?: boolean;
  pageBreaks?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface AddCommentInput {
  content: string;
  blockId?: string;
  lineNumber?: number;
}

export interface PageSearchResult {
  id: ObjectId;
  title: string;
  description?: string;
  excerpt?: string; // Text snippet with search term highlighted
  visibility: PageVisibility;
  creator: {
    id: ObjectId;
    name: string;
    avatarUrl?: string;
  };
  updatedAt: Date;
  relevanceScore: number;
}

// ============================================================================
// BACKWARD COMPATIBILITY LAYER
// ============================================================================

export interface PageDocV1 {
  _id: ObjectId;
  title: string;
  content: string;
  visibility: PageVisibility;
  publicId?: string;
  publicSlug?: string;
  isPublished?: boolean;
  allowedUsers?: ObjectId[];
  organizationId?: ObjectId;
  creatorId: ObjectId;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert V1 to V2
export function migratePageV1toV2(pageV1: PageDocV1): PageDocV2 {
  return {
    _id: pageV1._id,
    publicId: pageV1.publicId || `page_${pageV1._id}`,
    publicSlug: pageV1.publicSlug || `page_${Date.now()}`,
    organizationId: pageV1.organizationId,
    title: pageV1.title,
    content: pageV1.content, // Keep original
    plainText: extractPlainText(pageV1.content),
    wordCount: calculateWordCount(pageV1.content),
    characterCount: pageV1.content.length,
    blockCount: 0,
    version: 1,
    visibility: pageV1.visibility,
    creatorId: pageV1.creatorId,
    allowedUsers: pageV1.allowedUsers,
    isPublished: pageV1.isPublished || false,
    allowComments: true,
    allowSharing: true,
    showInPublic: pageV1.visibility === 'PUBLIC',
    allowExport: true,
    isFavorite: false,
    isPinned: false,
    isArchived: !pageV1.isActive,
    createdAt: pageV1.createdAt,
    updatedAt: pageV1.updatedAt,
    createdByPlatform: 'v1',
  };
}

// Helper functions
function extractPlainText(content: string): string {
  // Remove HTML tags and extract plain text
  return content
    .replace(/<[^>]*>/g, '')
    .trim();
}

function calculateWordCount(content: string): number {
  const plainText = extractPlainText(content);
  return plainText.split(/\s+/).filter(word => word.length > 0).length;
}

// ============================================================================
// PUBLIC PAGE TYPES (for sharing)
// ============================================================================

export interface PublicPageMetadata {
  title: string;
  description?: string;
  icon?: string;
  coverUrl?: string;
  author?: {
    name: string;
    avatarUrl?: string;
  };
  readingTime?: number;
  wordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPageView {
  content: JSONContent | string;
  metadata: PublicPageMetadata;
  linkedPages?: Array<{
    id: string;
    title: string;
    publicSlug: string;
  }>;
}
