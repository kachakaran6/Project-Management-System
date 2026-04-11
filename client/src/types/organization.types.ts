export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER";

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
}

export interface OrganizationMembership {
  id: string;
  name: string;
  slug?: string;
  role: Role;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}
