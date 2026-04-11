"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/features/auth/api/auth.api";
import { orgApi } from "@/features/organization/api/org.api";
import { OrganizationMembership } from "@/types/organization.types";

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

        const memberships: OrganizationMembership[] =
          workspaceResponse.data.items.map((workspace) => ({
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
                ((role as string) ||
                 user.role ||
                 undefined) as import("@/types/user.types").Role | undefined,
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
