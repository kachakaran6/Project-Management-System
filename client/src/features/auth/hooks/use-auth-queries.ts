"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/features/auth/api/auth.api";
import { orgApi } from "@/features/organization/api/org.api";
import { LoginInput, SignupInput } from "@/types/auth.types";
import { OrganizationMembership } from "@/types/organization.types";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setActiveOrgId as setActiveOrgIdRedux, setToken, fetchMe } from "@/features/auth/authSlice";
import { store } from "@/app/store";

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

function mergeMemberships(
  primary: OrganizationMembership[] | undefined,
  fallback: OrganizationMembership[],
): OrganizationMembership[] {
  if (primary && primary.length > 0) {
    return primary.map((org) => ({
      ...org,
      slug: org.slug ?? org.name.toLowerCase().replace(/\s+/g, "-"),
      role: org.role ?? fallback[0]?.role ?? "MEMBER",
    }));
  }

  return fallback;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: (payload: LoginInput) => authApi.login(payload),
    onSuccess: async (result) => {
      const { accessToken } = result.data;

      // Ensure subsequent API calls in this flow carry bearer token.
      dispatch(setToken(accessToken));

      dispatch(fetchMe());

      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
      await queryClient.invalidateQueries({
        queryKey: authQueryKeys.organizations,
      });
    },
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: (payload: SignupInput & { role?: string }) =>
      authApi.register(payload),
  });
}

export function useSendOtpMutation() {
  return useMutation({
    mutationFn: (email: string) => authApi.sendOtp(email),
  });
}

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: (payload: { email: string; otp: string }) =>
      authApi.verifyOtp(payload.email, payload.otp),
  });
}

export function useUserQuery(enabled = true) {
  const dispatch = useAppDispatch();
  const query = useQuery({
    queryKey: authQueryKeys.me,
    queryFn: () => authApi.me(),
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data?.data) {
      const { organizations, organizationId } = query.data.data;

      if (organizations) {
        const storeState = store.getState();
        const currentActiveId = storeState.auth.activeOrgId;
        const isValidActiveId = organizations.some(o => o.id === currentActiveId);

        if (!currentActiveId || !isValidActiveId) {
          const nextOrgId = organizationId || (organizations.length > 0 ? organizations[0].id : null);
          if (nextOrgId) {
            dispatch(setActiveOrgIdRedux(nextOrgId));
            localStorage.setItem("activeOrgId", nextOrgId);
          }
        }
      }
    }
  }, [query.data, dispatch]);

  return query;
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      await queryClient.clear();
    },
  });
}
