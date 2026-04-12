export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  // assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  tags?: string[];
  assigneeId?: string;
  assigneeIds?: string[];
  assigneeUsers?: TaskAssigneeUser[];
  assignees?: TaskAssigneeRelation[];
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
  dueDate?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
  assigneeIds?: string[];
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
  tagId?: string;
  dueDate?: string;
}

export interface AssignTaskUsersInput {
  userIds: string[];
}
