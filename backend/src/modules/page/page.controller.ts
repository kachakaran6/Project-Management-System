import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { paginate, successResponse } from '../../utils/apiResponse.js';
import * as pageService from './page.service.js';

const normalizePagePayload = async (page: Record<string, unknown>) => {
  const enriched = await pageService.enrichPageAuthor(page);

  return {
    id: String(enriched._id || ''),
    title: String(enriched.title || 'Untitled page'),
    content: String(enriched.content || ''),
    visibility: String(enriched.visibility || 'PRIVATE').toUpperCase(),
    creatorId: String(enriched.creatorId || ''),
    creator: enriched.creator,
    createdAt: enriched.createdAt,
    updatedAt: enriched.updatedAt,
  };
};

const readParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
};

export const create = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);

  const page = await pageService.createPage({
    title: req.body.title,
    content: req.body.content,
    visibility: req.body.visibility,
    creatorId: req.user.id,
    organizationId,
  });

  const payload = await normalizePagePayload(page.toObject());
  return successResponse(res, payload, 'Page created successfully.', 201);
});

export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(String(req.query.page || '1'), 10) || 1;
  const limit = parseInt(String(req.query.limit || '20'), 10) || 20;

  const organizationId = pageService.resolveOrganizationId(req);

  const { pages, totalCount } = await pageService.getPages(
    {
      search: req.query.search,
      visibility: req.query.visibility,
      createdByMe: req.query.createdByMe,
      recentlyEdited: req.query.recentlyEdited,
      currentUserId: req.user.id,
      role: req.user.role,
      organizationId,
    },
    { page, limit },
  );

  const items = await Promise.all(
    pages.map((item) => normalizePagePayload(item as unknown as Record<string, unknown>)),
  );

  const paginated = paginate(items, totalCount, page, limit);

  return successResponse(res, paginated, 'Pages retrieved successfully.');
});

export const getById = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  const page = await pageService.getPageById(
    id,
    req.user.id,
    req.user.role,
    organizationId,
  );

  const payload = await normalizePagePayload(page as unknown as Record<string, unknown>);
  return successResponse(res, payload, 'Page retrieved successfully.');
});

export const update = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  const page = await pageService.updatePage(
    id,
    {
      title: req.body.title,
      content: req.body.content,
      visibility: req.body.visibility,
    },
    req.user.id,
    req.user.role,
    organizationId,
  );

  const payload = await normalizePagePayload(page as unknown as Record<string, unknown>);
  return successResponse(res, payload, 'Page updated successfully.');
});

export const remove = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  await pageService.deletePage(
    id,
    req.user.id,
    req.user.role,
    organizationId,
  );

  return successResponse(res, null, 'Page deleted successfully.');
});

export const exportPdf = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  const page = await pageService.getPageById(
    id,
    req.user.id,
    req.user.role,
    organizationId,
  );

  const normalized = await normalizePagePayload(page as unknown as Record<string, unknown>);
  const creator = normalized.creator as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;

  const pdf = await pageService.renderPagePdf({
    title: normalized.title,
    content: normalized.content,
    visibility: normalized.visibility,
    authorName: creator
      ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Unknown'
      : 'Unknown',
    updatedAt: normalized.updatedAt,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${normalized.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'page'}.pdf"`,
  );

  res.status(200).send(pdf);
});
