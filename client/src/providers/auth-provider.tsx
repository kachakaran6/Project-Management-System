"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/features/auth/api/auth.api";
import { orgApi } from "@/features/organization/api/org.api";
import { OrganizationMembership } from "@/types/organization.types";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const meResponse = await authApi.me();
        const workspaceResponse = await orgApi.getOrganizations({
          page: 1,
          limit: 100,
        });
        const { user, role } = meResponse.data;

        const membershipsFromProfile = mergeMemberships(
          meResponse.data.organizations,
          [],
        );

        const memberships: OrganizationMembership[] =
          membershipsFromProfile.length > 0
            ? membershipsFromProfile
            : workspaceResponse.data.items.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            slug: workspace.name.toLowerCase().replace(/\s+/g, "-"),
            role:
              (role as OrganizationMembership["role"]) || user.role || "MEMBER",
            }));

        const state = useAuthStore.getState();
        if (state.accessToken) {
          setAuth(
            {
              ...user,
              role:
                (role as OrganizationMembership["role"]) ||
                user.role ||
                undefined,
              organizationId:
                meResponse.data.organizationId || user.organizationId,
            },
            state.accessToken,
            memberships,
          );
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error("Session restoration failed", error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}
