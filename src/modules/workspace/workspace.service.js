import Workspace from '../../models/Workspace.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';

/**
 * Create a new workspace
 * @param {object} workspaceData - name, description, organizationId, createdBy
 * @returns {Promise<object>} Created workspace
 */
export const createWorkspace = async (workspaceData) => {
  const { name, organizationId, createdBy } = workspaceData;

  // Basic validation
  if (!name) throw new AppError('Workspace name is required.', 400);

  const workspace = await Workspace.create({
    name,
    description: workspaceData.description,
    organizationId,
    createdBy
  });

  // Log activity
  await activityLog.logActivity({
    userId: createdBy,
    organizationId,
    workspaceId: workspace._id,
    resourceId: workspace._id,
    resourceType: 'Workspace',
    action: 'CREATE',
    metadata: { name: workspace.name }
  });

  return workspace;
};

/**
 * Get all workspaces for an organization
 * @param {string} organizationId
 * @param {object} options - page, limit
 * @returns {Promise<object>} Workspaces with total count
 */
export const getWorkspaces = async (organizationId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const [workspaces, totalCount] = await Promise.all([
    Workspace.find({ organizationId, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Workspace.countDocuments({ organizationId, isActive: true })
  ]);

  return { workspaces, totalCount };
};

/**
 * Get single workspace by ID
 * @param {string} workspaceId
 * @param {string} organizationId
 * @returns {Promise<object>} Workspace
 */
export const getWorkspaceById = async (workspaceId, organizationId) => {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    organizationId,
    isActive: true
  }).lean();

  if (!workspace) throw new AppError('Workspace not found or unauthorized.', 404);

  return workspace;
};

/**
 * Update workspace
 * @param {string} workspaceId
 * @param {string} organizationId
 * @param {object} updateData - name, description
 * @returns {Promise<object>} Updated workspace
 */
export const updateWorkspace = async (workspaceId, organizationId, updateData, userId) => {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, organizationId, isActive: true },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!workspace) throw new AppError('Workspace not found or unauthorized.', 404);

  // Log activity
  await activityLog.logActivity({
    userId,
    organizationId,
    workspaceId: workspace._id,
    resourceId: workspace._id,
    resourceType: 'Workspace',
    action: 'UPDATE',
    metadata: { updatedFields: Object.keys(updateData) }
  });

  return workspace;
};

/**
 * Delete (Soft-delete) workspace
 * @param {string} workspaceId
 * @param {string} organizationId
 */
export const deleteWorkspace = async (workspaceId, organizationId, userId) => {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, organizationId },
    { $set: { isActive: false } }
  );

  if (!workspace) throw new AppError('Workspace not found or unauthorized.', 404);

  // Log activity
  await activityLog.logActivity({
    userId,
    organizationId,
    workspaceId: workspaceId,
    resourceId: workspaceId,
    resourceType: 'Workspace',
    action: 'DELETE',
    metadata: { name: workspace.name }
  });
};
