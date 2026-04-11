import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { OrganizationMembership } from "@/types/organization.types";
import { UserWithRole } from "@/types/user.types";

export type Role = OrganizationMembership["role"];

interface AuthState {
  user: UserWithRole | null;
  accessToken: string | null;
  organizations: OrganizationMembership[];
  activeOrgId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (
    user: UserWithRole,
    accessToken: string,
    organizations?: OrganizationMembership[],
  ) => void;
  setUser: (user: UserWithRole | null) => void;
  setOrganizations: (organizations: OrganizationMembership[]) => void;
  setAccessToken: (token: string) => void;
  setActiveOrgId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  logout: () => void;

  // Computed
  getActiveOrg: () => OrganizationMembership | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      organizations: [],
      activeOrgId: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken, organizations = get().organizations) => {
        const activeOrgId =
          get().activeOrgId ||
          organizations[0]?.id ||
          user.organizationId ||
          null;
        set({
          user,
          accessToken,
          organizations,
          activeOrgId,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => set({ user }),

      setOrganizations: (organizations) => {
        const currentOrgId = get().activeOrgId;
        const nextOrgId = organizations.find((org) => org.id === currentOrgId)
          ? currentOrgId
          : organizations[0]?.id || null;

        set({ organizations, activeOrgId: nextOrgId });
      },

      setAccessToken: (accessToken) => set({ accessToken }),

      setActiveOrgId: (activeOrgId) => set({ activeOrgId }),

      setLoading: (isLoading) => set({ isLoading }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          organizations: [],
          activeOrgId: null,
          isAuthenticated: false,
        }),

      logout: () => {
        get().clearAuth();
        set({ isLoading: false });
      },

      getActiveOrg: () => {
        const { organizations, activeOrgId } = get();
        return organizations.find((org) => org.id === activeOrgId) || null;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        activeOrgId: state.activeOrgId,
        organizations: state.organizations,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
