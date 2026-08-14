export type ProjectStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type ProjectVisibility = "public" | "private";

export interface ProjectMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  techStack: string[];
  organizationId: string;
  workspaceId?: string;
  ownerId: any; // ID or populated User object
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  members?: any[]; // Populated members
  defaultAssigneeIds?: string[];
  githubSettings?: {
    repoUrl?: string;
    isEnabled?: boolean;
    autoStatusUpdate?: boolean;
  };
}

export interface CreateProjectInput {
  name: string;
  code?: string;
  description?: string;
  workspaceId?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  techStack?: string[];
  startDate?: string;
  endDate?: string;
  members?: string[]; // Array of User IDs
  defaultAssigneeIds?: string[];
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  workspaceId?: string;
  status?: ProjectStatus;
  createdBy?: string;
}
