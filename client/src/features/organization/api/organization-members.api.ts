import { api } from "@/lib/api/axios-instance";
import { ApiResponse } from "@/types/api.types";

export type OrganizationMemberRole = "ADMIN" | "MEMBER" | "MANAGER" | "SUPER_ADMIN";
export type OrganizationInviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export interface OrganizationMemberRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: OrganizationMemberRole;
  status: "ACTIVE" | "PENDING";
  joinedAt?: string;
}

export interface OrganizationInviteRecord {
  id: string;
  organizationId: {
    id?: string;
    _id?: string;
    name?: string;
    slug?: string;
    logoUrl?: string;
  } | string;
  email: string;
  role: "ADMIN" | "MEMBER";
  token: string;
  status: OrganizationInviteStatus;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
  invitedBy?: string;
}

export interface OrganizationMembersResponse {
  members: OrganizationMemberRecord[];
  invites: OrganizationInviteRecord[];
}

export const organizationMembersApi = {
  async getMembers(orgId: string): Promise<ApiResponse<OrganizationMembersResponse>> {
    const response = await api.get<ApiResponse<OrganizationMembersResponse>>(
      `/organizations/${orgId}/members`,
    );
    return response.data;
  },

  async inviteMember(orgId: string, payload: { email: string; role: "ADMIN" | "MEMBER" }) {
    const response = await api.post<ApiResponse<OrganizationInviteRecord>>(
      `/organizations/${orgId}/invite`,
      payload,
    );
    return response.data;
  },

  async updateMemberRole(orgId: string, userId: string, role: OrganizationMemberRole) {
    const response = await api.patch<ApiResponse<unknown>>(
      `/organizations/${orgId}/member/${userId}`,
      { role },
    );
    return response.data;
  },

  async removeMember(orgId: string, userId: string) {
    const response = await api.delete<ApiResponse<unknown>>(
      `/organizations/${orgId}/member/${userId}`,
    );
    return response.data;
  },

  async listInvites(orgId: string): Promise<ApiResponse<OrganizationInviteRecord[]>> {
    const response = await api.get<ApiResponse<OrganizationInviteRecord[]>>(
      `/organizations/${orgId}/invites`,
    );
    return response.data;
  },

  async resendInvite(orgId: string, inviteId: string) {
    const response = await api.post<ApiResponse<OrganizationInviteRecord>>(
      `/organizations/${orgId}/invites/${inviteId}/resend`,
    );
    return response.data;
  },

  async revokeInvite(orgId: string, inviteId: string) {
    const response = await api.delete<ApiResponse<OrganizationInviteRecord>>(
      `/organizations/${orgId}/invites/${inviteId}`,
    );
    return response.data;
  },

  async getInviteByToken(token: string): Promise<ApiResponse<OrganizationInviteRecord>> {
    const response = await api.get<ApiResponse<OrganizationInviteRecord>>(
      `/invite/${token}`,
    );
    return response.data;
  },

  async acceptInvite(token: string) {
    const response = await api.post<ApiResponse<{ organizationId: string; alreadyMember?: boolean }>>(
      "/invite/accept",
      { token },
    );
    return response.data;
  },
};
