"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { logout as logoutAction } from "@/features/auth/authSlice";
import {
  Permission,
  hasPermission as checkPermission,
} from "../utils/permissions";

export function useAuth() {
  const dispatch = useAppDispatch();
  const {
    user,
    isAuthenticated,
    loading: isLoading,
    organizations,
    activeOrgId,
  } = useAppSelector((state) => state.auth);

  const activeOrg = organizations.find((org) => org.id === activeOrgId) || null;
  const platformRole = user?.role;
  const orgRole = activeOrg?.role;

  // Platform SUPER_ADMIN always overrides any organizational context role
  const userRole = platformRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : (orgRole || platformRole);

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!userRole) return false;
      return checkPermission(userRole as any, permission);
    },
    [userRole],
  );

  const isAdmin =
    userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAction());
    } catch (error) {
      console.error("Logout API failed, clearing local session anyway.", error);
      toast.warning("Session cleared locally.");
    }
  }, [dispatch]);

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
    isSuperAdmin,
    userRole,
  };
}
