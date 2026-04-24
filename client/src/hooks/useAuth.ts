import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { loginUser, logout, oauthLogin, setActiveOrgId } from "@/features/auth/authSlice";
import { useCallback } from "react";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error, organizations, activeOrgId } = useAppSelector(
    (state) => state.auth
  );

  const activeOrg = organizations.find((org) => org.id === activeOrgId) || null;
  const userRole = user?.role || activeOrg?.role;

  const login = (credentials: any) => dispatch(loginUser(credentials));
  const signout = () => dispatch(logout());
  const switchOrg = (id: string) => dispatch(setActiveOrgId(id));

  return {
    user,
    isAuthenticated,
    loading,
    error,
    organizations,
    activeOrg,
    activeOrgId,
    userRole,
    login,
    logout: signout,
    switchOrg,
    isAdmin: userRole === "ADMIN" || userRole === "SUPER_ADMIN",
    isSuperAdmin: userRole === "SUPER_ADMIN",
  };
};
