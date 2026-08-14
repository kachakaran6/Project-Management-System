export type TaskStatus = string;
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskVisibility = "PUBLIC" | "PRIVATE" | "DRAFT";
export type TaskSortField =
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "priority"
  | "title"
  | "status"
  | "assignee"
  | "position";
export type TaskSortDirection = "asc" | "desc";

export interface Status {
  id: string;
  _id?: string;
  name: string;
  color: string;
  order: number;
  organizationId: string;
  isDefault?: boolean;
  isSystem?: boolean;
  isHiddenIfEmpty?: boolean;
}

export interface TaskAssigneeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface TaskAssigneeRelation {
  userId:
    | string
    | {
        _id?: string;
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        avatarUrl?: string;
      };
}

export interface Tag {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  creatorId: string;
  creator?: TaskAssigneeUser;
  dueDate?: string;
  isDraft?: boolean;
  isPublic?: boolean;
  tags?: Tag[];
  tagIds?: string[];
  assigneeId?: string;
  assigneeIds?: string[];
  assigneeUsers?: TaskAssigneeUser[];
  assignees?: TaskAssigneeRelation[];
  visibility?: TaskVisibility;
  visibilityUsers?: TaskAssigneeUser[];
  position?: number;
  taskCode?: string;
  sequence?: number;
  legacyId?: string;
  githubSettings?: {
    repoUrl?: string;
    isEnabled?: boolean;
  };
  githubLinks?: any[];
  linkedPagesCount?: number;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: string;
  workspaceId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  assignees?: string[];
  visibility?: TaskVisibility;
  visibleToUsers?: string[];
  dueDate?: string;
  tags?: string[];
  position?: number;
  isDraft?: boolean;
  isPublic?: boolean;
  images?: string[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  assigneeIds?: string[];
  tags?: string[];
  visibility?: TaskVisibility;
  visibleToUsers?: string[];
  position?: number;
  isDraft?: boolean;
  isPublic?: boolean;
  images?: string[];
}

export interface TaskDraftInput {
  draftId?: string;
  title?: string;
  description?: string;
  projectId?: string;
  workspaceId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  assigneeIds?: string[];
  assignees?: string[];
  visibility?: Exclude<TaskVisibility, "DRAFT"> | TaskVisibility;
  visibleToUsers?: string[];
  dueDate?: string;
  tags?: string[];
  position?: number;
  isDraft?: boolean;
  isPublic?: boolean;
  images?: string[];
}

export interface TaskDraftFilters {
  page?: number;
  limit?: number;
  search?: string;
  workspaceId?: string;
  projectId?: string;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  search?: string;
  workspaceId?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId?: string;
  userId?: string;
  tagIds?: string[];
  dueDate?: string;
  sortBy?: TaskSortField;
  sortOrder?: TaskSortDirection;
}

export interface AssignTaskUsersInput {
  userIds: string[];
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  changedBy: string;
  changedByName: string;
  changedByAvatar?: string;
  fromStatus: {
    id: string;
    name: string;
    color: string;
  } | null;
  toStatus: {
    id: string;
    name: string;
    color: string;
  };
  changedAt: string;
}

export interface TaskPageLink {
  id: string;
  title: string;
  visibility: string;
  updatedAt: string;
  owner: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  linkedAt: string;
  linkedBy: string;
}

export interface PageTaskLink {
  id: string;
  title: string;
  taskCode?: string;
  status: {
    id: string;
    name: string;
    color: string;
  } | null;
  priority: TaskPriority;
  dueDate?: string;
  owner: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  } | null;
  linkedAt: string;
  linkedBy: string;
}

