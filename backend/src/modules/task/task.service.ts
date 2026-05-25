import Task from '../../models/Task.js';
import TaskAssignee from '../../models/TaskAssignee.js';
import TaskTag from '../../models/TaskTag.js';
import TaskVisibilityUser from '../../models/TaskVisibilityUser.js';
import TaskStatusHistory from '../../models/TaskStatusHistory.js';
import Tag from '../../models/Tag.js';
import TaskPage from '../../models/TaskPage.js';
import Page from '../../models/Page.js';
import UserColumnOrder from '../../models/UserColumnOrder.js';

import Project from '../../models/Project.js';
import Status from '../../models/Status.js';
import OrganizationMember from '../../models/OrganizationMember.js';
import { AppError } from '../../middlewares/errorHandler.js';
import * as activityLog from '../../utils/systemTriggers.js';
import * as visibilityHelpers from '../../utils/visibilityHelpers.js';
import mongoose from 'mongoose';
import { emitToRoom, emitToUsers } from '../../realtime/socket.server.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../../realtime/socket.events.js';
import { ROLES } from '../../constants/index.js';
import { logStatusChange } from '../../utils/statusHistoryTriggers.js';


const ADMIN_ROLES = new Set(['OWNER', 'ADMIN', 'SUPER_ADMIN']);

const isAdminRole = (role?: string | null) => Boolean(role && ADMIN_ROLES.has(role));

const isTaskDraft = (task?: { isDraft?: boolean; visibility?: string } | null) =>
  Boolean(task?.isDraft || task?.visibility === 'DRAFT');

const normalizeVisibility = (visibility?: any) => {
  const normalized = String(visibility || 'PUBLIC').trim().toUpperCase();
  if (normalized === 'PRIVATE') return 'PRIVATE';
  return 'PUBLIC';
};

const ensureDraftOwner = (task: any, actorId: any) => {
  if (isTaskDraft(task) && String(task.creatorId) !== String(actorId)) {
    throw new AppError('Only the draft creator can access this draft.', 403);
  }
};

const normalizeAssigneeUser = (assignee: any) => {
  const user = assignee?.userId;
  if (!user) return null;

  const id = String(user._id || user.id || user);
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';

  return {
    id,
    name,
    email: user.email || '',
    avatarUrl: user.avatarUrl,
  };
};

const normalizeUser = (user: any) => {
  if (!user) return null;
  const id = String(user._id || user.id);
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';
  return { id, name, email: user.email || '', avatarUrl: user.avatarUrl };
};

const buildTaskSortStages = (filter: any) => {
  const sortOrder: 1 | -1 = filter.sortOrder === 'asc' ? 1 : -1;
  const sortParams: Record<string, 1 | -1> = {};
  const stages: any[] = [];

  if (!filter.sortBy) {
    sortParams.position = 1;
    sortParams.createdAt = -1;
    return { stages, sortParams };
  }

  if (filter.sortBy === 'status') {
    stages.push(
      {
        $lookup: {
          from: 'statuses',
          localField: 'status',
          foreignField: '_id',
          as: 'sortStatus'
        }
      },
      { $unwind: { path: '$sortStatus', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          statusSortMissing: {
            $cond: [{ $ifNull: ['$sortStatus._id', false] }, 0, 1]
          },
          statusSortOrder: { $ifNull: ['$sortStatus.order', 999999] },
          statusSortName: { $toLower: { $ifNull: ['$sortStatus.name', ''] } }
        }
      }
    );

    sortParams.statusSortMissing = 1;
    sortParams.statusSortOrder = sortOrder;
    sortParams.statusSortName = 1;
  } else if (filter.sortBy === 'priority') {
    stages.push({
      $addFields: {
        prioritySortRank: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'LOW'] }, then: 1 },
              { case: { $eq: ['$priority', 'MEDIUM'] }, then: 2 },
              { case: { $eq: ['$priority', 'HIGH'] }, then: 3 },
              { case: { $eq: ['$priority', 'URGENT'] }, then: 4 },
            ],
            default: 0,
          }
        }
      }
    });

    sortParams.prioritySortRank = sortOrder;
  } else if (filter.sortBy === 'assignee') {
    stages.push(
      {
        $lookup: {
          from: 'taskassignees',
          let: { taskId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$taskId', '$$taskId'] }
              }
            },
            { $sort: { createdAt: 1, _id: 1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
          ],
          as: 'sortAssignee'
        }
      },
      {
        $addFields: {
          assigneeSortMissing: {
            $cond: [{ $gt: [{ $size: '$sortAssignee' }, 0] }, 0, 1]
          },
          assigneeSortName: {
            $toLower: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: [{ $arrayElemAt: ['$sortAssignee.user.firstName', 0] }, ''] },
                    ' ',
                    { $ifNull: [{ $arrayElemAt: ['$sortAssignee.user.lastName', 0] }, ''] }
                  ]
                }
              }
            }
          }
        }
      }
    );

    sortParams.assigneeSortMissing = 1;
    sortParams.assigneeSortName = sortOrder;
  } else if (filter.sortBy === 'manual' && filter.manualOrderTaskIds) {
    stages.push({
      $addFields: {
        manualSortIndex: {
          $indexOfArray: [filter.manualOrderTaskIds, '$_id']
        }
      }
    });
    // Tasks not in the array will have manualSortIndex = -1, we want them at the bottom
    stages.push({
      $addFields: {
        manualSortIndexAdjusted: {
          $cond: [{ $eq: ['$manualSortIndex', -1] }, 999999, '$manualSortIndex']
        }
      }
    });
    sortParams.manualSortIndexAdjusted = 1;
    sortParams.position = 1;
  } else if (filter.sortBy === 'newest') {
    sortParams.createdAt = -1;
  } else if (filter.sortBy === 'oldest') {
    sortParams.createdAt = 1;
  } else if (filter.sortBy === 'dueDate') {
    sortParams.dueDate = sortOrder;
  } else if (filter.sortBy === 'alphabetical') {
    sortParams.title = sortOrder;
  } else if (filter.sortBy === 'recentlyUpdated') {
    sortParams.updatedAt = -1;
  } else {
    sortParams[filter.sortBy] = sortOrder;
  }

  if (filter.sortBy !== 'position' && filter.sortBy !== 'manual') sortParams.position = 1;

  return { stages, sortParams };
};

/**
 * Normalize tags from TaskTag records into rich objects.
 */
const normalizeTags = (taskTags: any[]): any[] => {
  if (!Array.isArray(taskTags)) return [];
  return taskTags
    .map((tt: any) => {
      const tag = tt.tagId;
      if (tag && typeof tag === 'object' && tag._id) {
        return {
          id: String(tag._id),
          name: tag.name,
          label: tag.label || tag.name,
          color: tag.color || '#6366f1',
          icon: tag.icon || 'Tag'
        };
      }
      return null;
    })
    .filter(Boolean);
};

const toObjectId = (value: any): mongoose.Types.ObjectId | null => {
  const str = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

const resolveProjectName = async (projectId: any) => {
  const normalizedProjectId = toObjectId(projectId);
  if (!normalizedProjectId) return 'General';
  const project = await Project.findById(normalizedProjectId).select('name').lean();
  return project?.name || 'General';
};

const buildDraftMatch = (userId: string, organizationId?: any, projectId?: any, workspaceId?: any) => {
  const match: Record<string, any> = {
    creatorId: toObjectId(userId),
    isActive: true,
    $or: [
      { isDraft: true },
      { visibility: 'DRAFT' }
    ]
  };

  const orgObjectId = toObjectId(organizationId);
  if (orgObjectId) match.organizationId = orgObjectId;

  if (projectId !== undefined) {
    const normalizedProjectId = toObjectId(projectId);
    if (normalizedProjectId) {
      match.projectId = normalizedProjectId;
    } else {
      match.projectId = null;
    }
  }

  if (workspaceId !== undefined) {
    const normalizedWorkspaceId = toObjectId(workspaceId);
    if (normalizedWorkspaceId) {
      match.workspaceId = normalizedWorkspaceId;
    } else {
      match.workspaceId = null;
    }
  }

  return match;
};

const syncTaskVisibilityUsers = async (
  taskId: any,
  visibility: string,
  visibleToUsers: any[] = [],
  organizationId: any,
  session?: any
) => {
  const normalizedTaskId = toObjectId(taskId);
  const normalizedOrganizationId = toObjectId(organizationId);
  if (!normalizedTaskId || !normalizedOrganizationId) return;

  await TaskVisibilityUser.deleteMany({ taskId: normalizedTaskId }, { session });

  if (visibility === 'PRIVATE' && Array.isArray(visibleToUsers) && visibleToUsers.length > 0) {
    const docs = visibleToUsers
      .map(uid => toObjectId(uid))
      .filter(Boolean)
      .map(uid => ({
        taskId: normalizedTaskId,
        userId: uid,
        organizationId: normalizedOrganizationId
      }));

    if (docs.length > 0) {
      await TaskVisibilityUser.insertMany(docs, { session, ordered: false }).catch(err => {
        if (err.code !== 11000) throw err;
      });
    }
  }
};

const syncTaskAssignees = async (
  taskId: any,
  assigneeIds: string[],
  organizationId: any,
  actorId: any,
  session?: any
) => {
  const normalizedTaskId = toObjectId(taskId);
  if (!normalizedTaskId) return;

  await TaskAssignee.deleteMany({ taskId: normalizedTaskId }, { session });

  if (assigneeIds.length > 0) {
    const docs = assigneeIds
      .map(aId => toObjectId(aId))
      .filter(Boolean)
      .map(aId => ({
        taskId: normalizedTaskId,
        userId: aId,
        organizationId,
        assignedById: actorId
      }));

    if (docs.length > 0) {
      await TaskAssignee.insertMany(docs, { session, ordered: false });
    }
  }
};

/**
 * Find or create tags and link them to a task.
 */
const syncTags = async (taskId: any, tags: any[], organizationId: any, workspaceId?: any, session?: any) => {
  const mongoTaskId = toObjectId(taskId);
  if (!mongoTaskId) return;

  const mongoOrgId = toObjectId(organizationId);
  const tagIds: mongoose.Types.ObjectId[] = [];

  // Batch process string tags to reduce findOne calls if possible
  const stringTags = tags.filter(item => typeof item === 'string' && !mongoose.Types.ObjectId.isValid(item));
  const existingTagsMap = new Map();
  
  if (stringTags.length > 0) {
    const normalizedNames = stringTags.map(s => s.trim().toLowerCase().replace(/\s+/g, '-'));
    const found = await Tag.find({ organizationId: mongoOrgId, name: { $in: normalizedNames } }).session(session);
    found.forEach(t => existingTagsMap.set(t.name, t));
  }

  for (const item of tags) {
    if (mongoose.Types.ObjectId.isValid(String(item))) {
      tagIds.push(new mongoose.Types.ObjectId(String(item)));
    } else if (typeof item === 'string' && item.trim()) {
      const name = item.trim().toLowerCase().replace(/\s+/g, '-');
      let tag = existingTagsMap.get(name);
      
      if (!tag) {
        const [newTag] = await Tag.create([{
          name,
          label: item.trim(),
          organizationId: mongoOrgId,
          workspaceId: toObjectId(workspaceId),
          createdBy: toObjectId(organizationId) 
        }], { session });
        tag = newTag;
      }
      if (tag) tagIds.push(tag._id as mongoose.Types.ObjectId);
    }
  }

  const uniqueTagIds = Array.from(new Set(tagIds.map(id => String(id)))).map(id => new mongoose.Types.ObjectId(id));

  await TaskTag.deleteMany({ taskId: mongoTaskId }, { session });

  if (uniqueTagIds.length > 0) {
    const linkDocs = uniqueTagIds.map(tId => ({
      taskId: mongoTaskId,
      tagId: tId,
      organizationId: mongoOrgId
    }));
    await TaskTag.insertMany(linkDocs, { session, ordered: false }).catch(err => {
      if (err.code !== 11000) throw err;
    });
  }
};

const enrichTaskWithAssignees = (task: any, assignees: any[] = []) => {
  const assigneeUsers = assignees
    .map(normalizeAssigneeUser)
    .filter(Boolean);

  return {
    ...task,
    id: String(task._id),
    isDraft: isTaskDraft(task),
    assignees,
    assigneeUsers,
    assigneeId: assigneeUsers[0]?.id,
  };
};

/**
 * Create a new task
 */
export const createTask = async (taskData: Record<string, any>, userId: string, role?: string | null) => {
  const { 
    title, description, projectId, workspaceId, organizationId, 
    status, priority, dueDate,
    assignees = [], assigneeId, assigneeIds = [],
    tags = [],
    visibility = 'PUBLIC',
    visibleToUsers = [],
    isDraft = false
  } = taskData;

  const draftState = Boolean(isDraft || visibility === 'DRAFT');
  const normalizedVisibility = normalizeVisibility(visibility);

  const normalizedAssignees = Array.from(new Set([
    ...(Array.isArray(assignees) ? assignees : []),
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));

  if (!draftState && !String(title || '').trim()) {
    throw new AppError('Title is required.', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let finalStatusId = toObjectId(status);
    if (!finalStatusId && organizationId) {
      const defaultStatus = await Status.findOne({ organizationId, isDefault: true }).sort({ order: 1 });
      
      if (defaultStatus) {
        finalStatusId = defaultStatus._id as any;
      } else {
        const firstStatus = await Status.findOne({ organizationId }).sort({ order: 1 });
        if (firstStatus) {
          finalStatusId = firstStatus._id as any;
        } else {
          const { createDefaultStatuses } = await import('../status/status.service.js');
          const defaults = await createDefaultStatuses(organizationId);
          finalStatusId = defaults[0]?._id as any;
        }
      }
    }

    let taskSequence = 0;
    let projectCode = 'TASK';

    if (projectId) {
      const project = await Project.findOneAndUpdate(
        { _id: toObjectId(projectId) },
        { $inc: { taskSequence: 1 } },
        { new: true, session }
      );
      if (project) {
        taskSequence = project.taskSequence;
        projectCode = project.code || 'TASK';
      }
    }

    const [task] = await Task.create([{
      title: String(title || '').trim(),
      description, 
      projectId: toObjectId(projectId), 
      workspaceId: toObjectId(workspaceId), 
      organizationId,
      status: finalStatusId,
      priority: priority || 'MEDIUM',
      dueDate,
      creatorId: userId,
      visibility: normalizedVisibility,
      isDraft: draftState,
      isPublic: !draftState,
      sequence: taskSequence,
      taskCode: taskSequence > 0 ? `${projectCode}-${taskSequence}` : undefined,
      legacyId: undefined // Will be set if migrating or for specific needs
    }], { session });

    await syncTaskVisibilityUsers(task._id, normalizedVisibility, visibleToUsers, organizationId, session);
    await syncTaskAssignees(task._id, normalizedAssignees, organizationId, userId, session);

    if (tags.length > 0) {
      await syncTags(task._id, tags, organizationId, workspaceId, session);
    }

    await session.commitTransaction();

    if (draftState) {
      return getTaskById(task._id, userId, role);
    }

    // BACKGROUND PROCESSING (Non-blocking)
    setImmediate(async () => {
      try {
        const projectName = await resolveProjectName(task.projectId);

        await logStatusChange({
          taskId: task._id,
          userId,
          fromStatus: null,
          toStatus: finalStatusId,
          organizationId: task.organizationId
        });

        activityLog.logActivity({
          userId, organizationId, workspaceId, projectId,
          resourceId: task._id, resourceType: 'Task', action: 'CREATE',
          metadata: {
            taskId: String(task._id),
            taskTitle: task.title,
            title: task.title,
            projectName,
            newStatus: task.status,
            assignedTo: '-',
            changedFields: ['Title', 'Description', 'Status'],
            timestamp: new Date(),
          }
        });

        if (normalizedAssignees.length > 0) {
          activityLog.triggerNotification({
            userIds: normalizedAssignees, organizationId, actorId: userId,
            type: 'TASK_ASSIGNED', message: `Assigned: ${task.title}`,
            resourceId: task._id, resourceType: 'Task',
            metadata: {
              taskId: String(task._id),
              taskTitle: task.title,
              projectName,
              timestamp: new Date(),
            }
          });
        }

        emitToRoom(SOCKET_ROOMS.WORKSPACE(workspaceId), SOCKET_EVENTS.TASK_CREATED, { taskId: task._id, title: task.title });
      } catch (err) {
        console.error("[TASK_CREATE_BACKGROUND_ERROR]", err);
      }
    });

    return getTaskById(task._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getDrafts = async (
  filter: Record<string, any>,
  { page = 1, limit = 10 } = {},
  userId: string,
  role?: string | null
) => {
  const skip = (page - 1) * limit;
  const query: Record<string, any> = buildDraftMatch(
    userId,
    filter.organizationId,
    filter.projectId,
    filter.workspaceId
  );

  if (filter.search) {
    const regex = new RegExp(String(filter.search).trim(), 'i');
    query.$and = [...(query.$and || []), { $or: [{ title: regex }, { description: regex }] }];
  }

  const [drafts, totalCount] = await Promise.all([
    Task.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('projectId', 'name githubSettings')
      .populate('workspaceId', 'name')
      .populate('creatorId', 'firstName lastName email avatarUrl')
      .populate('status')
      .lean(),
    Task.countDocuments(query)
  ]);

  if (drafts.length === 0) {
    return { tasks: [], totalCount };
  }

  const taskIds = drafts.map(t => t._id);
  const [assigneeRows, tagRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  return {
    tasks: drafts.map(draft => ({
      ...enrichTaskWithAssignees(draft, assigneesByTaskId.get(String(draft._id))),
      creator: normalizeUser(draft.creatorId),
      tags: tagsByTaskId.get(String(draft._id)) || [],
      visibility: draft.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      isDraft: true
    })),
    totalCount
  };
};

export const saveDraft = async (draftData: Record<string, any>, userId: string, role?: string | null) => {
  const {
    draftId,
    title,
    description,
    projectId,
    workspaceId,
    organizationId,
    status,
    priority,
    dueDate,
    assignees = [],
    assigneeId,
    assigneeIds = [],
    tags = [],
    visibility = 'PUBLIC',
    visibleToUsers = []
  } = draftData;

  const normalizedAssignees = Array.from(new Set([
    ...(Array.isArray(assignees) ? assignees : []),
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));
  const normalizedVisibility = normalizeVisibility(visibility);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let draft = null;

    if (draftId && mongoose.Types.ObjectId.isValid(String(draftId))) {
      draft = await Task.findOne({
        _id: draftId,
        creatorId: toObjectId(userId),
        isActive: true,
        $or: [
          { isDraft: true },
          { visibility: 'DRAFT' }
        ]
      }).session(session);

      // CRITICAL: If draftId was provided but not found as a draft, 
      // it might have been published already. STOP here to prevent duplicates.
      if (!draft) {
        await session.commitTransaction();
        return getTaskById(draftId, userId, role);
      }
    }

    if (!draft) {
      draft = await Task.findOne(
        buildDraftMatch(userId, organizationId, projectId ?? null, workspaceId ?? null)
      )
        .sort({ updatedAt: -1, createdAt: -1 })
        .session(session);
    }

    let finalWorkspaceId = toObjectId(workspaceId);
    let finalProjectId = toObjectId(projectId);

    if (finalProjectId && !finalWorkspaceId) {
      const Project = mongoose.model('Project');
      const project = await Project.findOne({ _id: finalProjectId }).lean();
      if (project) {
        finalWorkspaceId = (project as any).workspaceId as mongoose.Types.ObjectId;
      }
    }

    let finalStatusId = toObjectId(status) || toObjectId(draft?.status);
    if (!finalStatusId) {
      // Find a default status (e.g. "To Do")
      const defaultStatus = await Status.findOne({ 
        organizationId: toObjectId(organizationId), 
        name: { $regex: /todo|to do/i } 
      }).session(session);
      
      if (defaultStatus) {
        finalStatusId = defaultStatus._id as mongoose.Types.ObjectId;
      }
    }

    const updatePayload: Record<string, any> = {
      title: String(title || '').trim(),
      description,
      projectId: finalProjectId,
      workspaceId: finalWorkspaceId,
      organizationId,
      status: finalStatusId,
      priority: priority || draft?.priority || 'MEDIUM',
      visibility: normalizedVisibility,
      isDraft: true,
      isPublic: false
    };
    const unsetPayload: Record<string, any> = {};

    if (dueDate) {
      updatePayload.dueDate = dueDate;
    } else {
      unsetPayload.dueDate = 1;
    }

    if (draft) {
      draft = await Task.findOneAndUpdate(
        { _id: draft._id, creatorId: toObjectId(userId), isActive: true },
        {
          $set: updatePayload,
          ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
        },
        { new: true, runValidators: true, session }
      );
    } else {
      const [createdDraft] = await Task.create([{
        ...updatePayload,
        dueDate: dueDate || undefined,
        creatorId: userId
      }], { session });
      draft = createdDraft;
    }

    if (!draft) {
      throw new AppError('Unable to save draft.', 500);
    }

    await syncTaskVisibilityUsers(draft._id, normalizedVisibility, visibleToUsers, organizationId, session);
    await syncTaskAssignees(draft._id, normalizedAssignees, organizationId, userId, session);
    await syncTags(draft._id, Array.isArray(tags) ? tags : [], organizationId, workspaceId, session);

    await session.commitTransaction();

    return getTaskById(draft._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const publishDraft = async (
  draftId: any,
  publishData: Record<string, any>,
  userId: string,
  role?: string | null
) => {
  const {
    title,
    description,
    projectId,
    workspaceId,
    organizationId,
    status,
    priority,
    dueDate,
    assignees = [],
    assigneeId,
    assigneeIds = [],
    tags = [],
    visibility,
    visibleToUsers = []
  } = publishData;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const draft = await Task.findOne({
      _id: draftId,
      creatorId: toObjectId(userId),
      isActive: true,
      $or: [
        { isDraft: true },
        { visibility: 'DRAFT' }
      ]
    }).session(session);

    if (!draft) {
      throw new AppError('Draft not found.', 404);
    }

    const normalizedAssignees = Array.from(new Set([
      ...(Array.isArray(assignees) ? assignees : []),
      ...(Array.isArray(assigneeIds) ? assigneeIds : []),
      assigneeId
    ].map(id => String(id || '').trim()).filter(Boolean)));

    const finalTitle = String(title ?? draft.title ?? '').trim();
    if (!finalTitle) {
      throw new AppError('Title is required.', 400);
    }

    const normalizedVisibility = normalizeVisibility(
      visibility === 'DRAFT' ? draft.visibility : (visibility || draft.visibility)
    );

    const updatePayload: Record<string, any> = {
      title: finalTitle,
      description: description ?? draft.description,
      projectId: toObjectId(projectId ?? draft.projectId),
      workspaceId: toObjectId(workspaceId ?? draft.workspaceId),
      organizationId: organizationId || draft.organizationId,
      status: status || draft.status || 'TODO',
      priority: priority || draft.priority || 'MEDIUM',
      visibility: normalizedVisibility,
      isDraft: false,
      isPublic: true
    };
    const unsetPayload: Record<string, any> = {};

    if (dueDate) {
      updatePayload.dueDate = dueDate;
    } else {
      unsetPayload.dueDate = 1;
    }

    // Check if task already has a taskCode (e.g. from a previous draft save that didn't publish)
    // Actually, drafts usually don't have taskCodes until published, unless we want them to.
    // The requirement says "When creating new tasks".
    let taskSequence = draft.sequence;
    let taskCode = draft.taskCode;

    if (!taskSequence && updatePayload.projectId) {
      const project = await Project.findOneAndUpdate(
        { _id: updatePayload.projectId },
        { $inc: { taskSequence: 1 } },
        { new: true, session }
      );
      if (project) {
        taskSequence = project.taskSequence;
        taskCode = `${project.code || 'TASK'}-${taskSequence}`;
      }
    }

    const publishedTask = await Task.findOneAndUpdate(
      { _id: draft._id, creatorId: toObjectId(userId), isActive: true },
      {
        $set: {
          ...updatePayload,
          sequence: taskSequence,
          taskCode: taskCode
        },
        ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
      },
      { new: true, runValidators: true, session }
    );

    if (!publishedTask) {
      throw new AppError('Draft not found.', 404);
    }

    await syncTaskVisibilityUsers(
      publishedTask._id,
      normalizedVisibility,
      Array.isArray(visibleToUsers) ? visibleToUsers : [],
      publishedTask.organizationId,
      session
    );
    await syncTaskAssignees(
      publishedTask._id,
      normalizedAssignees,
      publishedTask.organizationId,
      userId,
      session
    );
    await syncTags(
      publishedTask._id,
      Array.isArray(tags) ? tags : [],
      publishedTask.organizationId,
      publishedTask.workspaceId,
      session
    );

    await session.commitTransaction();

    // BACKGROUND PROCESSING (Non-blocking)
    setImmediate(async () => {
      try {
        // Log status change if it changed during publish
        if (String(draft.status) !== String(publishedTask.status)) {
          await logStatusChange({
            taskId: publishedTask._id,
            userId,
            fromStatus: draft.status,
            toStatus: publishedTask.status,
            organizationId: publishedTask.organizationId
          });
        }

        const projectName = await resolveProjectName(publishedTask.projectId);

        activityLog.logActivity({
          userId,
          organizationId: publishedTask.organizationId,
          workspaceId: publishedTask.workspaceId,
          projectId: publishedTask.projectId,
          resourceId: publishedTask._id,
          resourceType: 'Task',
          action: 'CREATE',
          metadata: {
            taskId: String(publishedTask._id),
            taskTitle: publishedTask.title,
            title: publishedTask.title,
            projectName,
            newStatus: publishedTask.status,
            assignedTo: '-',
            changedFields: ['Title', 'Description', 'Status'],
            timestamp: new Date(),
          }
        });

        if (normalizedAssignees.length > 0) {
          activityLog.triggerNotification({
            userIds: normalizedAssignees,
            organizationId: publishedTask.organizationId,
            actorId: userId,
            type: 'TASK_ASSIGNED',
            message: `Assigned: ${publishedTask.title}`,
            resourceId: publishedTask._id,
            resourceType: 'Task',
            metadata: {
              taskId: String(publishedTask._id),
              taskTitle: publishedTask.title,
              projectName,
              timestamp: new Date(),
            }
          });
        }

        emitToRoom(
          SOCKET_ROOMS.WORKSPACE(publishedTask.workspaceId),
          SOCKET_EVENTS.TASK_CREATED,
          { taskId: publishedTask._id, title: publishedTask.title }
        );
      } catch (err) {
        console.error("[TASK_PUBLISH_BACKGROUND_ERROR]", err);
      }
    });

    return getTaskById(publishedTask._id, userId, role);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const deleteDraft = async (draftId: any, userId: string) => {
  const draft = await Task.findOne({
    _id: draftId,
    creatorId: toObjectId(userId),
    isActive: true,
    $or: [
      { isDraft: true },
      { visibility: 'DRAFT' }
    ]
  });

  if (!draft) {
    throw new AppError('Draft not found.', 404);
  }

  draft.isActive = false;
  await draft.save();

  return { success: true };
};

/**
 * Get tasks
 */
export const getTasks = async (filter: Record<string, any>, { page = 1, limit = 10 } = {}, userId?: string, userRole?: string | null) => {
  const skip = (page - 1) * limit;
  const query: Record<string, any> = {
    isActive: true,
  };

  // We use an array of AND conditions to avoid overwriting $or
  const andConditions: any[] = [
    {
      $or: [
        { isDraft: { $ne: true } }, // All non-draft tasks (includes legacy data)
        { isDraft: true, creatorId: toObjectId(userId) } // Only the creator can see their own drafts
      ]
    }
  ];

  const orgId = toObjectId(filter.organizationId);
  if (orgId) query.organizationId = orgId;

  if (filter.workspaceId) query.workspaceId = toObjectId(filter.workspaceId);
  if (filter.projectId) query.projectId = toObjectId(filter.projectId);
  if (filter.status) {
    if (filter.status.toLowerCase() === 'draft') {
      query.isDraft = true;
    } else {
      const statusId = toObjectId(filter.status);
      
      // We want to be extremely robust: match ObjectId OR various string formats
      const statusMatchTerms: any[] = [filter.status];
      if (statusId) statusMatchTerms.push(statusId);

      // Try to find the dynamic status document to get its name and ID variations
      const resolvedStatuses = await Status.find({ 
        organizationId: orgId, 
        $or: [
          { name: new RegExp(`^${filter.status}$`, 'i') },
          ...(statusId ? [{ _id: statusId }] : [])
        ]
      }).lean();

      resolvedStatuses.forEach(s => {
        statusMatchTerms.push(s._id);
        statusMatchTerms.push(s.name);
        // Also match common legacy versions (e.g. "To Do" -> "TODO" or "TO_DO")
        statusMatchTerms.push(s.name.toUpperCase().replace(/\s+/g, '_'));
        statusMatchTerms.push(s.name.toUpperCase().replace(/\s+/g, ''));
      });

      // Deduplicate and apply to query
      query.status = { $in: [...new Set(statusMatchTerms.map(t => t.toString())), ...statusMatchTerms.filter(t => t instanceof mongoose.Types.ObjectId)] };
    }
  }
  if (filter.priority) query.priority = filter.priority;
  if (filter.visibility) query.visibility = filter.visibility;
  if (filter.creatorId) query.creatorId = toObjectId(filter.creatorId);
  if (filter.dueDate) {
    const targetDate = new Date(filter.dueDate);
    // If the frontend sends a specific date, we want to match tasks due ON that day.
    // Or if the requirement is 'due by this date', we should at least include the whole day.
    // Let's match the entire day to be safe and intuitive for an exact date filter.
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    query.dueDate = { $gte: startOfDay, $lte: endOfDay };
  }
  if (filter.search) {
    const term = String(filter.search).trim();
    const regex = new RegExp(term, 'i');
    andConditions.push({
      $or: [
        { title: regex }, 
        { description: regex },
        { taskCode: regex },
        { legacyId: term }
      ]
    });
  }

  if (filter.assigneeId === "UNASSIGNED") {
    // Find all task IDs that HAVE assignees in this organization
    const assignedTIds = await TaskAssignee.find({ organizationId: query.organizationId }).distinct('taskId');
    // Filter tasks that ARE NOT in that list
    query._id = { $nin: assignedTIds };
  } else if (filter.assigneeId) {
    const tIds = await TaskAssignee.find({ userId: toObjectId(filter.assigneeId) }).distinct('taskId');
    query._id = { $in: tIds };
  }

  if (filter.creatorOrAssigneeId) {
    const userId = toObjectId(filter.creatorOrAssigneeId);
    const assignedTIds = await TaskAssignee.find({ userId }).distinct("taskId");
    andConditions.push({
      $or: [
        { creatorId: userId },
        { _id: { $in: assignedTIds } }
      ]
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  let normalizedTagIds = filter.tagIds;
  if (typeof normalizedTagIds === 'string') {
    normalizedTagIds = normalizedTagIds.split(',').filter(Boolean);
  }

  if (normalizedTagIds && Array.isArray(normalizedTagIds) && normalizedTagIds.length > 0) {
    const tagIds = normalizedTagIds.map(toObjectId).filter(Boolean);
    const tasksWithTags = await TaskTag.aggregate([
      { $match: { tagId: { $in: tagIds }, organizationId: query.organizationId } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
      { $match: { count: tagIds.length } }
    ]);
    const matchedIds = tasksWithTags.map(t => t._id);
    if (query._id) query._id.$in = query._id.$in.filter((id: any) => matchedIds.some(m => String(m) === String(id)));
    else query._id = { $in: matchedIds };
  }

  // Apply visibility filtering
  let tasks: any[] = [];
  let totalCount: number = 0;

  if (userId) {
    // Use aggregation pipeline for visibility enforcement
    const pipeline: any[] = [
      { $match: query },
      {
        $lookup: {
          from: 'taskvisibilityusers',
          let: { taskId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$taskId', '$$taskId'] },
                    { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] }
                  ]
                }
              }
            }
          ],
          as: 'visibilityAccess'
        }
      }
    ];

    const isAdmin = isAdminRole(userRole);

    if (!isAdmin) {
      pipeline.push({
        $match: {
          $or: [
            { visibility: 'PUBLIC' },
            { visibility: null },
            { visibility: { $exists: false } },
            {
              $and: [
                { visibility: 'PRIVATE' },
                {
                  $or: [
                    { creatorId: new mongoose.Types.ObjectId(userId) },
                    { visibilityAccess: { $size: 1 } }
                  ]
                }
              ]
            }
          ]
        }
      });
    }

    if (filter.sortBy === 'manual' && filter.status) {
      const uco = await UserColumnOrder.findOne({
        userId: toObjectId(userId),
        projectId: toObjectId(filter.projectId) || null,
        statusId: filter.status
      }).lean();
      
      if (uco && uco.taskIds) {
        filter.manualOrderTaskIds = uco.taskIds;
      } else {
        filter.manualOrderTaskIds = [];
      }
    }

    const { stages: sortStages, sortParams } = buildTaskSortStages(filter);

    if (sortStages.length > 0) {
      pipeline.push(...sortStages);
    }

    pipeline.push(
      { $sort: sortParams },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'projectId'
        }
      },
      { $unwind: { path: '$projectId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'workspaces',
          localField: 'workspaceId',
          foreignField: '_id',
          as: 'workspaceId'
        }
      },
      { $unwind: { path: '$workspaceId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: '_id',
          as: 'creatorId'
        }
      },
      { $unwind: { path: '$creatorId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'statuses',
          localField: 'status',
          foreignField: '_id',
          as: 'status_obj'
        }
      },
      { $unwind: { path: '$status_obj', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          status: { $ifNull: ['$status_obj', '$status'] }
        }
      }
    );

    const skipIndex = pipeline.findIndex(p => '$skip' in p);
    const countPipeline = skipIndex !== -1 ? pipeline.slice(0, skipIndex) : [...pipeline];
    countPipeline.push({ $count: 'count' });

    const [countResult, taskResults] = await Promise.all([
      Task.aggregate(countPipeline),
      Task.aggregate(pipeline)
    ]);

    totalCount = countResult[0]?.count || 0;
    tasks = taskResults;
  } else {
    // No user specified - return only public, non-draft tasks.
    query.$or = [{ visibility: 'PUBLIC' }, { visibility: { $exists: false } }];
    
    const [fetchedTasks, count] = await Promise.all([
      Task.find(query)
        .sort({ updatedAt: -1 })
        .populate('projectId', 'name')
        .populate('workspaceId', 'name')
        .populate('creatorId', 'firstName lastName email avatarUrl')
        .populate('status')
        .lean(),
      Task.countDocuments(query)
    ]);
    
    tasks = fetchedTasks;
    totalCount = count;
  }

  if (tasks.length === 0) return { tasks, totalCount };

  const taskIds = tasks.map(t => t._id);
  const [assigneeRows, tagRows, pageRows] = await Promise.all([
    TaskAssignee.find({ taskId: { $in: taskIds } }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: { $in: taskIds } }).populate('tagId').lean(),
    TaskPage.find({ taskId: { $in: taskIds } }).lean()
  ]);

  const assigneesByTaskId = new Map();
  assigneeRows.forEach(row => {
    const existing = assigneesByTaskId.get(String(row.taskId)) || [];
    existing.push(row);
    assigneesByTaskId.set(String(row.taskId), existing);
  });

  const tagsByTaskId = new Map();
  tagRows.forEach((row: any) => {
    const existing = tagsByTaskId.get(String(row.taskId)) || [];
    const normalized = normalizeTags([row]);
    if (normalized.length > 0) existing.push(normalized[0]);
    tagsByTaskId.set(String(row.taskId), existing);
  });

  const pagesCountByTaskId = new Map();
  pageRows.forEach(row => {
    const count = pagesCountByTaskId.get(String(row.taskId)) || 0;
    pagesCountByTaskId.set(String(row.taskId), count + 1);
  });

  return {
    tasks: tasks.map(t => ({
      ...enrichTaskWithAssignees(t, assigneesByTaskId.get(String(t._id))),
      creator: normalizeUser(t.creatorId),
      tags: tagsByTaskId.get(String(t._id)) || [],
      visibility: t.visibility || 'PUBLIC',
      linkedPagesCount: pagesCountByTaskId.get(String(t._id)) || 0
    })),
    totalCount
  };
};

/**
 * Update task
 */
export const updateTask = async (taskId: any, updateData: Record<string, any>, userId: any, role?: string | null) => {
  const { assigneeId, assigneeIds, tags, visibility, visibleToUsers, ...otherData } = updateData;
  const previousTask = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!previousTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(previousTask, userId);

  // Check permissions: only creator or admin can change visibility
  const isCreator = String(previousTask.creatorId) === String(userId);
  const isAdmin = isAdminRole(role);

  if (visibility && !isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can change task visibility.', 403);
  }

  const updatePayload: Record<string, any> = { ...otherData };
  
  // AUTO-PUBLISH LOGIC: Only publish if it was a draft AND (we are changing its status OR explicitly publishing)
  const isPublishing = previousTask.isDraft && (updateData.isDraft === false || (updateData.status && String(updateData.status) !== String(previousTask.status)));
  
  if (isPublishing) {
    updatePayload.isDraft = false;
    updatePayload.isPublic = true;

    // Generate taskCode if it doesn't exist
    if (!previousTask.taskCode) {
      const pId = updatePayload.projectId || previousTask.projectId;
      if (pId) {
        const project = await Project.findOneAndUpdate(
          { _id: pId },
          { $inc: { taskSequence: 1 } },
          { new: true }
        );
        if (project) {
          updatePayload.sequence = project.taskSequence;
          updatePayload.taskCode = `${project.code || 'TASK'}-${project.taskSequence}`;
        }
      }
    }
  }

  const unsetPayload: Record<string, any> = {};
  if (visibility) {
    updatePayload.visibility = normalizeVisibility(visibility);
  }
  if (Object.prototype.hasOwnProperty.call(otherData, 'dueDate') && !otherData.dueDate) {
    unsetPayload.dueDate = 1;
    delete updatePayload.dueDate;
  }
  const task = await Task.findOneAndUpdate(
    { _id: taskId, isActive: true },
    {
      $set: updatePayload,
      ...(Object.keys(unsetPayload).length > 0 ? { $unset: unsetPayload } : {})
    },
    { new: true }
  );
  if (!task) throw new AppError('Task not found.', 404);
  const draftState = isTaskDraft(task) || isTaskDraft(previousTask);

  // Handle visibility users update
  if (visibility === 'PRIVATE' && visibleToUsers) {
    await visibilityHelpers.clearTaskVisibilityUsers(taskId);
    if (Array.isArray(visibleToUsers) && visibleToUsers.length > 0) {
      await visibilityHelpers.addTaskVisibilityUsers(taskId, visibleToUsers, task.organizationId);
    }
  } else if (visibility && visibility !== 'PRIVATE') {
    // Clear visibility users if changing from private to public/draft
    await visibilityHelpers.clearTaskVisibilityUsers(taskId);
  }

  const projectName = await resolveProjectName(task.projectId);
  const changedFields = Object.keys(updateData);
  const statusUpdated =
    Object.prototype.hasOwnProperty.call(updateData, 'status') &&
    String(previousTask.status || '') !== String(task.status || '');

  if (Array.isArray(tags)) {
    await syncTags(taskId, tags, task.organizationId, task.workspaceId);
  }

  const normalizedAssigneeIds = Array.from(new Set([
    ...(Array.isArray(assigneeIds) ? assigneeIds : []),
    assigneeId
  ].map(id => String(id || '').trim()).filter(Boolean)));

  const shouldSyncAssignees =
    Array.isArray(assigneeIds) || Object.prototype.hasOwnProperty.call(updateData, 'assigneeId');

  if (shouldSyncAssignees) {
    await syncTaskAssignees(taskId, normalizedAssigneeIds, task.organizationId, userId);
  }

  if (!draftState && normalizedAssigneeIds.length > 0) {
    activityLog.triggerNotification({
      userIds: normalizedAssigneeIds,
      organizationId: task.organizationId,
      actorId: userId,
      type: 'TASK_ASSIGNED',
      message: `Assigned: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        projectName,
        timestamp: new Date(),
      }
    });
  }

  if (!draftState) {
    if (statusUpdated) {
      await logStatusChange({
        taskId,
        userId,
        fromStatus: previousTask.status,
        toStatus: task.status,
        organizationId: task.organizationId
      });
    }

    activityLog.logActivity({

      userId, organizationId: task.organizationId, workspaceId: task.workspaceId,
      projectId: task.projectId,
      resourceId: taskId,
      resourceType: 'TASK',
      action: statusUpdated ? 'STATUS_CHANGE' : 'UPDATE',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        title: task.title,
        projectName,
        oldStatus: previousTask.status,
        newStatus: task.status,
        updatedFields: changedFields,
        changedFields,
        timestamp: new Date(),
      }
    });
  }

  return getTaskById(taskId, userId, role);
};

export const getTaskById = async (taskId: any, userId?: string, userRole?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true })
    .populate('projectId', 'name githubSettings')
    .populate('workspaceId', 'name')
    .populate('creatorId', 'firstName lastName email avatarUrl')
    .populate('status')
    .lean();
    
  if (!task) throw new AppError('Task not found.', 404);

  // Check visibility if userId provided
  if (userId) {
    const hasAccess = await visibilityHelpers.canUserAccessTask(
      task._id,
      userId,
      task.creatorId?._id || task.creatorId,
      task.visibility,
      userRole,
      isTaskDraft(task)
    );
    if (!hasAccess) {
      throw new AppError('Access denied to this task.', 403);
    }
  }

  const [assignees, tags, visibilityUsers] = await Promise.all([
    TaskAssignee.find({ taskId: task._id }).populate('userId', 'firstName lastName email avatarUrl').lean(),
    TaskTag.find({ taskId: task._id }).populate('tagId').lean(),
    task.visibility === 'PRIVATE' ? visibilityHelpers.getTaskVisibilityUsers(task._id, task.organizationId) : Promise.resolve([])
  ]);

  return { 
    ...enrichTaskWithAssignees(task, assignees), 
    creator: normalizeUser(task.creatorId), 
    tags: normalizeTags(tags),
    visibility: task.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
    visibilityUsers: visibilityUsers.map((vu: any) => ({
      id: String(vu.userId?._id || vu.userId),
      name: vu.userId?.firstName ? `${vu.userId.firstName} ${vu.userId.lastName || ''}`.trim() : 'Unknown',
      email: vu.userId?.email,
      avatarUrl: vu.userId?.avatarUrl
    }))
  };
};

export const deleteTask = async (taskId: any, userId: any) => {
  const existingTask = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!existingTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(existingTask, userId);

  const task = await Task.findOneAndUpdate({ _id: taskId, isActive: true }, { $set: { isActive: false } });
  if (!task) throw new AppError('Task not found.', 404);

  if (isTaskDraft(task)) {
    return;
  }

  const projectName = await resolveProjectName(task.projectId);
  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: taskId,
    resourceType: 'Task',
    action: 'DELETE',
    metadata: {
      taskId: String(taskId),
      taskTitle: task.title,
      title: task.title,
      projectName,
      timestamp: new Date(),
    }
  });

  emitToRoom(
    SOCKET_ROOMS.WORKSPACE(task.workspaceId),
    SOCKET_EVENTS.TASK_DELETED,
    { taskId: task._id }
  );
};

export const changeStatus = async (taskId: any, newStatus: any, userId: any) => {
  const previousTask = await Task.findOne({ _id: taskId }).lean();
  if (!previousTask) throw new AppError('Task not found.', 404);
  ensureDraftOwner(previousTask, userId);

  const finalStatusId = toObjectId(newStatus) || newStatus;
  const task = await Task.findOneAndUpdate({ _id: taskId }, { $set: { status: finalStatusId } }, { new: true });
  if (!task) throw new AppError('Task not found.', 404);

  if (isTaskDraft(task)) {
    return task;
  }

  const projectName = await resolveProjectName(task.projectId);
  activityLog.logActivity({
    userId,
    organizationId: task.organizationId,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    resourceId: task._id,
    resourceType: 'Task',
    action: 'STATUS_CHANGE',
    metadata: {
      taskId: String(task._id),
      taskTitle: task.title,
      title: task.title,
      projectName,
      oldStatus: previousTask.status,
      newStatus,
      timestamp: new Date(),
    }
  });

  await logStatusChange({
    taskId: task._id,
    userId,
    fromStatus: previousTask.status,
    toStatus: finalStatusId,
    organizationId: task.organizationId
  });

  return task;

};

export const assignUsers = async (taskId: any, userIds: any[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId });
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);
  const projectName = await resolveProjectName(task.projectId);
  await TaskAssignee.deleteMany({ taskId });
  await TaskAssignee.insertMany(userIds.map(uId => ({ taskId, userId: uId, organizationId: task.organizationId, assignedById: actorId })));

  if (isTaskDraft(task)) {
    return { success: true };
  }

  if (userIds.length > 0) {
    activityLog.triggerNotification({
      userIds,
      organizationId: task.organizationId,
      actorId,
      type: 'TASK_ASSIGNED',
      message: `Assigned: ${task.title}`,
      resourceId: taskId,
      resourceType: 'Task',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        projectName,
        timestamp: new Date(),
      }
    });

    activityLog.logActivity({
      userId: actorId,
      organizationId: task.organizationId,
      resourceId: taskId,
      resourceType: 'TASK',
      action: 'ASSIGN',
      metadata: {
        taskId: String(taskId),
        taskTitle: task.title,
        title: task.title,
        projectName,
        assignedTo: userIds.length === 1 ? 'New User' : `${userIds.length} users`,
        timestamp: new Date(),
      }
    });
  }

  return { success: true };
};

/**
 * Add users to a private task's visibility list
 */
export const addTaskVisibilityUsers = async (taskId: any, userIds: string[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);

  // Check permissions: only creator or admin can manage visibility
  const isCreator = String(task.creatorId) === String(actorId);
  const isAdmin = isAdminRole(role);

  if (!isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can manage task visibility.', 403);
  }

  if (task.visibility !== 'PRIVATE') {
    throw new AppError('Can only add users to private tasks.', 400);
  }

  await visibilityHelpers.addTaskVisibilityUsers(taskId, userIds, task.organizationId);
};

/**
 * Remove users from a private task's visibility list
 */
export const removeTaskVisibilityUsers = async (taskId: any, userIds: string[], actorId: any, role?: string | null) => {
  const task = await Task.findOne({ _id: taskId, isActive: true }).lean();
  if (!task) throw new AppError('Task not found.', 404);
  ensureDraftOwner(task, actorId);

  // Check permissions: only creator or admin can manage visibility
  const isCreator = String(task.creatorId) === String(actorId);
  const isAdmin = isAdminRole(role);

  if (!isCreator && !isAdmin) {
    throw new AppError('Only creator or admin can manage task visibility.', 403);
  }

  await visibilityHelpers.removeTaskVisibilityUsers(taskId, userIds);
};

/**
 * Get status history for a task
 */
export const getStatusHistory = async (taskId: any, organizationId: any) => {
  const history = await TaskStatusHistory.find({
    taskId: toObjectId(taskId),
    organizationId: toObjectId(organizationId)
  })
    .sort({ changedAt: -1 })
    .populate('changedBy', 'firstName lastName email avatarUrl')
    .lean();


  return history.map(item => ({
    id: String(item._id),
    taskId: String(item.taskId),
    changedBy: String(item.changedBy?._id || item.changedBy),
    changedByName: item.changedByName,
    changedByAvatar: (item.changedBy as any)?.avatarUrl,
    fromStatus: item.fromStatusName ? {
      id: String(item.fromStatus),
      name: item.fromStatusName,
      color: item.fromStatusColor || '#64748b'
    } : null,
    toStatus: {
      id: String(item.toStatus),
      name: item.toStatusName,
      color: item.toStatusColor || '#64748b'
    },
    changedAt: item.changedAt
  }));
};

/**
 * Get global status history with filters
 */
export const getGlobalStatusHistory = async (organizationId: any, filters: any, pagination: { page: number, limit: number }) => {
  const query: any = { organizationId: toObjectId(organizationId) };

  if (filters.taskId) query.taskId = toObjectId(filters.taskId);
  if (filters.userId) query.changedBy = toObjectId(filters.userId);
  if (filters.toStatus) query.toStatusName = filters.toStatus;
  
  if (filters.startDate || filters.endDate) {
    query.changedAt = {};
    if (filters.startDate) query.changedAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.changedAt.$lte = new Date(filters.endDate);
  }

  const [history, totalCount] = await Promise.all([
    TaskStatusHistory.find(query)
      .sort({ changedAt: -1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .populate('changedBy', 'firstName lastName email avatarUrl')
      .populate('taskId', 'title taskCode')
      .lean(),
    TaskStatusHistory.countDocuments(query)
  ]);


  const tasks = history.map(item => ({
    id: String(item._id),
    taskId: String(item.taskId?._id || item.taskId),
    taskTitle: (item.taskId as any)?.title || 'Deleted Task',
    taskCode: (item.taskId as any)?.taskCode || 'N/A',
    changedBy: String(item.changedBy?._id || item.changedBy),
    changedByName: item.changedByName,
    changedByAvatar: (item.changedBy as any)?.avatarUrl,
    fromStatus: item.fromStatusName ? {
      id: String(item.fromStatus),
      name: item.fromStatusName,
      color: item.fromStatusColor || '#64748b'
    } : null,
    toStatus: {
      id: String(item.toStatus),
      name: item.toStatusName,
      color: item.toStatusColor || '#64748b'
    },
    changedAt: item.changedAt
  }));

  return { tasks, totalCount };
};

/**
 * Task ↔ Pages Integration
 */

export const attachPage = async (taskId: string, pageId: string, userId: string, organizationId: string) => {
  const task = await getTaskById(taskId, userId, 'MEMBER');
  if (!task) throw new AppError('Task not found', 404);

  const page = await Page.findOne({ _id: toObjectId(pageId), organizationId: toObjectId(organizationId), isActive: true });
  if (!page) throw new AppError('Page not found', 404);

  const existing = await TaskPage.findOne({ taskId: toObjectId(taskId), pageId: page._id });
  if (existing) return existing;

  const taskPage = await TaskPage.create({
    taskId: toObjectId(taskId),
    pageId: page._id,
    linkedBy: toObjectId(userId)
  });

  await activityLog.logActivity({
    action: 'PAGE_ATTACHED',
    resourceType: 'TASK',
    resourceId: taskId,
    userId: userId,
    organizationId,
    projectId: task.projectId ? String(task.projectId) : undefined,
    metadata: {
      pageId: String(page._id),
      pageTitle: page.title,
      taskTitle: task.title
    }
  });

  return taskPage;
};

export const detachPage = async (taskId: string, pageId: string, userId: string, organizationId: string) => {
  const task = await getTaskById(taskId, userId, 'MEMBER');
  if (!task) throw new AppError('Task not found', 404);

  const result = await TaskPage.findOneAndDelete({ taskId: toObjectId(taskId), pageId: toObjectId(pageId) });
  if (!result) return;

  const page = await Page.findById(pageId).select('title').lean();

  await activityLog.logActivity({
    action: 'PAGE_DETACHED',
    resourceType: 'TASK',
    resourceId: taskId,
    userId: userId,
    organizationId,
    projectId: task.projectId ? String(task.projectId) : undefined,
    metadata: {
      pageId,
      pageTitle: page?.title || 'Unknown Page',
      taskTitle: task.title
    }
  });
};

export const getLinkedPages = async (taskId: string, userId: string, organizationId: string) => {
  const task = await getTaskById(taskId, userId, 'MEMBER');
  if (!task) throw new AppError('Task not found', 404);

  const links = await TaskPage.find({ taskId: toObjectId(taskId) })
    .populate({
      path: 'pageId',
      select: 'title visibility updatedAt creatorId isActive',
      populate: { path: 'creatorId', select: 'firstName lastName email avatarUrl' }
    })
    .sort({ createdAt: -1 })
    .lean();

  return links
    .filter((link: any) => link.pageId != null && link.pageId.isActive)
    .map((link: any) => ({
      id: String(link.pageId._id),
      title: link.pageId.title,
      visibility: link.pageId.visibility,
      updatedAt: link.pageId.updatedAt,
      owner: normalizeUser(link.pageId.creatorId),
      linkedAt: link.createdAt,
      linkedBy: link.linkedBy
    }));
};

export const createAndAttachPage = async (taskId: string, pageData: any, userId: string, organizationId: string) => {
  const task = await getTaskById(taskId, userId, 'MEMBER');
  if (!task) throw new AppError('Task not found', 404);

  const page = await Page.create({
    title: pageData.title || `${task.taskCode || ''} ${task.title}`.trim(),
    content: pageData.content || '<p></p>',
    visibility: pageData.visibility || 'WORKSPACE',
    organizationId: toObjectId(organizationId),
    creatorId: toObjectId(userId),
    isActive: true,
  });

  const taskPage = await TaskPage.create({
    taskId: toObjectId(taskId),
    pageId: page._id,
    linkedBy: toObjectId(userId)
  });

  await activityLog.logActivity({
    action: 'PAGE_ATTACHED',
    resourceType: 'TASK',
    resourceId: taskId,
    userId: userId,
    organizationId,
    projectId: task.projectId ? String(task.projectId) : undefined,
    metadata: {
      pageId: String(page._id),
      pageTitle: page.title,
      taskTitle: task.title,
      createdFromTask: true
    }
  });

  return {
    id: String(page._id),
    title: page.title,
    visibility: page.visibility,
    updatedAt: page.updatedAt,
    owner: { id: userId, name: 'You' }, // Minimal placeholder
    linkedAt: taskPage.createdAt
  };
};

export const saveUserColumnOrder = async (userId: string, projectId: string | null, statusId: string, taskIds: string[]) => {
  await UserColumnOrder.findOneAndUpdate(
    { userId: toObjectId(userId), projectId: toObjectId(projectId), statusId },
    { taskIds: taskIds.map(toObjectId) },
    { upsert: true, new: true }
  );
};
