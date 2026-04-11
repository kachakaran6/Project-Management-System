"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/hooks/use-auth-queries";
import { orgApi } from "@/features/organization/api/org.api";
import { useAuthStore } from "@/store/auth-store";

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
  const setActiveOrgId = useAuthStore((state) => state.setActiveOrgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => organizationId,
    onSuccess: async (organizationId) => {
      setActiveOrgId(organizationId);
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
