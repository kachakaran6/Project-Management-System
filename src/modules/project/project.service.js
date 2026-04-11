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
export const createProject = async (projectData) => {
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
export const getProjects = async (filter, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  // Build query
  const query = { isActive: true };
  
  if (filter.role === ROLES.SUPER_ADMIN) {
    // Super Admin sees all active projects
  } else if (filter.organizationId) {
    query.organizationId = filter.organizationId;
  } else if (filter.userId) {
    query.ownerId = filter.userId;
  }

  if (filter.workspaceId) query.workspaceId = filter.workspaceId;
  if (filter.status) query.status = filter.status;

  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('workspaceId', 'name')
      .lean(),
    Project.countDocuments(query)
  ]);

  return { projects, totalCount };
};

/**
 * Update project
 */
export const updateProject = async (projectId, updateData, userId) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, isActive: true },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!project) throw new AppError('Project not found.', 404);

  // Log activity
  await activityLog.logActivity({
    userId,
    resourceId: project._id,
    resourceType: 'Project',
    action: 'UPDATE_PROJECT',
    metadata: { updatedFields: Object.keys(updateData) }
  });

  return project;
};

/**
 * Archive project
 */
export const archiveProject = async (projectId, userId) => {
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
export const getProjectById = async (projectId) => {
  const project = await Project.findOne({
    _id: projectId,
    isActive: true
  }).populate('workspaceId', 'name').lean();

  if (!project) throw new AppError('Project not found.', 404);

  return project;
};

/**
 * Delete Project
 */
export const deleteProject = async (projectId, userId) => {
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
