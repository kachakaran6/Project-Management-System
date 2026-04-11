import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export type TeamRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  avatarUrl?: string;
  lastActive?: string;
}

export interface InvitePayload {
  email: string;
  role: Exclude<TeamRole, "SUPER_ADMIN">;
}

function deriveRole(candidate: unknown): TeamRole {
  const role = String(candidate ?? "MEMBER").toUpperCase();
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") {
    return role;
  }
  return "MEMBER";
}

export const teamApi = {
  async getMembers(): Promise<TeamMember[]> {
    const response = await api.get<ApiResponse<{ members: any[]; invites: any[] }>>("/organizations/members");
    const data = response.data.data;
    
    return (data.members ?? []).map((row) => ({
      id: String(row.id || row.userId || row._id || ""),
      firstName: String(row.firstName ?? ""),
      lastName: String(row.lastName ?? ""),
      email: String(row.email ?? ""),
      role: deriveRole(row.role),
      status: row.status as any,
      avatarUrl: row.avatarUrl as string | undefined,
      lastActive: row.lastActive as string | undefined, // Mapping joinedAt or lastActive if available
    }));
  },

  async inviteMember(payload: InvitePayload): Promise<void> {
    await api.post("/invites", payload);
  },

  async updateMemberRole(
    memberId: string,
    role: TeamRole,
  ): Promise<ApiResponse<any>> {
    const response = await api.patch<ApiResponse<any>>(`/admin/users/${memberId}`, { role });
    return response.data;
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
    const response = await api.delete<ApiResponse<any>>(`/admin/users/${memberId}`);
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
