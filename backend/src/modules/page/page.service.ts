import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Page from '../../models/Page.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { createActivityLog } from '../../services/activityLogService.js';
import TaskPage from '../../models/TaskPage.js';

export type PageVisibility = 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';

const PAGE_VISIBILITY = {
  PRIVATE: 'PRIVATE',
  WORKSPACE: 'WORKSPACE',
  PUBLIC: 'PUBLIC',
} as const satisfies Record<PageVisibility, PageVisibility>;

const parseOrganizationId = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return null;
  }

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

type PublicRouteParts = {
  publicSlug: string;
  publicId: string;
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

const safeObjectId = (id: unknown) => {
  if (!id) return null;

  try {
    return mongoose.Types.ObjectId.isValid(String(id))
      ? new mongoose.Types.ObjectId(String(id))
      : null;
  } catch {
    return null;
  }
};

const normalizeStoredVisibility = (value: unknown): PageVisibility => {
  const normalized = String(value || PAGE_VISIBILITY.WORKSPACE).trim().toUpperCase();

  if (normalized === PAGE_VISIBILITY.PRIVATE) {
    return PAGE_VISIBILITY.PRIVATE;
  }

  if (normalized === PAGE_VISIBILITY.PUBLIC) {
    return PAGE_VISIBILITY.PUBLIC;
  }

  return PAGE_VISIBILITY.WORKSPACE;
};

const normalizeRequestedVisibility = (value: unknown): PageVisibility | null => {
  if (!value) {
    return null;
  }

  return normalizeStoredVisibility(value);
};

export const getEffectiveVisibility = (pageLike: {
  visibility?: unknown;
  isPublished?: unknown;
}): PageVisibility => {
  const normalizedVisibility = normalizeStoredVisibility(pageLike.visibility);

  // Legacy rows previously used PUBLIC for workspace-visible pages.
  if (normalizedVisibility === PAGE_VISIBILITY.PUBLIC && !toBoolean(pageLike.isPublished)) {
    return PAGE_VISIBILITY.WORKSPACE;
  }

  return normalizedVisibility;
};

const slugifyTitle = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'page';
};

const generatePublicId = () => randomBytes(5).toString('hex');

const createUniquePublicId = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generatePublicId();
    const existing = await Page.exists({ publicId: candidate });

    if (!existing) {
      return candidate;
    }
  }

  throw new AppError('Failed to generate a unique public link. Please try again.', 500);
};

const createPublicMetadata = async (title: string) => ({
  publicId: await createUniquePublicId(),
  publicSlug: slugifyTitle(title),
  isPublished: true,
});

const ensurePublicMetadata = async (page: any) => {
  if (!page.publicId) {
    page.publicId = await createUniquePublicId();
  }

  if (!page.publicSlug) {
    page.publicSlug = slugifyTitle(String(page.title || 'page'));
  }

  page.isPublished = true;
};

const parsePublicRouteSlug = (value: string): PublicRouteParts | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const delimiterIndex = trimmed.lastIndexOf('-');
  if (delimiterIndex <= 0 || delimiterIndex >= trimmed.length - 1) {
    return null;
  }

  const publicSlug = trimmed.slice(0, delimiterIndex);
  const publicId = trimmed.slice(delimiterIndex + 1);

  if (!publicSlug || !publicId) {
    return null;
  }

  return { publicSlug, publicId };
};

const normalizeAllowedUsers = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => safeObjectId(item))
    .filter((item): item is mongoose.Types.ObjectId => Boolean(item));
};

export const buildPublicPagePath = (pageLike: {
  publicId?: unknown;
  publicSlug?: unknown;
}) => {
  const publicId = typeof pageLike.publicId === 'string' ? pageLike.publicId.trim() : '';
  const publicSlug = typeof pageLike.publicSlug === 'string' ? pageLike.publicSlug.trim() : '';

  if (!publicId || !publicSlug) {
    return null;
  }

  return `/p/${publicSlug}-${publicId}`;
};

export const createPage = async (data: {
  title: string;
  content?: string;
  visibility?: PageVisibility;
  allowedUsers?: string[];
  creatorId: string;
  organizationId?: string | null;
}) => {
  const title = data.title?.trim();
  if (!title) {
    throw new AppError('Title is required.', 400);
  }

  const visibility = normalizeStoredVisibility(data.visibility);
  const publicMetadata =
    visibility === PAGE_VISIBILITY.PUBLIC ? await createPublicMetadata(title) : {};

  const page = await Page.create({
    title,
    content: data.content?.trim() || '<p></p>',
    visibility,
    ...publicMetadata,
    isPublished: visibility === PAGE_VISIBILITY.PUBLIC,
    allowedUsers: normalizeAllowedUsers(data.allowedUsers),
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
        visibility: getEffectiveVisibility(page),
        published: page.isPublished,
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
  const andConditions: Record<string, unknown>[] = [];

  if (filter.organizationId) {
    query.organizationId = safeObjectId(filter.organizationId);
  } else {
    query.organizationId = null;
  }

  const viewerCanSeeAll = filter.role === 'SUPER_ADMIN' || filter.role === 'ADMIN';
  const isWorkspaceScoped = Boolean(filter.organizationId);

  if (!viewerCanSeeAll) {
    const userId = safeObjectId(filter.currentUserId);
    const accessConditions: Record<string, unknown>[] = [];

    if (userId) {
      accessConditions.push({ creatorId: userId });
      accessConditions.push({ allowedUsers: userId });
    }

    if (isWorkspaceScoped) {
      accessConditions.push({ visibility: PAGE_VISIBILITY.WORKSPACE });
      accessConditions.push({ visibility: PAGE_VISIBILITY.PUBLIC });
    }

    query.$or = accessConditions;
  }

  const requestedVisibility = normalizeRequestedVisibility(filter.visibility);
  if (requestedVisibility === PAGE_VISIBILITY.PRIVATE) {
    query.visibility = PAGE_VISIBILITY.PRIVATE;
  }

  if (requestedVisibility === PAGE_VISIBILITY.PUBLIC) {
    query.visibility = PAGE_VISIBILITY.PUBLIC;
    query.isPublished = true;
  }

  if (requestedVisibility === PAGE_VISIBILITY.WORKSPACE) {
    andConditions.push({
      $or: [
        { visibility: PAGE_VISIBILITY.WORKSPACE },
        {
          visibility: PAGE_VISIBILITY.PUBLIC,
          isPublished: { $ne: true },
        },
      ],
    });
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

  if (andConditions.length > 0) {
    query.$and = andConditions;
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
  const effectiveVisibility = getEffectiveVisibility(page);
  const isWorkspaceScoped = Boolean((page as any).organizationId);

  const canView =
    canAdminOverride ||
    creatorId === currentUserId ||
    isAllowed ||
    (isWorkspaceScoped &&
      (effectiveVisibility === PAGE_VISIBILITY.WORKSPACE ||
        effectiveVisibility === PAGE_VISIBILITY.PUBLIC));

  if (!canView) {
    throw new AppError('You do not have permission to view this page.', 403);
  }

  return page;
};

export const getPublicPageBySlug = async (routeSlug: string) => {
  const parts = parsePublicRouteSlug(routeSlug);
  if (!parts) {
    throw new AppError('Page not found.', 404);
  }

  const page = await Page.findOne({
    isActive: true,
    visibility: PAGE_VISIBILITY.PUBLIC,
    isPublished: true,
    publicId: parts.publicId,
    publicSlug: parts.publicSlug,
  })
    .populate('creatorId', 'firstName lastName avatarUrl')
    .lean();

  if (!page) {
    throw new AppError('Page not found.', 404);
  }

  return page;
};

export const updatePage = async (
  pageId: string,
  updates: {
    title?: string;
    content?: string;
    visibility?: PageVisibility;
    allowedUsers?: string[];
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

  if (Array.isArray(updates.allowedUsers)) {
    page.allowedUsers = normalizeAllowedUsers(updates.allowedUsers) as any;
  }

  if (updates.visibility) {
    const nextVisibility = normalizeStoredVisibility(updates.visibility);
    page.visibility = nextVisibility;

    if (nextVisibility === PAGE_VISIBILITY.PUBLIC) {
      await ensurePublicMetadata(page);
    } else {
      page.isPublished = false;
    }
  } else if (page.visibility === PAGE_VISIBILITY.PUBLIC && page.isPublished) {
    await ensurePublicMetadata(page);
  }

  const changeMetadata: Record<string, any> = {};
  if (typeof updates.title === 'string') changeMetadata.title = updates.title.trim();
  if (typeof updates.content === 'string') changeMetadata.contentLength = updates.content.length;
  if (updates.visibility) changeMetadata.visibility = normalizeStoredVisibility(updates.visibility);
  if (Array.isArray(updates.allowedUsers)) changeMetadata.allowedUsers = updates.allowedUsers.length;
  changeMetadata.isPublished = page.isPublished;

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
      metadata: {
        visibility: getEffectiveVisibility(page),
        published: page.isPublished,
      },
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

export const getLinkedTasks = async (
  pageId: string,
  currentUserId: string,
  role?: string | null,
  organizationId?: string | null,
) => {
  // Verify access to the page first
  await getPageById(pageId, currentUserId, role, organizationId);

  const links = await TaskPage.find({ pageId: safeObjectId(pageId) })
    .populate({
      path: 'taskId',
      select: 'title taskCode status priority dueDate creatorId',
      populate: [
        { path: 'status', select: 'name color' },
        { path: 'creatorId', select: 'firstName lastName email avatarUrl' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  return links
    .filter((link: any) => link.taskId != null)
    .map((link: any) => ({
      id: String(link.taskId._id),
      title: link.taskId.title,
      taskCode: link.taskId.taskCode,
      status: link.taskId.status ? {
        id: String(link.taskId.status._id),
        name: link.taskId.status.name,
        color: link.taskId.status.color
      } : null,
      priority: link.taskId.priority,
      dueDate: link.taskId.dueDate,
      owner: link.taskId.creatorId ? {
        id: String(link.taskId.creatorId._id),
        firstName: link.taskId.creatorId.firstName,
        lastName: link.taskId.creatorId.lastName,
        avatarUrl: link.taskId.creatorId.avatarUrl
      } : null,
      linkedAt: link.createdAt,
      linkedBy: link.linkedBy
    }));
};
