export type ProjectStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  organizationId: string;
  workspaceId?: string;
  createdBy: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  workspaceId?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  workspaceId?: string;
  status?: ProjectStatus;
  createdBy?: string;
}
