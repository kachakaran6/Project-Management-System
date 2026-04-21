import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export type TeamRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  permissions?: string[];
  status: "ACTIVE" | "DISABLED" | "PENDING";
  avatarUrl?: string;
  lastActive?: string;
}

export interface InvitePayload {
  email: string;
  role: Exclude<TeamRole, "OWNER">;
}

export interface MemberPermissionsResponse {
  role: TeamRole;
  rolePermissions: string[];
  customPermissions: string[];
  effectivePermissions: string[];
}

function deriveRole(candidate: unknown): TeamRole {
  const role = String(candidate ?? "MEMBER").toUpperCase();
  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER" || role === "MEMBER" || role === "VIEWER") {
    return role as TeamRole;
  }
  // Backward compat: SUPER_ADMIN becomes ADMIN
  if (role === "SUPER_ADMIN") return "ADMIN";
  return "MEMBER";
}

export const teamApi = {
  async getMembers(): Promise<TeamMember[]> {
    const response = await api.get<ApiResponse<{ members: any[]; invites: any[] }>>("/organizations/members");
    const data = response.data.data;
    
    const mappedMembers = (data.members ?? []).map((row) => ({
      id: String(row.id || row.userId?._id || row.userId || row._id || ""),
      firstName: String(row.firstName || row.userId?.firstName || ""),
      lastName: String(row.lastName || row.userId?.lastName || ""),
      email: String(row.email || row.userId?.email || ""),
      role: deriveRole(row.role),
      permissions: row.permissions || [],
      status: (row.status || "ACTIVE") as any,
      avatarUrl: row.avatarUrl || row.userId?.avatarUrl,
      lastActive: row.lastActive || row.userId?.lastLogin,
    }));

    const mappedInvites = (data.invites ?? []).map((row) => ({
      id: String(row._id || row.id || ""),
      firstName: "Pending",
      lastName: "Invite",
      email: String(row.email ?? ""),
      role: deriveRole(row.role),
      permissions: [],
      status: "PENDING" as const,
      avatarUrl: undefined,
      lastActive: row.createdAt,
    }));
    
    return [...mappedMembers, ...mappedInvites];
  },

  async inviteMember(payload: InvitePayload): Promise<void> {
    await api.post("/organizations/0/invite", payload);
  },

  /**
   * Update member role - calls the organization API endpoint
   * CRITICAL: Uses correct org-based endpoint with CHANGE_MEMBER_ROLE permission check
   */
  async updateMemberRole(
    memberId: string,
    role: TeamRole,
  ): Promise<ApiResponse<any>> {
    // Get current organization context from auth state or endpoint
    // The endpoint will use req.organizationId from auth middleware
    const response = await api.patch<ApiResponse<any>>(
      `/organizations/0/member/${memberId}`,
      { role }
    );
    return response.data;
  },

  /**
   * Get member permissions (role defaults + custom overrides)
   */
  async getMemberPermissions(memberId: string): Promise<MemberPermissionsResponse> {
    const response = await api.get<ApiResponse<MemberPermissionsResponse>>(
      `/organizations/0/members/${memberId}/permissions`
    );
    return response.data.data;
  },

  /**
   * Update member permissions (add/remove granular permissions)
   */
  async updateMemberPermissions(
    memberId: string,
    permissions: string[]
  ): Promise<ApiResponse<any>> {
    const response = await api.patch<ApiResponse<any>>(
      `/organizations/0/members/${memberId}/permissions`,
      { permissions }
    );
    return response.data;
  },

  /**
   * Get default permissions for a role
   */
  async getRolePermissions(role: TeamRole): Promise<{ role: TeamRole; permissions: string[] }> {
    const response = await api.get<ApiResponse<{ role: TeamRole; permissions: string[] }>>(
      `/organizations/0/roles/${role}/permissions`
    );
    return response.data.data;
  },

  async updateMemberStatus(
    memberId: string,
    status: "ACTIVE" | "DISABLED",
  ): Promise<ApiResponse<any>> {
    const response = await api.patch<ApiResponse<any>>(`/admin/users/${memberId}`, {
      isActive: status === "ACTIVE",
    });
    return response.data;
  },

  async removeMember(memberId: string): Promise<ApiResponse<any>> {
    const response = await api.delete<ApiResponse<any>>(
      `/organizations/0/member/${memberId}`
    );
    return response.data;
  },

  async bulkUpdate(payload: {
    userIds: string[];
    role?: TeamRole;
    status?: "ACTIVE" | "DISABLED";
    action?: "DELETE" | "REMOVE";
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>("/admin/users/bulk", payload);
    return response.data;
  },
};
