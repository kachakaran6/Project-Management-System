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
    let retryCount = 0;
    const MAX_RETRIES = 2;

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
          // If no token exists, we just stop loading (user is guest/not logged in)
          // clearAuth() is not strictly needed if state is already empty, but safe
          clearAuth();
        }
      } catch (error: any) {
        console.error("Session restoration attempt failed", error);
        
        const status = error.response?.status;
        const isNetworkError = !error.response;

        if (status === 401) {
          // Definitely unauthorized
          retryCount = MAX_RETRIES; // Stop retrying
          clearAuth();
        } else if (isNetworkError && retryCount < MAX_RETRIES) {
          // Slow server or network issue - retry!
          retryCount++;
          console.log(`[AUTH] Retrying session restoration (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(initAuth, 2000 * retryCount); // Exponential-ish backoff
          return;
        } else {
          // Other error (500, etc.) - don't logout, just log it.
          // The user might still have a valid token but the server is down.
          console.warn("[AUTH] Non-fatal error during initAuth. Retention of session state.");
        }
      } finally {
        if (retryCount >= MAX_RETRIES) {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, [setAuth, clearAuth, setLoading]);

  // AUTO-REFRESH Logic (Step 9)
  useEffect(() => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    // Decode JWT to get 'exp'
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const expiryTime = payload.exp * 1000; // ms
      // Refresh 2 minutes before it expires
      const refreshBuffer = 2 * 60 * 1000; 
      const delay = expiryTime - Date.now() - refreshBuffer;

      if (delay > 0) {
        const timer = setTimeout(async () => {
          console.log("[AUTH] Proactive token refresh starting...");
          const { api } = await import("@/lib/api/axios-instance");
          await api.post("/auth/refresh").catch(() => {});
        }, delay);

        return () => clearTimeout(timer);
      } else {
        // Already close to expiry or expired, trigger refresh now
        import("@/lib/api/axios-instance").then(({ api }) => {
          api.post("/auth/refresh").catch(() => {});
        });
      }
    } catch (e) {
      console.warn("[AUTH] Failed to schedule auto-refresh", e);
    }
  }, [useAuthStore().accessToken]);

  return <>{children}</>;
}
