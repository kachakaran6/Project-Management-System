import ProjectResource from '../../models/ProjectResource.js';
import ProjectMember from '../../models/ProjectMember.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import mongoose from 'mongoose';

import Project from '../../models/Project.js';

/**
 * Check if user has permission to access project resources
 */
export const checkProjectAccess = async (projectId: string, userId: string, sessionOrgId: string, userRole?: string | null) => {
  const isAdmin = ['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole || '');
  if (isAdmin) return true;

  // Fetch the project to get its true organizationId
  const project = await Project.findById(projectId).lean();
  if (!project) throw new AppError('Project not found', 404);

  const projectOrgId = project.organizationId ? String(project.organizationId) : null;

  // 1. Check project membership
  const membership = await ProjectMember.findOne({ projectId, userId, isActive: true });
  if (membership) return true;

  // 2. Check organization level membership (Organization admins can see everything in the org)
  if (projectOrgId) {
    const orgMembership = await OrganizationMember.findOne({ 
      organizationId: projectOrgId, 
      userId, 
      isActive: true 
    });
    if (orgMembership && ['OWNER', 'ADMIN'].includes(orgMembership.role)) return true;
  }

  // 3. Fallback to session organization if project has no organization (Personal Workspace)
  if (!projectOrgId && sessionOrgId) {
    const sessionOrgMembership = await OrganizationMember.findOne({ 
      organizationId: sessionOrgId, 
      userId, 
      isActive: true 
    });
    if (sessionOrgMembership && ['OWNER', 'ADMIN'].includes(sessionOrgMembership.role)) return true;
  }

  return false;
};

/**
 * Get all resources for a project
 */
export const getResources = async (projectId: string) => {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new AppError('Project not found', 404);

  const query: any = { 
    projectId: new mongoose.Types.ObjectId(projectId), 
    isActive: true 
  };
  
  if (project.organizationId) {
    query.organizationId = new mongoose.Types.ObjectId(String(project.organizationId));
  } else {
    query.organizationId = { $exists: false };
  }

  const resources = await ProjectResource.find(query).sort({ createdAt: -1 }).lean();
  
  // Return with masked passwords for the list view
  return resources.map(r => ({
    ...r,
    id: String(r._id),
    password: r.password ? '********' : undefined 
  }));
};

/**
 * Get a single resource with decrypted password
 */
export const getResourceById = async (resourceId: string, projectId: string) => {
  const resource = await ProjectResource.findOne({ 
    _id: new mongoose.Types.ObjectId(resourceId), 
    projectId: new mongoose.Types.ObjectId(projectId), 
    isActive: true 
  }).lean();

  if (!resource) throw new AppError('Resource not found', 404);

  return {
    ...resource,
    id: String(resource._id),
    password: resource.password ? decrypt(resource.password) : undefined
  };
};

/**
 * Create a new resource
 */
export const createResource = async (resourceData: any, userId: string) => {
  const { password, projectId, organizationId, ...otherData } = resourceData;
  const encryptedPassword = password ? encrypt(password) : undefined;

  // Final check: if organizationId is missing, try to get it from the project
  let finalOrgId = organizationId;
  if (!finalOrgId) {
    const project = await Project.findById(projectId).lean();
    finalOrgId = project?.organizationId;
  }

  const resource = await ProjectResource.create({
    ...otherData,
    projectId: new mongoose.Types.ObjectId(projectId),
    organizationId: finalOrgId ? new mongoose.Types.ObjectId(String(finalOrgId)) : undefined,
    password: encryptedPassword,
    createdBy: new mongoose.Types.ObjectId(userId),
    updatedBy: new mongoose.Types.ObjectId(userId)
  });

  return resource;
};

/**
 * Update an existing resource
 */
export const updateResource = async (resourceId: string, projectId: string, updateData: any, userId: string) => {
  const { password, ...otherData } = updateData;
  const updatePayload: any = { ...otherData, updatedBy: userId };

  if (password && password !== '********') {
    updatePayload.password = encrypt(password);
  }

  const resource = await ProjectResource.findOneAndUpdate(
    { _id: resourceId, projectId, isActive: true },
    { $set: updatePayload },
    { new: true }
  );

  if (!resource) throw new AppError('Resource not found', 404);
  return resource;
};

/**
 * Soft delete a resource
 */
export const deleteResource = async (resourceId: string, projectId: string) => {
  const resource = await ProjectResource.findOneAndUpdate(
    { _id: resourceId, projectId, isActive: true },
    { $set: { isActive: false } }
  );

  if (!resource) throw new AppError('Resource not found', 404);
  return { success: true };
};
