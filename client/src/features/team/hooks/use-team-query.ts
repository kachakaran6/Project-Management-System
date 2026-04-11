"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InvitePayload, TeamRole, teamApi } from "@/features/team/api/team.api";

export const teamQueryKeys = {
  all: ["team"] as const,
  members: ["team", "members"] as const,
};

export function useTeamMembersQuery() {
  return useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => teamApi.getMembers(),
    refetchInterval: 30_000,
  });
}

export function useInviteMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InvitePayload) => teamApi.inviteMember(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
    },
  });
}

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: TeamRole }) =>
      teamApi.updateMemberRole(memberId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
    },
  });
}

export function useRemoveMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => teamApi.removeMember(memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
    },
  });
}
