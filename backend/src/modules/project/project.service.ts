import mongoose from 'mongoose';
import Project from '../../models/Project.js';
import Task from '../../models/Task.js';
import ProjectMember from '../../models/ProjectMember.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import { ROLES } from '../../constants/index.js';

/**
 * Create a new project
 */
export const createProject = async (projectData: Record<string, any>) => {
  const { 
    name, description, workspaceId, organizationId, ownerId, 
    techStack, startDate, endDate, visibility, members 
  } = projectData;

  if (!name) throw new AppError('Project name is required.', 400);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [project] = await Project.create([{
      name,
      description,
      workspaceId,
      organizationId,
      ownerId,
      techStack: techStack || [],
      startDate,
      endDate,
      visibility: visibility || 'public',
      status: (projectData.status || 'active').toLowerCase()
    }], { session });

    // 1. Add Creator as OWNER
    await ProjectMember.create([{
      projectId: project._id,
      userId: ownerId,
      organizationId,
      role: 'OWNER',
      isActive: true
    }], { session });

    // 2. Add other members if provided
    if (Array.isArray(members) && members.length > 0) {
      const memberDocs = members
        .filter(mId => mId !== ownerId) // Avoid duplicate for owner
        .map(mId => ({
          projectId: project._id,
          userId: mId,
          organizationId,
          role: 'MEMBER',
          isActive: true
        }));
      
      if (memberDocs.length > 0) {
        await ProjectMember.insertMany(memberDocs, { session });
      }
    }

    await session.commitTransaction();

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
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get all Projects (with privacy filtering)
 */
export const getProjects = async (
  filter: Record<string, any>,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
) => {
  const skip = (page - 1) * limit;
  const currentUserId = filter.userId;

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

  // Build query: match active projects (allowing for missing isActive field in legacy data)
  const query: Record<string, any> = { isActive: { $ne: false } };
  
  if (filter.role === ROLES.SUPER_ADMIN) {
    // Super Admin sees all active projects
  } else {
    // Standard User Privacy Strategy:
    // 1. Projects where visibility = 'public' AND in user's organization
    // OR 2. Projects where user is an explicit member
    const orgId = safeObjectId(filter.organizationId);
    const userId = safeObjectId(currentUserId);

    if (orgId && userId) {
      // Find IDs of projects where user is a member
      const memberProjects = await ProjectMember.find({ userId, isActive: true }).distinct('projectId');

      query.$or = [
        { visibility: 'public', organizationId: orgId },
        { _id: { $in: memberProjects } },
        { ownerId: userId }
      ];
    } else if (orgId) {
      query.organizationId = orgId;
      query.visibility = 'public';
    }
  }

  if (filter.workspaceId) {
    const wsId = safeObjectId(filter.workspaceId);
    if (wsId) query.workspaceId = wsId;
  }
  if (filter.status) query.status = filter.status;
  if (filter.search) {
    query.name = { $regex: filter.search, $options: 'i' };
  }

  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('workspaceId', 'name')
      .populate('ownerId', 'firstName lastName avatarUrl email')
      .lean(),
    Project.countDocuments(query)
  ]);

  // For each project, fetch top 5 members for avatars and task stats
  const projectsWithStats = await Promise.all(projects.map(async (p) => {
    const [members, totalTasks, completedTasks] = await Promise.all([
      ProjectMember.find({ projectId: (p as any)._id, isActive: true })
        .limit(5)
        .populate('userId', 'firstName lastName avatarUrl email')
        .lean(),
      Task.countDocuments({ projectId: (p as any)._id, isActive: true }),
      Task.countDocuments({ projectId: (p as any)._id, status: 'COMPLETED', isActive: true })
    ]);
    
    return {
      ...p,
      members: members.map(m => m.userId),
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    };
  }));

  return { projects: projectsWithStats, totalCount };
};

/**
 * Get project by ID (with members)
 */
export const getProjectById = async (projectId: any, userId?: any) => {
  const project = await Project.findOne({
    _id: projectId,
    isActive: true
  }).populate('workspaceId', 'name')
    .populate('ownerId', 'firstName lastName avatarUrl email')
    .lean();

  if (!project) throw new AppError('Project not found.', 404);

  // Security check for private projects
  if (project.visibility === 'private' && userId) {
    const isMember = await ProjectMember.findOne({ projectId, userId, isActive: true });
    if (!isMember) throw new AppError('Unauthorized access to this project.', 403);
  }

  const [members, totalTasks, completedTasks] = await Promise.all([
     ProjectMember.find({ projectId, isActive: true })
      .populate('userId', 'firstName lastName avatarUrl email')
      .lean(),
     Task.countDocuments({ projectId, isActive: true }),
     Task.countDocuments({ projectId, status: 'COMPLETED', isActive: true })
  ]);

  return {
    ...project,
    members: members.map(m => ({
      user: m.userId,
      role: m.role,
      joinedAt: m.joinedAt
    })),
    taskStats: {
      total: totalTasks,
      completed: completedTasks,
      percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  };
};

/**
 * Update project
 */
export const updateProject = async (projectId: any, updateData: Record<string, any>, userId: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check permission
    const membership = await ProjectMember.findOne({ projectId, userId, isActive: true }).session(session);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
       throw new AppError('Only project owners or admins can update details.', 403);
    }

    const { members, ...otherData } = updateData;

    const normalizedUpdateData = {
      ...otherData,
      status:
        typeof otherData?.status === 'string'
          ? otherData.status.toLowerCase()
          : otherData?.status,
    };

    // 2. Update Project metadata
    const project = await Project.findOneAndUpdate(
      { _id: projectId, isActive: true },
      { $set: normalizedUpdateData },
      { new: true, runValidators: true, session }
    );

    if (!project) throw new AppError('Project not found.', 404);

    // 3. Sync Members if provided
    if (Array.isArray(members)) {
      // Get current members (excluding the owner who must stay)
      const currentMembers = await ProjectMember.find({ 
        projectId, 
        role: { $ne: 'OWNER' } 
      }).session(session);
      
      const currentMemberIds = currentMembers.map(m => m.userId.toString());
      const newMemberIds = members.map(id => id.toString());

      // Members to add: In 'newMemberIds' but not in 'currentMemberIds' and not the owner
      const ownerId = project.ownerId.toString();
      const toAdd = newMemberIds.filter(id => id !== ownerId && !currentMemberIds.includes(id));

      // Members to remove: In 'currentMemberIds' but not in 'newMemberIds'
      const toRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));

      if (toRemove.length > 0) {
        await ProjectMember.deleteMany({
          projectId,
          userId: { $in: toRemove },
          role: { $ne: 'OWNER' }
        }).session(session);
      }

      if (toAdd.length > 0) {
        const newDocs = toAdd.map(uId => ({
          projectId,
          userId: uId,
          organizationId: project.organizationId,
          role: 'MEMBER',
          isActive: true
        }));
        await ProjectMember.insertMany(newDocs, { session });
      }
    }

    await session.commitTransaction();

    // Log activity
    await activityLog.logActivity({
      userId,
      organizationId: project.organizationId,
      resourceId: project._id,
      resourceType: 'Project',
      action: 'UPDATE_PROJECT',
      metadata: { updatedFields: Object.keys(updateData) }
    });

    return project;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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
    organizationId: project.organizationId,
    resourceId: project._id,
    resourceType: 'Project',
    action: 'UPDATE_PROJECT',
    metadata: { status: 'archived' }
  });

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
    organizationId: project.organizationId,
    resourceId: projectId,
    resourceType: 'Project',
    action: 'DELETE_PROJECT',
    metadata: { name: project.name }
  });
};
