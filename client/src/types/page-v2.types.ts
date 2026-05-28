// Enhanced Client-side Page Types
// Maintains full compatibility while adding rich editing features

export type PageVisibility = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
export type PageRole = 'viewer' | 'commenter' | 'editor' | 'owner';

// ============================================================================
// BASIC TYPES
// ============================================================================

export interface PageAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface PublicPageAuthor {
  name: string;
  avatarUrl?: string;
}

// ============================================================================
// PAGE DOCUMENTS
// ============================================================================

export interface PageDoc {
  id: string;
  title: string;
  content: string;
  visibility: PageVisibility;
  creatorId: string;
  creator?: PageAuthor;
  allowedUsers?: string[];
  publicId?: string | null;
  publicSlug?: string | null;
  publicUrl?: string | null;
  isPublished?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface PublicPageDoc {
  title: string;
  content: string;
  publicUrl?: string | null;
  author?: PublicPageAuthor | null;
  updatedAt: string;
}

// ============================================================================
// ENHANCED PAGE DOCUMENT (V2)
// ============================================================================

export interface PageDocV2 extends PageDoc {
  description?: string;
  icon?: string;
  coverUrl?: string;
  wordCount?: number;
  readingTimeSeconds?: number;
  plainText?: string;
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  parentPageId?: string;
  childPageIds?: string[];
  linkedTaskIds?: string[];
  linkedProjectIds?: string[];
  allowComments?: boolean;
  collaborators?: PageCollaborator[];
  lastEditedAt?: string;
}

export interface PageCollaborator {
  userId: string;
  role: PageRole;
  addedAt: string;
  lastAccessedAt: string;
  user?: PageAuthor;
}

// ============================================================================
// RICH CONTENT TYPES (TipTap)
// ============================================================================

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

export type BlockType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'image'
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
  | 'bookmark';

export interface PageBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata: Record<string, unknown>;
  children?: PageBlock[];
  position: number;
}

// ============================================================================
// VERSION HISTORY
// ============================================================================

export interface PageVersion {
  id: string;
  pageId: string;
  versionNumber: number;
  title: string;
  wordCount: number;
  createdBy: PageAuthor;
  createdAt: string;
  changeType: 'auto-save' | 'manual' | 'restore' | 'import';
  changeDescription?: string;
}

export interface PageVersionBrowser {
  id: string;
  versionNumber: number;
  title: string;
  createdBy: PageAuthor;
  createdAt: string;
  changeType: string;
  changeDescription?: string;
  wordCount: number;
}

// ============================================================================
// COMMENTS
// ============================================================================

export interface PageComment {
  id: string;
  pageId: string;
  author: PageAuthor;
  content: string;
  blockId?: string;
  lineNumber?: number;
  replies: PageCommentReply[];
  createdAt: string;
  updatedAt: string;
}

export interface PageCommentReply {
  id: string;
  author: PageAuthor;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COLLABORATION
// ============================================================================

export interface PresenceData {
  userId: string;
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
  lastActiveAt: string;
}

// ============================================================================
// API FILTERS & INPUTS
// ============================================================================

export interface PageFilters {
  page?: number;
  limit?: number;
  visibility?: PageVisibility[];
  search?: string;
  createdByMe?: boolean;
  recentlyEdited?: boolean;
  tags?: string[];
  hasLinkedTasks?: boolean;
  showArchived?: boolean;
  parentPageId?: string;
}

export interface CreatePageInput {
  title: string;
  content?: JSONContent | string;
  visibility?: PageVisibility;
  allowedUsers?: string[];
  description?: string;
  icon?: string;
  parentPageId?: string;
}

export interface UpdatePageInput {
  title?: string;
  content?: JSONContent | string;
  visibility?: PageVisibility;
  allowedUsers?: string[];
  description?: string;
  icon?: string;
  coverUrl?: string;
  tags?: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface SharePageInput {
  userId: string;
  role: PageRole;
  expiresAt?: Date;
}

export interface AddCommentInput {
  content: string;
  blockId?: string;
  lineNumber?: number;
}

export interface ExportPageOptions {
  format: 'pdf' | 'docx' | 'markdown' | 'html';
  includeComments?: boolean;
  includeMetadata?: boolean;
  pageBreaks?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

// ============================================================================
// SEARCH
// ============================================================================

export interface PageSearchResult {
  id: string;
  title: string;
  description?: string;
  excerpt?: string;
  visibility: PageVisibility;
  creator: PageAuthor;
  updatedAt: string;
  relevanceScore: number;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PageListResponse {
  items: PageDocV2[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PageVersionListResponse {
  versions: PageVersionBrowser[];
  total: number;
}

export interface PageSearchResponse {
  results: PageSearchResult[];
  total: number;
  query: string;
}
