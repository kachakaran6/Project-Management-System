import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export type TeamRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
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
    try {
      const response =
        await api.get<ApiResponse<Array<Record<string, unknown>>>>(
          "/admin/users",
        );
      return (response.data.data ?? []).map((row) => ({
        id: String(row.id ?? row._id ?? ""),
        firstName: String(row.firstName ?? ""),
        lastName: String(row.lastName ?? ""),
        email: String(row.email ?? ""),
        role: deriveRole(row.role),
        status: row.isActive === false ? "SUSPENDED" : "ACTIVE",
      }));
    } catch {
      const inviteResponse =
        await api.get<ApiResponse<Array<Record<string, unknown>>>>("/invites");
      return (inviteResponse.data.data ?? []).map((row, index) => ({
        id: String(row.id ?? row._id ?? `invite-${index}`),
        firstName: "Pending",
        lastName: "Invite",
        email: String(row.email ?? "unknown@pending.local"),
        role: deriveRole(row.role),
        status: "INVITED",
      }));
    }
  },

  async inviteMember(payload: InvitePayload): Promise<void> {
    await api.post("/invites", payload);
  },

  async updateMemberRole(
    memberId: string,
    role: TeamRole,
  ): Promise<{ mocked: boolean }> {
    try {
      await api.patch(`/organization/members/${memberId}`, { role });
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },

  async removeMember(memberId: string): Promise<{ mocked: boolean }> {
    try {
      await api.delete(`/organization/members/${memberId}`);
      return { mocked: false };
    } catch {
      return { mocked: true };
    }
  },
};
