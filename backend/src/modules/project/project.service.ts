import mongoose from 'mongoose';
import Project from '../../models/Project.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import { ROLES } from '../../constants/index.js';

/**
 * Create a new project
 * @param {object} projectData - name, description, workspaceId, organizationId, createdBy
 * @returns {Promise<object>} Created project
 */
/**
 * Create a new project
 */
export const createProject = async (projectData: Record<string, any>) => {
  const { name, workspaceId, organizationId, ownerId } = projectData;

  if (!name) throw new AppError('Project name is required.', 400);

  const project = await Project.create({
    name,
    description: projectData.description,
    workspaceId,
    organizationId,
    ownerId,
    status: (projectData.status || 'active').toLowerCase()
  });

  // Log activity
  await activityLog.logActivity({
    userId: ownerId,
    organizationId,
    resourceId: project._id,
    resourceType: 'Project',
    action: 'CREATE_PROJECT',
    metadata: { name: project.name }
  });

  return project;
};

/**
 * Get all Projects
 */
export const getProjects = async (
  filter: Record<string, any>,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
) => {
  const skip = (page - 1) * limit;

  // Helper to safely convert string to ObjectId
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

  // Build query
  const query: Record<string, any> = { isActive: true };
  
  if (filter.role === ROLES.SUPER_ADMIN) {
    // Super Admin sees all active projects
  } else if (filter.organizationId) {
    const orgId = safeObjectId(filter.organizationId);
    if (orgId) query.organizationId = orgId;
  } else if (filter.userId) {
    const userId = safeObjectId(filter.userId);
    if (userId) query.ownerId = userId;
  }

  if (filter.workspaceId) {
    const wsId = safeObjectId(filter.workspaceId);
    if (wsId) query.workspaceId = wsId;
  }
  if (filter.status) query.status = filter.status;

  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('workspaceId', 'name'),
    Project.countDocuments(query)
  ]);

  return { projects, totalCount };
};

/**
 * Update project
 */
export const updateProject = async (projectId: any, updateData: Record<string, any>, userId: any) => {
  const normalizedUpdateData = {
    ...updateData,
    status:
      typeof updateData?.status === 'string'
        ? updateData.status.toLowerCase()
        : updateData?.status,
  };

  const project = await Project.findOneAndUpdate(
    { _id: projectId, isActive: true },
    { $set: normalizedUpdateData },
    { new: true, runValidators: true }
  );

  if (!project) throw new AppError('Project not found.', 404);

  // Log activity
  await activityLog.logActivity({
    userId,
    resourceId: project._id,
    resourceType: 'Project',
    action: 'UPDATE_PROJECT',
    metadata: { updatedFields: Object.keys(normalizedUpdateData) }
  });

  return project;
};

/**
 * Archive project
 */
export const archiveProject = async (projectId: any, userId: any) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId },
    { $set: { status: 'archived' } },
    { new: true }
  );

  if (!project) throw new AppError('Project not found.', 404);

  await activityLog.logActivity({
    userId,
    resourceId: project._id,
    resourceType: 'Project',
    action: 'UPDATE_PROJECT',
    metadata: { status: 'archived' }
  });

  return project;
};

/**
 * Get project by ID
 */
export const getProjectById = async (projectId: any) => {
  const project = await Project.findOne({
    _id: projectId,
    isActive: true
  }).populate('workspaceId', 'name');

  if (!project) throw new AppError('Project not found.', 404);

  return project;
};

/**
 * Delete Project
 */
export const deleteProject = async (projectId: any, userId: any) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, isActive: true },
    { $set: { isActive: false } }
  );

  if (!project) throw new AppError('Project not found.', 404);

  await activityLog.logActivity({
    userId,
    resourceId: projectId,
    resourceType: 'Project',
    action: 'DELETE_PROJECT',
    metadata: { name: project.name }
  });
};
