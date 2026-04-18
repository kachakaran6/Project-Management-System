import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Page from '../../models/Page.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { createActivityLog } from '../../services/activityLogService.js';

const parseOrganizationId = (value: unknown): string | null => {
  if (!value) return null;

  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed || !mongoose.Types.ObjectId.isValid(trimmed)) {
    return null;
  }

  return trimmed;
};

export const resolveOrganizationId = (requestLike: {
  organizationId?: string | null;
  headers?: Record<string, unknown>;
}) => {
  if (requestLike.organizationId) {
    return requestLike.organizationId;
  }

  return parseOrganizationId(requestLike.headers?.['x-organization-id']);
};

type PageFilter = {
  search?: unknown;
  visibility?: unknown;
  createdByMe?: unknown;
  recentlyEdited?: unknown;
  currentUserId: string;
  role?: string | null;
  organizationId?: string | null;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

export const createPage = async (data: {
  title: string;
  content?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  creatorId: string;
  organizationId?: string | null;
}) => {
  const title = data.title?.trim();
  if (!title) {
    throw new AppError('Title is required.', 400);
  }

  const page = await Page.create({
    title,
    content: data.content?.trim() || '<p></p>',
    visibility: data.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
    allowedUsers: (data as any).allowedUsers || [],
    creatorId: data.creatorId,
    organizationId: data.organizationId || null,
  });

  if (data.organizationId) {
    await createActivityLog({
      userId: data.creatorId,
      organizationId: String(data.organizationId),
      action: 'PAGE_CREATED',
      entityType: 'PAGE',
      entityId: String(page._id),
      entityName: page.title,
      metadata: {
        visibility: page.visibility,
        contentLength: String(page.content || '').length,
      },
    });
  }

  return page;
};

export const getPages = async (
  filter: PageFilter,
  { page = 1, limit = 20 }: { page?: number; limit?: number },
) => {
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { isActive: true };
  
  const safeObjectId = (id: any) => {
    if (!id) return null;
    try {
      return mongoose.Types.ObjectId.isValid(String(id))
        ? new mongoose.Types.ObjectId(String(id))
        : null;
    } catch {
      return null;
    }
  };

  if (filter.organizationId) {
    const orgId = safeObjectId(filter.organizationId);
    query.organizationId = orgId;
  } else {
    query.organizationId = null;
  }

  const viewerCanSeeAll = filter.role === 'SUPER_ADMIN' || filter.role === 'ADMIN';

  if (!viewerCanSeeAll) {
    const userId = safeObjectId(filter.currentUserId);
    query.$or = [
      { visibility: 'PUBLIC' },
      { creatorId: userId },
      { allowedUsers: userId }
    ];
  }

  if (String(filter.visibility).toUpperCase() === 'PUBLIC') {
    query.visibility = 'PUBLIC';
  }

  if (String(filter.visibility).toUpperCase() === 'PRIVATE') {
    query.visibility = 'PRIVATE';
  }

  if (toBoolean(filter.createdByMe)) {
    query.creatorId = safeObjectId(filter.currentUserId);
  }

  if (toBoolean(filter.recentlyEdited)) {
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    query.updatedAt = { $gte: from };
  }

  const search = String(filter.search || '').trim();
  if (search) {
    query.$text = { $search: search };
  }

  const [pages, totalCount] = await Promise.all([
    Page.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creatorId', 'firstName lastName email avatarUrl')
      .lean(),
    Page.countDocuments(query),
  ]);

  return { pages, totalCount };
};

export const getPageById = async (
  pageId: string,
  currentUserId: string,
  role?: string | null,
  organizationId?: string | null,
) => {
  const query: Record<string, unknown> = {
    _id: pageId,
    isActive: true,
    organizationId: organizationId || null,
  };

  const page = await Page.findOne(query)
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .lean();

  if (!page) {
    throw new AppError('Page not found.', 404);
  }

  const creatorId = (page.creatorId as { _id?: unknown } | undefined)?._id
    ? String((page.creatorId as { _id: unknown })._id)
    : String(page.creatorId);

  const allowedUsers = (page as any).allowedUsers || [];
  const isAllowed = allowedUsers.some((id: any) => String(id) === currentUserId);

  const canAdminOverride = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const canView =
    canAdminOverride || 
    page.visibility === 'PUBLIC' || 
    creatorId === currentUserId ||
    isAllowed;

  if (!canView) {
    throw new AppError('You do not have permission to view this page.', 403);
  }

  return page;
};

export const updatePage = async (
  pageId: string,
  updates: {
    title?: string;
    content?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
  },
  currentUserId: string,
  role?: string | null,
  organizationId?: string | null,
) => {
  const page = await Page.findOne({
    _id: pageId,
    isActive: true,
    organizationId: organizationId || null,
  });

  if (!page) {
    throw new AppError('Page not found.', 404);
  }

  const isCreator = String(page.creatorId) === currentUserId;

  if (!isCreator) {
    throw new AppError('Only the page owner can edit this page.', 403);
  }

  if (typeof updates.title === 'string') {
    const title = updates.title.trim();
    if (!title) {
      throw new AppError('Title is required.', 400);
    }
    page.title = title;
  }

  if (typeof updates.content === 'string') {
    page.content = updates.content;
  }

  if (updates.visibility) {
    page.visibility = updates.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  }

  if (Array.isArray((updates as any).allowedUsers)) {
    (page as any).allowedUsers = (updates as any).allowedUsers;
  }

  const changeMetadata: Record<string, any> = {};
  if (typeof updates.title === 'string') changeMetadata.title = updates.title.trim();
  if (typeof updates.content === 'string') changeMetadata.contentLength = updates.content.length;
  if (updates.visibility) changeMetadata.visibility = updates.visibility;

  await page.save();

  if (organizationId) {
    await createActivityLog({
      userId: currentUserId,
      organizationId: String(organizationId),
      action: 'PAGE_UPDATED',
      entityType: 'PAGE',
      entityId: String(page._id),
      entityName: page.title,
      metadata: changeMetadata,
    });
  }

  return Page.findById(page._id)
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .lean();
};

export const deletePage = async (
  pageId: string,
  currentUserId: string,
  role?: string | null,
  organizationId?: string | null,
) => {
  const page = await Page.findOne({
    _id: pageId,
    isActive: true,
    organizationId: organizationId || null,
  });

  if (!page) {
    throw new AppError('Page not found.', 404);
  }

  const isCreator = String(page.creatorId) === currentUserId;

  if (!isCreator) {
    throw new AppError('Only the page owner can delete this page.', 403);
  }

  page.isActive = false;
  await page.save();

  if (organizationId) {
    await createActivityLog({
      userId: currentUserId,
      organizationId: String(organizationId),
      action: 'PAGE_DELETED',
      entityType: 'PAGE',
      entityId: String(page._id),
      entityName: page.title,
      metadata: { visibility: page.visibility },
    });
  }

  return { success: true };
};

export const enrichPageAuthor = async (rawPage: Record<string, unknown>) => {
  const creatorIdValue = rawPage.creatorId;

  const creatorId =
    typeof creatorIdValue === 'object' && creatorIdValue !== null && '_id' in creatorIdValue
      ? String((creatorIdValue as { _id: unknown })._id)
      : String(creatorIdValue || '');

  if (!creatorId) return rawPage;

  const author = await User.findById(creatorId)
    .select('firstName lastName email avatarUrl')
    .lean();

  if (!author) return rawPage;

  return {
    ...rawPage,
    creatorId,
    creator: {
      _id: author._id,
      firstName: author.firstName,
      lastName: author.lastName,
      email: author.email,
      avatarUrl: author.avatarUrl,
    },
  };
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const renderPagePdf = async (input: {
  title: string;
  content: string;
  visibility: string;
  authorName: string;
  updatedAt?: unknown;
}) =>
  new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const safeTitle = input.title.trim() || 'Untitled Page';
    const plainText = stripHtml(input.content || '');

    doc.fontSize(22).text(safeTitle, { align: 'left' });
    doc.moveDown(0.6);

    doc.fontSize(10).fillColor('#6b7280').text(`Visibility: ${input.visibility}`);
    doc.text(`Author: ${input.authorName || 'Unknown'}`);
    doc.text(`Last edited: ${input.updatedAt ? new Date(String(input.updatedAt)).toLocaleString() : 'N/A'}`);
    doc.moveDown(1);

    doc.fillColor('#111827').fontSize(11).text(plainText || 'No content', {
      align: 'left',
      lineGap: 4,
    });

    doc.end();
  });
