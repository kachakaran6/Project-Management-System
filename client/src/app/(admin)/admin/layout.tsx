"use client";

import { useEffect } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/features/auth/components/guards";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRouter } from "@/lib/next-navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeOrg, user } = useAuth();
  const role =
    user?.role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : activeOrg?.role ?? user?.role;
  const allowed = role === "SUPER_ADMIN" || role === "ADMIN";

  useEffect(() => {
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, router]);

  if (!allowed) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthGuard>
  );
}
