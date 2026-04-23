"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { organizationMembersApi } from "@/features/organization/api/organization-members.api";
import { type Role } from "@/types/organization.types";

export const organizationMemberQueryKeys = {
  all: ["organization-members"] as const,
  members: (orgId: string) => ["organization-members", orgId] as const,
};

export function useOrganizationMembersQuery(orgId: string) {
  return useQuery({
    queryKey: organizationMemberQueryKeys.members(orgId),
    queryFn: () => organizationMembersApi.getMembers(orgId),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    refetchOnWindowFocus: true, // Automatically refresh when switching back to this tab
  });
}

export function useInviteOrganizationMemberMutation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" }) =>
      organizationMembersApi.inviteMember(orgId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMemberQueryKeys.members(orgId),
      });
    },
  });
}

export function useUpdateOrganizationMemberRoleMutation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      organizationMembersApi.updateMemberRole(orgId, userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMemberQueryKeys.members(orgId),
      });
    },
  });
}

export function useRemoveOrganizationMemberMutation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      organizationMembersApi.removeMember(orgId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMemberQueryKeys.members(orgId),
      });
    },
  });
}

export function useResendOrganizationInviteMutation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      organizationMembersApi.resendInvite(orgId, inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMemberQueryKeys.members(orgId),
      });
    },
  });
}

export function useRevokeOrganizationInviteMutation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      organizationMembersApi.revokeInvite(orgId, inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMemberQueryKeys.members(orgId),
      });
    },
  });
}
