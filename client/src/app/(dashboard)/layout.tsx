"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/features/auth/components/guards";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
