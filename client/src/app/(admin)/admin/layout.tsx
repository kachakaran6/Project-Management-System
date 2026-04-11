"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthGuard } from "@/features/auth/components/guards";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeOrg, user } = useAuth();
  const role = activeOrg?.role ?? user?.role;
  const allowed = role === "SUPER_ADMIN" || role === "ADMIN";

  return (
    <AuthGuard>
      <AppLayout>
        {allowed ? (
          children
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Admin access required</AlertTitle>
            <AlertDescription>
              You need ADMIN or SUPER_ADMIN role in the active organization to
              access this area.
            </AlertDescription>
          </Alert>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
