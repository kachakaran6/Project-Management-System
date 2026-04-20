"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/next-navigation";

import { AppLayout } from "@/components/layout/app-layout";
import { AuthGuard } from "@/features/auth/components/guards";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { TaskSidePanel } from "@/features/tasks/components/panel/task-side-panel";
import { useActivityTracker } from "@/hooks/use-activity-tracker";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useActivityTracker();
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [isSuperAdmin, router]);

  return (
    <AuthGuard>
      <AppLayout>
        {isSuperAdmin ? null : children}
        <TaskSidePanel />
      </AppLayout>
    </AuthGuard>
  );
}

