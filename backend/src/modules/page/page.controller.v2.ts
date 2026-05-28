import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as pageService from './pageServiceV2.js';

const readParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const normalizePage = (doc: any) => {
  if (!doc) return null;
  const page = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(page._id || ''),
    title: String(page.title || 'Untitled'),
    content: page.content || '',
    plainText: page.plainText || '',
    visibility: page.visibility || 'WORKSPACE',
    creatorId: page.creatorId ? String(page.creatorId) : '',
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
};

export const create = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);

  const page = await pageService.createPageV2({
    title: req.body.title,
    content: req.body.content,
    visibility: req.body.visibility,
    allowedUsers: req.body.allowedUsers,
    creatorId: req.user.id,
    organizationId: organizationId ?? undefined,
    description: req.body.description,
    icon: req.body.icon,
  });

  return successResponse(res, normalizePage(page), 'Page created', 201);
});

export const list = asyncHandler(async (req, res) => {
  const page = parseInt(String(req.query.page || '1'), 10) || 1;
  const limit = parseInt(String(req.query.limit || '20'), 10) || 20;

  const organizationId = pageService.resolveOrganizationId(req);

  const rawVisibility = req.query.visibility;
  let visibilityArr: any[] | undefined;
  if (rawVisibility) {
    const tmp = Array.isArray(rawVisibility) ? rawVisibility : String(rawVisibility).split(',');
    visibilityArr = tmp
      .map((v) => String(v).trim().toUpperCase())
      .filter((v) => ['WORKSPACE', 'PRIVATE', 'PUBLIC'].includes(v));
  }

  const result = await pageService.listPagesV2({
    search: req.query.search as string,
    visibility: visibilityArr,
    tags: Array.isArray(req.query.tags) ? (req.query.tags as string[]) : req.query.tags ? String(req.query.tags).split(',') : undefined,
    createdByUserId: req.query.createdBy as string | undefined,
    organizationId: organizationId ?? undefined,
    page,
    limit,
  });

  const items = (result.items || []).map(normalizePage);
  return successResponse(res, { items, total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore }, 'Pages retrieved');
});

export const getById = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  const page = await pageService.getPageByIdV2(id, req.user?.id);
  return successResponse(res, normalizePage(page), 'Page retrieved');
});

export const update = asyncHandler(async (req, res) => {
  const organizationId = pageService.resolveOrganizationId(req);
  const id = readParam(req.params.id);

  const page = await pageService.updatePageV2(id, {
    title: req.body.title,
    content: req.body.content,
    visibility: req.body.visibility,
    allowedUsers: req.body.allowedUsers,
    description: req.body.description,
    icon: req.body.icon,
  }, req.user.id);

  return successResponse(res, normalizePage(page), 'Page updated');
});

export const remove = asyncHandler(async (req, res) => {
  const id = readParam(req.params.id);
  await pageService.deletePageV2(id, req.user.id);
  return successResponse(res, null, 'Page archived');
});

export const exportPdf = asyncHandler(async (req, res) => {
  const id = readParam(req.params.id);
  const buffer = await pageService.exportPageToPDF(id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="page.pdf"`);
  res.status(200).send(buffer);
});

export const createSnapshot = asyncHandler(async (req, res) => {
  const id = readParam(req.params.id);
  const snapshot = await pageService.createPageSnapshot(id, req.body.description, req.user.id);
  return successResponse(res, snapshot, 'Snapshot created', 201);
});

export const getVersions = asyncHandler(async (req, res) => {
  const id = readParam(req.params.id);
  const limit = parseInt(String(req.query.limit || '50'), 10) || 50;
  const offset = parseInt(String(req.query.offset || '0'), 10) || 0;
  const data = await pageService.getPageVersionHistory(id, limit, offset);
  return successResponse(res, data, 'Versions retrieved');
});

export default {
  create,
  list,
  getById,
  update,
  remove,
  exportPdf,
  createSnapshot,
  getVersions,
};
