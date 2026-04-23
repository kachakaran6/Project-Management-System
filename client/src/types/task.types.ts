export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "REJECTED"
  | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskVisibility = "PUBLIC" | "PRIVATE" | "DRAFT";

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
  tags?: Tag[];
  tagIds?: string[];
  assigneeId?: string;
  assigneeIds?: string[];
  assigneeUsers?: TaskAssigneeUser[];
  assignees?: TaskAssigneeRelation[];
  visibility?: TaskVisibility;
  visibilityUsers?: TaskAssigneeUser[];
  position?: number;
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
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  assigneeIds?: string[];
  tags?: string[];
  visibility?: TaskVisibility;
  visibleToUsers?: string[];
  position?: number;
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
}

export interface AssignTaskUsersInput {
  userIds: string[];
}
