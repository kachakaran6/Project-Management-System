import mongoose from 'mongoose';
import Page from '../../models/Page.js';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/errorHandler.js';

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
    visibility: data.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
    creatorId: data.creatorId,
    organizationId: data.organizationId || null,
  });

  return page;
};

export const getPages = async (
  filter: PageFilter,
  { page = 1, limit = 20 }: { page?: number; limit?: number },
) => {
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { isActive: true };
  if (filter.organizationId) {
    query.organizationId = filter.organizationId;
  } else {
    query.organizationId = null;
  }

  const viewerCanSeeAll = filter.role === 'SUPER_ADMIN' || filter.role === 'ADMIN';

  if (!viewerCanSeeAll) {
    query.$or = [
      { visibility: 'PUBLIC' },
      { creatorId: new mongoose.Types.ObjectId(filter.currentUserId) },
    ];
  }

  if (String(filter.visibility).toUpperCase() === 'PUBLIC') {
    query.visibility = 'PUBLIC';
  }

  if (String(filter.visibility).toUpperCase() === 'PRIVATE') {
    query.visibility = 'PRIVATE';
  }

  if (toBoolean(filter.createdByMe)) {
    query.creatorId = new mongoose.Types.ObjectId(filter.currentUserId);
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

  const canAdminOverride = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const canView =
    canAdminOverride || page.visibility === 'PUBLIC' || creatorId === currentUserId;

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

  const canAdminOverride = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isCreator = String(page.creatorId) === currentUserId;
  const canEdit = canAdminOverride || isCreator || page.visibility === 'PUBLIC';

  if (!canEdit) {
    throw new AppError('You do not have permission to edit this page.', 403);
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
    page.visibility = updates.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';
  }

  await page.save();

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

  const canAdminOverride = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isCreator = String(page.creatorId) === currentUserId;

  if (!canAdminOverride && !isCreator) {
    throw new AppError('You do not have permission to delete this page.', 403);
  }

  page.isActive = false;
  await page.save();

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
