import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import PageV2 from '../../models/PageV2.js';
import PageComment from '../../models/PageComment.js';
import PageVersion from '../../models/PageVersion.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { createActivityLog } from '../../services/activityLogService.js';

import type {
  PageDocV2,
  PageVisibility,
  PageRole,
  PageVersionBrowser,
  PageSearchResult,
  AddCommentInput,
  ExportPageInput,
  JSONContent,
} from '../../types/pageTypes.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const resolveOrganizationId = (requestLike: {
  organizationId?: string | null;
  headers?: Record<string, unknown>;
}): string | null => {
  if (requestLike.organizationId) {
    return requestLike.organizationId;
  }

  const headerValue = requestLike.headers?.['x-organization-id'];
  if (Array.isArray(headerValue)) {
    return headerValue[0] || null;
  }

  return typeof headerValue === 'string' ? headerValue : null;
};

const safeObjectId = (id: unknown): mongoose.Types.ObjectId | null => {
  if (!id) return null;
  try {
    return mongoose.Types.ObjectId.isValid(String(id))
      ? new mongoose.Types.ObjectId(String(id))
      : null;
  } catch {
    return null;
  }
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

const normalizeVisibility = (value: unknown): PageVisibility => {
  const normalized = String(value || 'WORKSPACE').trim().toUpperCase();
  if (normalized === 'PRIVATE' || normalized === 'PUBLIC') {
    return normalized as PageVisibility;
  }
  return 'WORKSPACE';
};

// Extract plain text from HTML content
export const extractPlainText = (content: unknown): string => {
  if (typeof content !== 'string') return '';
  
  // Handle HTML
  if (content.includes('<')) {
    return content
      .replace(/<[^>]*>/g, '')
      .trim();
  }
  
  // Handle JSON (TipTap)
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    if (parsed && typeof parsed === 'object') {
      return extractTextFromJSON(parsed);
    }
  } catch {
    // Not JSON, return as-is
  }
  
  return String(content).trim();
};

const extractTextFromJSON = (obj: unknown): string => {
  if (typeof obj === 'string') return obj;
  if (!obj || typeof obj !== 'object') return '';
  
  const content = obj as Record<string, unknown>;
  
  if (content.text && typeof content.text === 'string') {
    return content.text;
  }
  
  if (Array.isArray(content.content)) {
    return content.content
      .map(item => extractTextFromJSON(item))
      .join(' ')
      .trim();
  }
  
  return '';
};

// Calculate word count
export const calculateWordCount = (content: unknown): number => {
  const plainText = extractPlainText(content);
  return plainText.split(/\s+/).filter(word => word.length > 0).length;
};

// Calculate reading time in seconds (200 words per minute average)
const calculateReadingTime = (wordCount: number): number => {
  return Math.ceil((wordCount / 200) * 60);
};

// Build search index for full-text search
const buildSearchIndex = (page: Partial<PageDocV2>): string => {
  const parts = [
    page.title || '',
    page.description || '',
    page.plainText || '',
    (page.tags || []).join(' '),
  ];
  return parts.join(' ').toLowerCase();
};

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Create a new page with enhanced features
 */
export const createPageV2 = async (
  data: {
    title: string;
    content?: JSONContent | string;
    visibility?: PageVisibility;
    allowedUsers?: string[];
    description?: string;
    icon?: string;
    parentPageId?: string;
    creatorId: string;
    organizationId?: string;
  },
): Promise<PageDocV2> => {
  const creatorId = safeObjectId(data.creatorId);
  if (!creatorId) throw new AppError('Invalid creator ID', 400);

  const organizationId = data.organizationId ? safeObjectId(data.organizationId) : undefined;

  const plainText = extractPlainText(data.content);
  const wordCount = calculateWordCount(data.content);
  const readingTime = calculateReadingTime(wordCount);

  const page = new PageV2({
    title: data.title.trim(),
    content: data.content || '<p></p>',
    plainText,
    wordCount,
    readingTimeSeconds: readingTime,
    visibility: data.visibility || 'WORKSPACE',
    description: data.description?.trim() || '',
    icon: data.icon || 'P',
    creatorId,
    organizationId,
    allowedUsers: (data.allowedUsers || [])
      .map(id => safeObjectId(id))
      .filter(id => id !== null) as mongoose.Types.ObjectId[],
    parentPageId: data.parentPageId ? safeObjectId(data.parentPageId) : undefined,
    allowComments: true,
    allowSharing: true,
    showInPublic: data.visibility === 'PUBLIC',
    searchIndex: buildSearchIndex({ title: data.title, description: data.description }),
  });

  await page.save();

  // Log activity
  await createActivityLog({
    userId: creatorId.toString(),
    organizationId: organizationId?.toString() || '',
    action: 'CREATE_PAGE',
    entityType: 'PAGE',
    entityId: page._id.toString(),
    entityName: page.title,
    metadata: {
      title: page.title,
      visibility: page.visibility,
    },
  }).catch(() => {
    // Ignore logging errors
  });

  return page as unknown as PageDocV2;
};

/**
 * Get page by ID with full data enrichment
 */
export const getPageByIdV2 = async (
  pageId: string,
  userId?: string,
): Promise<PageDocV2> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const page = await PageV2.findById(id)
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .populate('allowedUsers', 'firstName lastName email')
    .populate('collaborators.userId', 'firstName lastName email avatarUrl')
    .lean();

  if (!page) throw new AppError('Page not found', 404);

  // Update last accessed at
  if (userId) {
    const userObjId = safeObjectId(userId);
    if (userObjId) {
      await PageV2.updateOne(
        { _id: id, 'collaborators.userId': userObjId },
        { $set: { 'collaborators.$.lastAccessedAt': new Date() } },
      );
    }
  }

  return page as unknown as PageDocV2;
};

/**
 * List pages with advanced filtering and search
 */
export const listPagesV2 = async (
  filters: {
    page?: number;
    limit?: number;
    visibility?: PageVisibility[];
    search?: string;
    createdByMe?: boolean;
    createdByUserId?: string;
    tags?: string[];
    hasLinkedTasks?: boolean;
    showArchived?: boolean;
    parentPageId?: string;
    organizationId?: string;
    userRole?: string;
  },
): Promise<{
  items: PageDocV2[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> => {
  const {
    page = 1,
    limit = 20,
    visibility,
    search,
    createdByMe,
    createdByUserId,
    tags,
    hasLinkedTasks,
    showArchived = false,
    parentPageId,
    organizationId,
    userRole,
  } = filters;

  // Build query
  const query: Record<string, unknown> = {};

  // Organization filter
  if (organizationId) {
    const orgId = safeObjectId(organizationId);
    if (orgId) query.organizationId = orgId;
  }

  // Visibility filter
  if (visibility && visibility.length > 0) {
    query.visibility = { $in: visibility };
  }

  // Archive filter
  if (!showArchived) {
    query.isArchived = false;
  }

  // Created by user filter
  if (createdByMe || createdByUserId) {
    const userId = safeObjectId(createdByUserId || createdByMe);
    if (userId) query.creatorId = userId;
  }

  // Tags filter
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Linked tasks filter
  if (hasLinkedTasks) {
    query.linkedTaskIds = { $exists: true, $ne: [] };
  }

  // Parent page filter (for nested pages)
  if (parentPageId) {
    const parentId = safeObjectId(parentPageId);
    if (parentId) query.parentPageId = parentId;
  }

  // Full-text search
  if (search && search.trim()) {
    query.$text = { $search: search.trim() };
  }

  // Execute query
  const skip = (page - 1) * limit;
  const total = await PageV2.countDocuments(query);
  
  const items = await PageV2.find(query)
    .select('-content') // Don't select large content field
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    items: items as unknown as PageDocV2[],
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  };
};

/**
 * Update page
 */
export const updatePageV2 = async (
  pageId: string,
  data: Partial<PageDocV2>,
  userId: string,
): Promise<PageDocV2> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const userObjId = safeObjectId(userId);
  if (!userObjId) throw new AppError('Invalid user ID', 400);

  const page = await PageV2.findById(id);
  if (!page) throw new AppError('Page not found', 404);

  // Check permissions
  if (page.creatorId.toString() !== userId && page.visibility === 'PRIVATE') {
    const isAllowed = page.allowedUsers?.some(
      (id: mongoose.Types.ObjectId) => id.toString() === userId,
    );
    if (!isAllowed) {
      throw new AppError('You do not have permission to edit this page', 403);
    }
  }

  // Update fields
  if (data.title !== undefined) {
    page.title = data.title.trim();
  }

  if (data.description !== undefined) {
    page.description = data.description;
  }

  if (data.content !== undefined) {
    page.content = data.content;
    page.plainText = extractPlainText(data.content);
    page.wordCount = calculateWordCount(data.content);
    page.readingTimeSeconds = calculateReadingTime(page.wordCount);
  }

  if (data.visibility !== undefined) {
    page.visibility = normalizeVisibility(data.visibility);
  }

  if (data.icon !== undefined) {
    page.icon = data.icon;
  }

  if (data.coverUrl !== undefined) {
    page.coverUrl = data.coverUrl;
  }

  if (data.tags !== undefined) {
    page.tags = data.tags;
  }

  if (data.isFavorite !== undefined) {
    page.isFavorite = data.isFavorite;
  }

  if (data.isPinned !== undefined) {
    page.isPinned = data.isPinned;
  }

  if (data.isArchived !== undefined) {
    page.isArchived = data.isArchived;
  }

  if (data.allowComments !== undefined) {
    page.allowComments = data.allowComments;
  }

  // Update search index
  page.searchIndex = buildSearchIndex(page.toObject() as unknown as Partial<PageDocV2>);
  page.lastEditedAt = new Date();

  await page.save();

  // Log activity
  await createActivityLog({
    userId: userObjId.toString(),
    organizationId: page.organizationId?.toString() || '',
    action: 'UPDATE_PAGE',
    entityType: 'PAGE',
    entityId: page._id.toString(),
    entityName: page.title,
    metadata: {
      title: page.title,
      visibility: page.visibility,
    },
  }).catch(() => {
    // Ignore logging errors
  });

  return page as unknown as PageDocV2;
};

/**
 * Delete/Archive page
 */
export const deletePageV2 = async (pageId: string, userId: string): Promise<void> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const userObjId = safeObjectId(userId);
  if (!userObjId) throw new AppError('Invalid user ID', 400);

  const page = await PageV2.findById(id);
  if (!page) throw new AppError('Page not found', 404);

  // Check permissions
  if (page.creatorId.toString() !== userId) {
    throw new AppError('You do not have permission to delete this page', 403);
  }

  // Soft delete - mark as archived
  page.isArchived = true;
  page.isActive = false;
  await page.save();

  // Log activity
  await createActivityLog({
    userId: userObjId.toString(),
    organizationId: page.organizationId?.toString() || '',
    action: 'DELETE_PAGE',
    entityType: 'PAGE',
    entityId: page._id.toString(),
    entityName: page.title,
    metadata: { title: page.title },
  }).catch(() => {
    // Ignore logging errors
  });
};

/**
 * Create page snapshot (version)
 */
export const createPageSnapshot = async (
  pageId: string,
  description?: string,
  userId?: string,
): Promise<any> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const page = await PageV2.findById(id);
  if (!page) throw new AppError('Page not found', 404);

  // Get latest version number
  const latestVersion = await PageVersion.findOne({ pageId: id })
    .sort({ versionNumber: -1 })
    .select('versionNumber');

  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  const userObjId = userId ? safeObjectId(userId) : page.lastActiveEditor;

  const snapshot = new PageVersion({
    pageId: id,
    versionNumber,
    title: page.title,
    content: page.content,
    plainText: page.plainText,
    wordCount: page.wordCount,
    createdBy: userObjId || page.creatorId,
    changeDescription: description,
    changeType: description ? 'manual' : 'auto-save',
  });

  await snapshot.save();

  // Update page's lastVersionId
  page.lastVersionId = snapshot._id;
  page.version = versionNumber;
  await page.save();

  return snapshot;
};

/**
 * Get page version history
 */
export const getPageVersionHistory = async (
  pageId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<{
  versions: PageVersionBrowser[];
  total: number;
}> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const total = await PageVersion.countDocuments({ pageId: id });

  const versions = await PageVersion.find({ pageId: id })
    .populate('createdBy', 'firstName lastName avatarUrl')
    .sort({ versionNumber: -1 })
    .skip(offset)
    .limit(limit)
    .select('-content') // Don't load large content field
    .lean();

  return {
    versions: versions as unknown as PageVersionBrowser[],
    total,
  };
};

/**
 * Restore page to specific version
 */
export const restorePageVersion = async (
  pageId: string,
  versionId: string,
  userId: string,
): Promise<PageDocV2> => {
  const pageObjId = safeObjectId(pageId);
  const versionObjId = safeObjectId(versionId);
  const userObjId = safeObjectId(userId);

  if (!pageObjId || !versionObjId || !userObjId) {
    throw new AppError('Invalid IDs', 400);
  }

  const page = await PageV2.findById(pageObjId);
  if (!page) throw new AppError('Page not found', 404);

  if (page.creatorId.toString() !== userId) {
    throw new AppError('You do not have permission to restore versions', 403);
  }

  const version = await PageVersion.findById(versionObjId);
  if (!version) throw new AppError('Version not found', 404);

  // Save current state as a checkpoint
  await createPageSnapshot(pageId, `Restored from version ${version.versionNumber}`, userId);

  // Restore content
  page.content = version.content;
  page.plainText = version.plainText;
  page.wordCount = version.wordCount;
  page.title = version.title;
  await page.save();

  // Log activity
  await createActivityLog({
    userId: userObjId.toString(),
    organizationId: page.organizationId?.toString() || '',
    action: 'RESTORE_PAGE_VERSION',
    entityType: 'PAGE',
    entityId: page._id.toString(),
    entityName: page.title,
    metadata: {
      restoredFromVersion: version.versionNumber,
    },
  }).catch(() => {
    // Ignore logging errors
  });

  return page as unknown as PageDocV2;
};

/**
 * Add comment to page
 */
export const addPageComment = async (
  pageId: string,
  input: AddCommentInput,
  userId: string,
): Promise<any> => {
  const pageObjId = safeObjectId(pageId);
  const userObjId = safeObjectId(userId);

  if (!pageObjId || !userObjId) {
    throw new AppError('Invalid IDs', 400);
  }

  const page = await PageV2.findById(pageObjId);
  if (!page) throw new AppError('Page not found', 404);

  const comment = new PageComment({
    pageId: pageObjId,
    authorId: userObjId,
    content: input.content,
    blockId: input.blockId,
    lineNumber: input.lineNumber,
  });

  await comment.save();

  // Add comment to page's comment list
  page.comments?.push(comment._id);
  await page.save();

  return comment;
};

/**
 * Search pages with full-text search
 */
export const searchPages = async (
  query: string,
  filters?: {
    organizationId?: string;
    visibility?: PageVisibility[];
    tags?: string[];
    userId?: string;
  },
  limit: number = 20,
  offset: number = 0,
): Promise<PageSearchResult[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchQuery: Record<string, unknown> = {
    $text: { $search: query.trim() },
  };

  if (filters?.organizationId) {
    const orgId = safeObjectId(filters.organizationId);
    if (orgId) searchQuery.organizationId = orgId;
  }

  if (filters?.visibility && filters.visibility.length > 0) {
    searchQuery.visibility = { $in: filters.visibility };
  }

  if (filters?.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }

  searchQuery.isArchived = false;

  const results = await PageV2.find(searchQuery)
    .populate('creatorId', 'firstName lastName avatarUrl')
    .select('title description plainText visibility creatorId updatedAt')
    .sort({ score: { $meta: 'textScore' } })
    .skip(offset)
    .limit(limit)
    .lean();

  return results.map((page: any) => ({
    id: page._id,
    title: page.title,
    description: page.description,
    excerpt: (page.plainText as string)?.substring(0, 150) + '...',
    visibility: page.visibility as PageVisibility,
    creator: {
      id: (page.creatorId as any)._id,
      name: `${(page.creatorId as any).firstName} ${(page.creatorId as any).lastName}`,
      avatarUrl: (page.creatorId as any).avatarUrl,
    },
    updatedAt: page.updatedAt,
    relevanceScore: 1, // MongoDB's text search doesn't expose this easily
  })) as unknown as PageSearchResult[];
};

/**
 * Export page to PDF
 */
export const exportPageToPDF = async (pageId: string): Promise<Buffer> => {
  const id = safeObjectId(pageId);
  if (!id) throw new AppError('Invalid page ID', 400);

  const page = await PageV2.findById(id);
  if (!page) throw new AppError('Page not found', 404);

  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Add title
  doc.fontSize(24).font('Helvetica-Bold').text(page.title, { align: 'left' });
  doc.moveDown(0.5);

  // Add metadata
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text(`Last updated: ${new Date(page.updatedAt).toLocaleDateString()}`, {
      align: 'left',
    });
  doc.moveDown(1);

  // Add content (simplified - strip HTML)
  const plainText = extractPlainText(page.content);
  doc.fontSize(12).fillColor('#000').text(plainText, {
    align: 'left',
    width: 550,
  });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
  });
};

export default {
  createPageV2,
  getPageByIdV2,
  listPagesV2,
  updatePageV2,
  deletePageV2,
  createPageSnapshot,
  getPageVersionHistory,
  restorePageVersion,
  addPageComment,
  searchPages,
  exportPageToPDF,
  resolveOrganizationId,
  extractPlainText,
  calculateWordCount,
};
