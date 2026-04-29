import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { loginUser, logout, oauthLogin, setActiveOrgId, fetchMe } from "@/features/auth/authSlice";
import { useQueryClient } from "@tanstack/react-query";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading, error, organizations, activeOrgId } = useAppSelector(
    (state) => state.auth
  );

  const activeOrg = organizations.find((org) => org.id === activeOrgId) || null;
  const userRole = user?.role || activeOrg?.role;

  const login = async (credentials: any) => {
    const res = await dispatch(loginUser(credentials));
    if (loginUser.fulfilled.match(res)) {
      queryClient.clear();
      await dispatch(fetchMe());
    }
    return res;
  };
  
  const signout = () => {
    queryClient.clear();
    dispatch(logout());
  };
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
