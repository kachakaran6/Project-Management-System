"use client";

import { RoleGuard } from "@/features/auth/components/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Administrative and workspace configuration controls.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure permissions, billing preferences, and notification
              defaults.
            </p>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
