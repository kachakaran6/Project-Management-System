"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/auth.api";
import { orgApi } from "@/features/organization/api/org.api";
import { LoginInput, SignupInput } from "@/types/auth.types";
import { OrganizationMembership } from "@/types/organization.types";
import { useAuthStore } from "@/store/auth-store";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
  organizations: ["auth", "organizations"] as const,
};

function deriveMemberships(
  workspaces: { id: string; name: string; slug?: string }[],
  defaultRole: OrganizationMembership["role"] = "MEMBER",
): OrganizationMembership[] {
  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: defaultRole,
  }));
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  return useMutation({
    mutationFn: (payload: LoginInput) => authApi.login(payload),
    onSuccess: async (result) => {
      const { accessToken, user } = result.data;

      // Ensure subsequent API calls in this flow carry bearer token.
      setAccessToken(accessToken);

      const meResult = await authApi.me();
      const workspaceResult = await orgApi.getOrganizations({
        page: 1,
        limit: 100,
      });

      const memberships = deriveMemberships(
        workspaceResult.data.items.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.name.toLowerCase().replace(/\s+/g, "-"),
        })),
        (meResult.data.role as OrganizationMembership["role"]) ||
          user.role ||
          "MEMBER",
      );

      setAuth(
        {
          ...meResult.data.user,
          role:
            ((meResult.data.role as string) ||
             user.role ||
             undefined) as import("@/types/user.types").Role | undefined,
          organizationId: meResult.data.organizationId || user.organizationId,
        },
        accessToken,
        memberships,
      );

      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
      await queryClient.invalidateQueries({
        queryKey: authQueryKeys.organizations,
      });
    },
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: (payload: SignupInput) =>
      authApi.register({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        password: payload.password,
      }),
  });
}

export function useUserQuery(enabled = true) {
  const setUser = useAuthStore((state) => state.setUser);
  const query = useQuery({
    queryKey: authQueryKeys.me,
    queryFn: () => authApi.me(),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data?.data.user) {
      setUser(query.data.data.user);
    }
  }, [query.data, setUser]);

  return query;
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      clearAuth();
      await queryClient.clear();
    },
  });
}
