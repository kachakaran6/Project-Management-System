import { OrganizationMembership } from "./organization.types";
import { UserWithRole } from "./user.types";

export interface LoginInput {
  email: string;
  password: string;
  organizationId?: string;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organizationName?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserWithRole;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  user: UserWithRole;
  organizations?: OrganizationMembership[];
  organizationId?: string | null;
  role?: UserWithRole["role"];
}

export interface AuthSession {
  user: UserWithRole;
  accessToken: string;
  organizations: OrganizationMembership[];
}
