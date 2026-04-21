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
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  workspaceId?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  techStack?: string[];
  startDate?: string;
  endDate?: string;
  members?: string[]; // Array of User IDs
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  workspaceId?: string;
  status?: ProjectStatus;
  createdBy?: string;
}
