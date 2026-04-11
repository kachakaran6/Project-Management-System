export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER" | "USER";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserWithRole extends User {
  role?: Role;
  organizationId?: string | null;
}

export interface UserListItem extends User {
  isActive?: boolean;
  role: Role;
}
