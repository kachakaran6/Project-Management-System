import { useQuery } from "@tanstack/react-query";
import { organizationMembersApi } from "@/features/organization/api/organization-members.api";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";

export function useMemberSearch(query: string) {
  const { activeOrg } = useAuth();
  const debouncedQuery = useDebounce(query, 300);

  const orgId = typeof activeOrg === 'string' ? activeOrg : activeOrg?.id;

  return useQuery({
    queryKey: ["members", "search", orgId, debouncedQuery],
    queryFn: async () => {
      if (!orgId) return [];
      const response = await organizationMembersApi.searchMembers(orgId, debouncedQuery);
      return response.data;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
