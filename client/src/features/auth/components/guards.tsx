"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "@/lib/next-navigation";
import { useEffect } from "react";

/**
 * AuthGuard: Only allows authenticated users to access children.
 * Redirects to /login if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store current path to return after login
      const searchParams = new URLSearchParams({ callbackUrl: pathname });
      router.push(`/login?${searchParams.toString()}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}

/**
 * GuestGuard: Only allows unauthenticated users to access children (Login/Signup).
 * Redirects to /dashboard if already authenticated.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return null;

  return !isAuthenticated ? <>{children}</> : null;
}

/**
 * RoleGuard: Restricts access based on user role in the ACTIVE organization.
 */
export function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: ("SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER")[];
}) {
  const { getActiveOrg } = useAuthStore();
  const activeOrg = getActiveOrg();

  if (!activeOrg || !allowedRoles.includes(activeOrg.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have the required permissions to view this content.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

