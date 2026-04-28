"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/hooks/use-auth-queries";
import { orgApi } from "@/features/organization/api/org.api";
import { useAuthStore } from "@/store/auth-store";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setActiveOrgId as setActiveOrgIdRedux } from "@/features/auth/authSlice";


export const orgQueryKeys = {
  all: ["organizations"] as const,
  list: ["organizations", "list"] as const,
};

export function useOrganizationsQuery() {
  return useQuery({
    queryKey: orgQueryKeys.list,
    queryFn: () => orgApi.getOrganizations({ page: 1, limit: 100 }),
  });
}

export function useSwitchOrganizationMutation() {
  const setActiveOrgIdZustand = useAuthStore((state) => state.setActiveOrgId);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => organizationId,
    onSuccess: async (organizationId) => {
      // Update both stores for compatibility
      setActiveOrgIdZustand(organizationId);
      dispatch(setActiveOrgIdRedux(organizationId));
      
      // Also ensure localStorage is updated immediately for axios interceptor
      localStorage.setItem("activeOrgId", organizationId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authQueryKeys.me }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["organizations"] }),
        queryClient.invalidateQueries({ queryKey: ["team"] }),
      ]);
    },
  });
}

