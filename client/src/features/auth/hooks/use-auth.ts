"use client";

import { useAuthStore } from "@/store/auth-store";
import { useCallback } from "react";
import { authApi } from "@/features/auth/api/auth.api";
import { toast } from "sonner";
import {
  Permission,
  hasPermission as checkPermission,
} from "../utils/permissions";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    organizations,
    activeOrgId,
    logout: clearAuthState,
    getActiveOrg,
  } = useAuthStore();

  const activeOrg = getActiveOrg();

  const userRole = activeOrg?.role || user?.role;

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!userRole) return false;
      return checkPermission(userRole as any, permission);
    },
    [userRole],
  );

  const isAdmin =
    userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout API failed, clearing local session anyway.", error);
      toast.warning("Session cleared locally.");
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  return {
    user,
    isAuthenticated,
    isLoading,
    organizations,
    activeOrg,
    activeOrgId,
    logout,
    hasPermission,
    isAdmin,
  };
}
